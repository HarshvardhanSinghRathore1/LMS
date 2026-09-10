'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ragApi,
  RAGCitation,
  ConversationSummary,
  ConversationMessage,
} from '../../lib/rag';
import { apiClient } from '../../lib/api';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  FileText,
  ShieldAlert,
  ChevronRight,
  Database,
  Brain,
  Zap,
  CheckCircle2,
  ExternalLink,
  MessageSquarePlus,
  RefreshCw,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface CourseOption {
  id: string;
  title: string;
  status: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: RAGCitation[];
  createdAt: string;
  provider?: string;
  model?: string;
  contextUsed?: {
    pgvectorChunksCount: number;
    learnerFactsCount: number;
    graphitiAvailable: boolean;
  };
}

export const ContextualAIAssistant: React.FC = () => {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeCitation, setActiveCitation] = useState<RAGCitation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: Fetch enrolled courses & conversation history
  useEffect(() => {
    const initData = async () => {
      setIsInitializing(true);
      try {
        // Fetch courses
        const coursesRes = await apiClient.get('/courses');
        const courseList = coursesRes.data.data?.courses || coursesRes.data.data || [];
        setCourses(courseList);
        if (courseList.length > 0) {
          setSelectedCourseId(courseList[0].id);
        }

        // Fetch conversations
        const convos = await ragApi.getConversations();
        setConversations(convos);

        if (convos.length > 0) {
          // Load most recent conversation
          const latestConvo = convos[0];
          setActiveConversationId(latestConvo.id);
          if (latestConvo.course_id) {
            setSelectedCourseId(latestConvo.course_id);
          }
          const { messages: historyMsgs } = await ragApi.getConversation(latestConvo.id);
          setMessages(
            historyMsgs.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              citations: m.citations,
              createdAt: m.created_at,
            }))
          );
        } else {
          // Default initial welcome message
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: `Welcome to the **Capacity Connect Advanced RAG Learning Assistant**!\n\nI fuse **pgvector 384d semantic retrieval**, your **authoritative persistent learner context**, and **temporal learning history** to provide grounded, citation-backed answers. Select a course above or ask any question!`,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to initialize AI Assistant:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initData();
  }, []);

  // 2. Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 3. Switch conversation
  const handleSelectConversation = async (convoId: string) => {
    try {
      setIsLoading(true);
      const { conversation, messages: historyMsgs } = await ragApi.getConversation(convoId);
      setActiveConversationId(conversation.id);
      if (conversation.course_id) {
        setSelectedCourseId(conversation.course_id);
      }
      setMessages(
        historyMsgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          createdAt: m.created_at,
        }))
      );
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Start New Conversation Thread
  const handleNewConversation = () => {
    setActiveConversationId(undefined);
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        content: `Started a fresh conversation session. Ask anything about your enrolled course material!`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  // 5. Send Chat Message
  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const query = customText || inputMessage;
    if (!query.trim() || isLoading) return;

    const userMessageText = query.trim();
    setInputMessage('');

    // Append user message immediately
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await ragApi.chat({
        message: userMessageText,
        courseId: selectedCourseId || undefined,
        conversationId: activeConversationId,
        topK: 4,
      });

      setActiveConversationId(response.conversationId);

      const assistantMsg: ChatMessage = {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        citations: response.citations,
        createdAt: new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        contextUsed: response.contextUsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh conversations list to update titles/timestamps
      const updatedConvos = await ragApi.getConversations();
      setConversations(updatedConvos);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Error: ${err?.response?.data?.message || 'Failed to generate response. Please ensure you are enrolled in this course.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[760px] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Enterprise Grounded AI Tutor
              <Badge variant="info" size="sm">
                Stage 12 RAG
              </Badge>
            </h2>
            <p className="text-xs text-slate-400">pgvector 384d Semantic Search + Persistent Temporal Learner Context</p>
          </div>
        </div>

        {/* Course & Thread Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="" className="bg-slate-900">All General Knowledge</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="text-xs flex items-center gap-1.5 py-1.5 h-8 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>

      {/* 2. Chat Area & Context Transparency Bar */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-950/60">
        {/* Anti-Hallucination & Prompt Injection Defense Banner */}
        <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/50 flex items-center justify-between text-[11px] text-indigo-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              <strong>Grounded Integrity:</strong> Answers strictly reference pgvector course chunks. Prompt-injection defense active.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-400 font-mono text-[10px]">
            <span>BAAI/bge-small-en-v1.5</span>
            <span>•</span>
            <span>384-Dim HNSW</span>
          </div>
        </div>

        {/* Message History */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-2.5 max-w-[85%]">
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none shadow-md'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                {/* Content with whitespace formatting */}
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Context Streams Used (if assistant) */}
                {msg.contextUsed && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Database className="w-3 h-3 text-indigo-400" />
                      {msg.contextUsed.pgvectorChunksCount} pgvector chunks
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Brain className="w-3 h-3 text-purple-400" />
                      {msg.contextUsed.learnerFactsCount} learner facts
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Zap className={`w-3 h-3 ${msg.contextUsed.graphitiAvailable ? 'text-emerald-400' : 'text-slate-500'}`} />
                      Graphiti {msg.contextUsed.graphitiAvailable ? 'Synced' : 'Fallback'}
                    </span>
                  </div>
                )}

                {/* Grounded Citation Chips */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Retrieved Course Citations:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cite, idx) => (
                        <button
                          key={cite.chunkId || idx}
                          onClick={() => setActiveCitation(cite)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/60 hover:border-indigo-500 text-indigo-200 text-[11px] transition duration-150"
                        >
                          <BookOpen className="w-3 h-3 text-indigo-400" />
                          <span className="truncate max-w-[180px] font-medium">{cite.title}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/80 text-indigo-300 font-mono">
                            {(cite.similarity * 100).toFixed(0)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <span className="text-[10px] text-slate-500 mt-1 px-1">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 max-w-sm animate-pulse text-xs text-indigo-300">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Fusing pgvector embeddings & learner context...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Starter Suggestions Bar */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-thin">
        <span className="text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" /> Quick Actions:
        </span>
        <button
          onClick={() => handleSend(undefined, 'Explain this concept step by step.')}
          className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition"
        >
          Explain this
        </button>
        <button
          onClick={() => handleSend(undefined, 'Summarize what I learned in this lesson.')}
          className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition"
        >
          Summarize this lesson
        </button>
        <button
          onClick={() => handleSend(undefined, 'Give me a clear, practical example with code or diagrams.')}
          className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition"
        >
          Give me an example
        </button>
        <button
          onClick={() => handleSend(undefined, 'Quiz me on the key concepts of this topic.')}
          className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition"
        >
          Quiz me
        </button>
        <button
          onClick={() => handleSend(undefined, "I don't understand this topic, explain it simply like I'm a beginner.")}
          className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition"
        >
          Explain simply
        </button>
        <button
          onClick={() => handleSend(undefined, 'Give me 5 practice questions about this topic with solutions.')}
          className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition"
        >
          Give me practice questions
        </button>
      </div>

      {/* 4. Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask anything about your studies or course material..."
          disabled={isLoading}
          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
        />
        <Button
          type="submit"
          disabled={isLoading || !inputMessage.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-semibold">Send</span>
        </Button>
      </form>

      {/* 5. Citation Preview Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                  Authoritative Grounded Source
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">{activeCitation.title}</h4>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                <span><strong>Course:</strong> {activeCitation.courseTitle || 'Enrolled Course'}</span>
                <span className="text-indigo-400 font-mono">Similarity: {(activeCitation.similarity * 100).toFixed(1)}%</span>
              </div>
              {activeCitation.moduleTitle && (
                <div className="text-[11px] text-slate-400">
                  <strong>Module:</strong> {activeCitation.moduleTitle}
                </div>
              )}
              {activeCitation.lessonTitle && (
                <div className="text-[11px] text-slate-400">
                  <strong>Lesson:</strong> {activeCitation.lessonTitle}
                </div>
              )}
              <div className="pt-2 text-slate-200 leading-relaxed italic">
                "{activeCitation.contentSnippet || 'Full verified course lesson chunk.'}"
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveCitation(null)}
                className="text-xs"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
