'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  sendTutorMessage,
  fetchTutorConversations,
  fetchTutorConversationMessages,
  deleteTutorConversation,
  TutorConversation,
  Citation,
  ChatRole,
} from '../../lib/ai';
import { fetchCoursesApi, Course } from '../../lib/courses';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  FileText,
  Video,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Code2,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  Layers,
  GraduationCap,
  Info,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Citation[];
  createdAt: string;
}

const QUICK_ACTIONS = [
  { icon: Lightbulb, label: 'Explain recursion simply', prompt: 'Explain recursion in simple words with a real-life analogy.' },
  { icon: Code2, label: 'Java OOP polymorphism example', prompt: 'Give me a clear, clean Java code example of polymorphism and inheritance.' },
  { icon: BookOpen, label: 'What is normalization in DBMS?', prompt: 'Explain 1NF, 2NF, and 3NF normalization in DBMS step-by-step.' },
  { icon: HelpCircle, label: 'Quiz me on Binary Search', prompt: 'Quiz me with 3 conceptual questions about the binary search algorithm.' },
  { icon: Sparkles, label: 'Give 5 practice questions', prompt: 'Give me 5 practice multiple-choice questions on this topic with answers and explanations.' },
];

export const AITutorChatbot: React.FC<{ initialCourseId?: string; initialLessonId?: string }> = ({
  initialCourseId,
  initialLessonId,
}) => {
  const { user } = useAuth();

  // Conversations State
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Courses & Study Context
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonId || '');
  const [studyMode, setStudyMode] = useState<'GENERAL' | 'COURSE'>(initialCourseId ? 'COURSE' : 'GENERAL');

  // Input & Generation State
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Initial Load: Fetch conversations and courses
  useEffect(() => {
    async function initData() {
      try {
        const [convos, courseRes] = await Promise.all([
          fetchTutorConversations(),
          fetchCoursesApi({ limit: 100 }),
        ]);
        setConversations(convos);
        setCourses(courseRes.courses);

        if (convos.length > 0) {
          const first = convos[0];
          setActiveConversationId(first.id);
          const history = await fetchTutorConversationMessages(first.id);
          setMessages(
            history.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              citations: m.citations,
              createdAt: m.created_at,
            }))
          );
        } else {
          // Initialize fresh greeting
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: `👋 Hi **${user?.name || 'there'}**! I'm your **AI Study Tutor**.\n\nAsk me anything about your studies! I can:\n* 💡 Explain difficult computer science concepts step-by-step\n* 💻 Provide clean code examples in Java, Python, SQL, C++, etc.\n* 📚 Answer course-specific questions using verified lesson materials, transcripts & notes\n* 🎯 Quiz you to prepare for your assessments\n\nWhat would you like to learn today?`,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load initial tutor data:', err);
      } finally {
        setLoadingConversations(false);
      }
    }

    initData();
  }, [user]);

  // 2. Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // 3. New Chat Handler
  const handleStartNewChat = () => {
    setActiveConversationId(undefined);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `✨ **New Conversation Started**\n\nAsk me any study question, or choose one of the quick suggestions below!`,
        createdAt: new Date().toISOString(),
      },
    ]);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // 4. Switch Conversation
  const handleSelectConversation = async (convoId: string) => {
    if (convoId === activeConversationId) return;
    try {
      setIsSending(true);
      setActiveConversationId(convoId);
      const data = await fetchTutorConversationMessages(convoId);
      if (data.conversation.course_id) {
        setSelectedCourseId(data.conversation.course_id);
        setStudyMode('COURSE');
      }
      setMessages(
        data.messages.map((m) => ({
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
      setIsSending(false);
    }
  };

  // 5. Delete Conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convoId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat history?')) return;
    try {
      await deleteTutorConversation(convoId);
      setConversations((prev) => prev.filter((c) => c.id !== convoId));
      if (activeConversationId === convoId) {
        handleStartNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // 6. Send Message Handler
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputMessage).trim();
    if (!text || isSending) return;

    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await sendTutorMessage({
        message: text,
        conversationId: activeConversationId,
        courseId: studyMode === 'COURSE' ? selectedCourseId || undefined : undefined,
        lessonId: selectedLessonId || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: response.messageId || `asst-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        citations: response.citations,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Update active conversation ID if newly created
      if (!activeConversationId && response.conversationId) {
        setActiveConversationId(response.conversationId);
        // Refresh conversations list
        const updatedConvos = await fetchTutorConversations();
        setConversations(updatedConvos);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Unable to get response**\n\n${
          err.response?.data?.error?.message ||
          'The AI Tutor is temporarily unavailable. Please try again in a moment.'
        }`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // 7. Copy message helper
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 8. Keydown Enter/Shift+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to render Markdown-formatted text with code blocks
  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineBreak = part.indexOf('\n');
        const lang = firstLineBreak > 3 ? part.slice(3, firstLineBreak).trim() : 'code';
        const code = firstLineBreak > 0 ? part.slice(firstLineBreak + 1, -3) : part.slice(3, -3);

        return (
          <div key={index} className="my-3 rounded-lg overflow-hidden border border-silver/20 bg-[#0d1117] font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-silver/10 text-[11px] text-silver">
              <span className="uppercase font-bold tracking-wider text-strawberry-red">{lang || 'CODE'}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-white flex items-center gap-1 transition-colors"
                title="Copy code"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-emerald-300 leading-relaxed font-mono whitespace-pre">
              {code}
            </pre>
          </div>
        );
      }

      // Paragraph / lists / bold text
      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed space-y-2">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[750px] max-h-[85vh] bg-onyx border border-silver/20 rounded-2xl overflow-hidden shadow-2xl">
      {/* 1. LEFT SIDEBAR: CONVERSATIONS & STUDY MODE */}
      <div className="w-full lg:w-72 bg-carbon-black border-b lg:border-b-0 lg:border-r border-silver/15 flex flex-col">
        {/* New Chat Button */}
        <div className="p-3 border-b border-silver/15 space-y-2.5">
          <button
            onClick={handleStartNewChat}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Study Mode Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-silver flex items-center gap-1">
              <Layers className="w-3 h-3 text-strawberry-red" />
              Study Context
            </label>
            <div className="grid grid-cols-2 gap-1 bg-onyx p-1 rounded-lg border border-silver/15">
              <button
                onClick={() => setStudyMode('GENERAL')}
                className={`py-1 text-[11px] font-semibold rounded transition-all ${
                  studyMode === 'GENERAL'
                    ? 'bg-strawberry-red text-white shadow'
                    : 'text-silver hover:text-white'
                }`}
              >
                🌐 General
              </button>
              <button
                onClick={() => setStudyMode('COURSE')}
                className={`py-1 text-[11px] font-semibold rounded transition-all ${
                  studyMode === 'COURSE'
                    ? 'bg-strawberry-red text-white shadow'
                    : 'text-silver hover:text-white'
                }`}
              >
                📚 Course RAG
              </button>
            </div>

            {studyMode === 'COURSE' && courses.length > 0 && (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-onyx border border-silver/20 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-strawberry-red font-medium"
              >
                <option value="">-- All Enrolled Courses --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Recent Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold text-silver/60 uppercase tracking-wider">
            Recent Conversations
          </div>

          {loadingConversations ? (
            <div className="p-4 text-center text-xs text-silver/60 font-mono">Loading history...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-silver/50 font-mono">No previous chats</div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                    isActive
                      ? 'bg-onyx border border-strawberry-red/50 text-white font-semibold'
                      : 'hover:bg-onyx/50 text-silver hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-2">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-strawberry-red' : 'text-silver/50'}`} />
                    <span className="truncate">{c.title || 'Study Discussion'}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* AI Provider Footer */}
        <div className="p-3 border-t border-silver/15 bg-onyx/40 text-[10px] font-mono text-silver/60 flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Gemini 1.5 Flash
          </span>
          <span>pgvector 384d</span>
        </div>
      </div>

      {/* 2. RIGHT AREA: ACTIVE CHAT FEED */}
      <div className="flex-1 flex flex-col bg-onyx">
        {/* Chat Header */}
        <div className="p-3.5 border-b border-silver/15 flex items-center justify-between bg-carbon-black/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#660708] to-[#e5383b] text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">AI Study Tutor</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-strawberry-red/20 text-strawberry-red border border-strawberry-red/30">
                  {studyMode === 'COURSE' ? 'Course RAG Grounded' : 'General CS Assistant'}
                </span>
              </div>
              <p className="text-[11px] text-silver">
                {studyMode === 'COURSE' && selectedCourseId
                  ? `Grounded in course materials, transcripts & notes`
                  : `Ask any technical, algorithmic, or conceptual question`}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#660708] to-[#e5383b] flex items-center justify-center text-white flex-shrink-0 shadow-md mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs space-y-2.5 shadow-md ${
                    isUser
                      ? 'bg-gradient-to-r from-[#660708] to-[#a4161a] text-white rounded-tr-none font-medium'
                      : 'bg-carbon-black border border-silver/15 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {/* Content */}
                  <div className="text-xs">{renderFormattedContent(msg.content)}</div>

                  {/* Citations / Source Badges (for Assistant Messages) */}
                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-silver/10 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-silver flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Verified Course Citations ({msg.citations.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveCitation(c)}
                            className="px-2 py-1 rounded bg-onyx border border-silver/20 hover:border-emerald-500 text-[10px] font-mono text-emerald-300 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <span>{c.sourceBadge || '📘 Lesson Resource'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Action Toolbar */}
                  {!isUser && msg.id !== 'welcome' && (
                    <div className="flex items-center justify-between pt-1 text-[10px] text-silver/60">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="hover:text-white flex items-center gap-1 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking / Generation Indicator */}
          {isSending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#660708] to-[#e5383b] flex items-center justify-center text-white flex-shrink-0 shadow-md animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-carbon-black border border-silver/15 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-silver">
                <Sparkles className="w-3.5 h-3.5 text-strawberry-red animate-spin" />
                <span>AI Tutor is thinking & retrieving verified knowledge...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Action Suggestion Chips (Shown on fresh chat) */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <div className="text-[10px] font-bold text-silver uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-strawberry-red" />
              Suggested Study Topics
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(action.prompt)}
                    className="px-3 py-1.5 bg-carbon-black hover:bg-neutral-800 border border-silver/20 hover:border-strawberry-red text-silver hover:text-white text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Icon className="w-3 h-3 text-strawberry-red" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3.5 border-t border-silver/15 bg-carbon-black/70">
          <div className="flex items-end gap-2 bg-onyx border border-silver/20 rounded-xl p-2 focus-within:border-strawberry-red transition-all">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your studies... (Shift+Enter for new line)"
              className="flex-1 bg-transparent text-xs text-white placeholder:text-silver/50 focus:outline-none resize-none px-2 py-1 leading-relaxed"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isSending}
              className="p-2.5 bg-gradient-to-r from-[#660708] to-[#e5383b] hover:brightness-110 disabled:opacity-40 text-white rounded-lg transition-all shadow-md flex items-center justify-center flex-shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-silver/60">
            <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
            <span className="font-mono">Powered by Google Gemini RAG</span>
          </div>
        </div>
      </div>

      {/* Citation Preview Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-onyx border border-silver/20 rounded-xl max-w-xl w-full p-5 space-y-3 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-silver/15 pb-2.5">
              <h4 className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {activeCitation.title || 'Verified Source Reference'}
              </h4>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-silver hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-silver">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-bold text-white">Source Type:</span>
                <span className="px-2 py-0.5 rounded bg-carbon-black border border-silver/15 text-emerald-300 font-mono">
                  {activeCitation.sourceBadge || activeCitation.sourceType || 'Course Resource'}
                </span>
                {activeCitation.similarityScore && (
                  <span className="text-[10px] text-silver/60">
                    Similarity: {Math.round(activeCitation.similarityScore * 100)}%
                  </span>
                )}
              </div>

              <div className="p-3 bg-carbon-black rounded-lg border border-silver/10 text-[11px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap text-slate-200">
                {activeCitation.contentSnippet || 'Full content indexed from course materials.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveCitation(null)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
