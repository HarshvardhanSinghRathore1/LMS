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
  onCitationClick?: (citation: Citation) => void;
}

export const AITutorDrawer: React.FC<AITutorDrawerProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onCitationClick,
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
          content: `Hello! I am your AI Study Assistant for **${courseTitle}**. Ask me any question about the course material, video lectures, PDF notes, or lesson concepts!`,
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
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#0b090a] border-l border-neutral-800 shadow-2xl z-50 flex flex-col transition-all">
      {/* Drawer Header */}
      <div className="p-4 bg-[#161a1d] border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#660708] to-[#a4161a] flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Course AI Tutor</h3>
              <Badge variant="danger" size="sm">RAG ENABLED</Badge>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono truncate max-w-[260px]">{courseTitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
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
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-neutral-500 font-mono">
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
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none shadow-lg'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Citations section */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-neutral-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[var(--strawberry-red)]" />
                    Grounded Citations ({msg.citations.length})
                  </div>
                  <div className="space-y-1.5">
                    {msg.citations.map((cite, idx) => {
                      const isVideo = cite.sourceType === 'video_transcript' || cite.title?.startsWith('📹');
                      const isPdf = cite.sourceType === 'course_pdf' || cite.title?.startsWith('📄');
                      const score = cite.similarityScore ?? cite.similarity;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (onCitationClick) onCitationClick(cite);
                          }}
                          className="w-full text-left p-2 rounded-lg bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 flex items-center justify-between text-[11px] text-neutral-300 transition-all group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs shrink-0">
                              {isVideo ? '📹' : isPdf ? '📄' : '📘'}
                            </span>
                            <div className="min-w-0">
                              <span className="font-semibold text-white truncate block max-w-[220px]">
                                {cite.title}
                              </span>
                              {cite.sourceBadge && (
                                <span className="text-[10px] text-neutral-400 block">
                                  {cite.sourceBadge}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {score !== undefined && (
                              <span className="text-emerald-400 font-bold text-[10px]">
                                {(score * 100).toFixed(0)}%
                              </span>
                            )}
                            <ChevronRight className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      );
                    })}
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
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                if (lastUserMsg) {
                  setInputMessage(lastUserMsg.content);
                  setError(null);
                }
              }}
              className="text-[10px] px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200 font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions Bar */}
      <div className="px-3 py-2 bg-[#12161a] border-t border-neutral-800 flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-thin">
        <span className="text-neutral-500 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Quick:
        </span>
        <button
          onClick={() => {
            setInputMessage('Explain this concept step by step.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
        >
          Explain this
        </button>
        <button
          onClick={() => {
            setInputMessage('Summarize what I learned in this lesson.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
        >
          Summarize this lesson
        </button>
        <button
          onClick={() => {
            setInputMessage('Give me an example with code or diagrams.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
        >
          Give me an example
        </button>
        <button
          onClick={() => {
            setInputMessage('Quiz me on this topic.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
        >
          Quiz me
        </button>
        <button
          onClick={() => {
            setInputMessage("I don't understand this topic, explain it simply.");
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
        >
          Explain simply
        </button>
        <button
          onClick={() => {
            setInputMessage('Give me 5 practice questions about this topic.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
        >
          Practice questions
        </button>
      </div>

      {/* Input Footer */}
      <form onSubmit={handleSend} className="p-3 bg-[#161a1d] border-t border-neutral-800 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Ask anything about your studies or ${courseTitle}...`}
          disabled={isLoading}
          className="flex-1 bg-black/60 border border-neutral-700 focus:border-amber-500 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
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
