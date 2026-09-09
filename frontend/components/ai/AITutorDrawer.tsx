'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sendTutorMessage, Citation } from '../../lib/ai';
import { Bot, Send, X, BookOpen, AlertCircle, Sparkles, FileText, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
  provider?: string;
}

interface AITutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
}

export const AITutorDrawer: React.FC<AITutorDrawerProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I am your AI Study Assistant for **${courseTitle}**. Ask me any question about the course material, key concepts, or lesson contents!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, courseTitle, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await sendTutorMessage({
        courseId,
        conversationId,
        message: userText,
      });

      setConversationId(response.conversationId);

      const botMsg: ChatMessage = {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        citations: response.citations,
        provider: response.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Failed to send tutor message:', err);
      setError(err.response?.data?.error?.message || 'Failed to generate response from AI Tutor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#0b090a] border-l border-silver/20 shadow-2xl z-50 flex flex-col transition-all">
      {/* Drawer Header */}
      <div className="p-4 bg-[#161a1d] border-b border-silver/15 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#660708] to-[#a4161a] flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Course AI Tutor</h3>
              <Badge variant="danger" size="sm">RAG ENABLED</Badge>
            </div>
            <p className="text-[11px] text-silver font-mono truncate max-w-[260px]">{courseTitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-neutral-800 text-silver hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-silver/60 font-mono">
              <span>{msg.role === 'user' ? 'You' : 'AI Tutor'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
              {msg.provider && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold">{msg.provider}</span>
                </>
              )}
            </div>

            <div
              className={`p-3.5 rounded-xl max-w-[90%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--mahogany-red)] text-white rounded-br-none shadow-md'
                  : 'bg-carbon-black border border-silver/20 text-white-smoke rounded-bl-none shadow-lg'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Citations section */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-silver/15 space-y-1.5">
                  <div className="text-[10px] font-bold text-silver uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[var(--strawberry-red)]" />
                    Grounded Source Citations ({msg.citations.length})
                  </div>
                  <div className="space-y-1">
                    {msg.citations.map((cite, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 rounded bg-onyx border border-silver/10 flex items-center justify-between text-[10px] font-mono text-silver"
                      >
                        <span className="truncate max-w-[220px] font-semibold text-white">{cite.title}</span>
                        {cite.similarityScore !== undefined && (
                          <span className="text-emerald-400 font-bold shrink-0">
                            {(cite.similarityScore * 100).toFixed(0)}% match
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-carbon-black rounded-lg border border-silver/15 text-silver text-xs font-mono">
            <Sparkles className="w-4 h-4 text-strawberry-red animate-pulse" />
            <span>Retrieving course context & generating answer...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-dark-garnet/40 border border-strawberry-red/50 rounded-lg text-xs text-strawberry-red flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <form onSubmit={handleSend} className="p-3 bg-[#161a1d] border-t border-silver/15 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Ask about ${courseTitle}...`}
          disabled={isLoading}
          className="flex-1 bg-onyx border border-silver/20 focus:border-[var(--strawberry-red)] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-silver/50 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="p-2.5 bg-gradient-to-r from-[#660708] to-[#e5383b] hover:brightness-110 disabled:opacity-40 text-white rounded-lg transition-all shadow-md flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
