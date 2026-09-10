'use client';

import React, { useState } from 'react';
import { Sparkles, Edit3, Check, X, ChevronDown, ChevronUp, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { generateLessonNotesApi, updateLessonNotesApi } from '../../lib/courses';

interface LessonNotesProps {
  courseId: string;
  lessonId: string;
  notes: string | null | undefined;
  notesStatus?: 'NOT_GENERATED' | 'GENERATING' | 'READY' | 'FAILED';
  notesMetadata?: any;
  isTrainerOrAdmin: boolean;
  onNotesUpdated?: (updatedNotes: string, status: string, metadata: any) => void;
}

export const LessonNotes: React.FC<LessonNotesProps> = ({
  courseId,
  lessonId,
  notes,
  notesStatus = 'NOT_GENERATED',
  notesMetadata = {},
  isTrainerOrAdmin,
  onNotesUpdated,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(notes || '');
  const [isGenerating, setIsGenerating] = useState(notesStatus === 'GENERATING');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateNotes = async () => {
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const data = await generateLessonNotesApi(courseId, lessonId);
      setEditText(data.notes);
      if (onNotesUpdated) {
        onNotesUpdated(data.notes, data.notesStatus, data.notesMetadata);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to generate notes';
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNotes = async () => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const data = await updateLessonNotesApi(courseId, lessonId, editText);
      setIsEditing(false);
      if (onNotesUpdated) {
        onNotesUpdated(data.notes, data.notes_status, data.notes_metadata);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save notes';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const isAiGenerated = notesMetadata?.isAiGenerated;
  const hasNotes = notes && notes.trim().length > 0;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-950/60 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400">
            <FileText className="w-4 h-4 text-[var(--strawberry-red)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Lesson Notes
              {hasNotes && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-neutral-700 bg-neutral-800 text-neutral-300 flex items-center gap-1">
                  {isAiGenerated ? (
                    <>
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      {notesMetadata?.sourceType === 'youtube_transcript' || notesMetadata?.transcriptSource === 'youtube'
                        ? 'AI-generated notes based on YouTube transcript'
                        : 'AI-generated notes'}
                    </>
                  ) : (
                    'Trainer-edited'
                  )}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-neutral-400">
              {hasNotes ? 'Grounded core concepts and structured takeaways' : 'Study notes for this lesson'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isTrainerOrAdmin && !isEditing && (
            <>
              <button
                type="button"
                onClick={handleGenerateNotes}
                disabled={isGenerating}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-neutral-700"
                title="Generate notes from verified transcript, lesson content, or attached PDFs"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isGenerating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Generate Notes'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditText(notes || '');
                  setIsEditing(true);
                }}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border border-neutral-700"
                title="Edit Notes"
              >
                <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title={isExpanded ? 'Collapse Notes' : 'Expand Notes'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mx-5 my-3 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-neutral-400 hover:text-white font-bold">
            ×
          </button>
        </div>
      )}

      {/* Notes Body */}
      {isExpanded && (
        <div className="p-5">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={10}
                placeholder="Enter markdown formatted lesson notes..."
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-red-500 rounded-xl p-4 text-xs font-mono text-neutral-100 placeholder-neutral-500 outline-none resize-y transition-colors leading-relaxed"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Notes
                </button>
              </div>
            </div>
          ) : hasNotes ? (
            <div className="prose prose-invert prose-sm max-w-none text-neutral-200 text-xs md:text-sm leading-relaxed space-y-3">
              {notes.split('\n\n').map((paragraph, idx) => {
                const trimmed = paragraph.trim();
                if (trimmed.startsWith('## ')) {
                  return (
                    <h4 key={idx} className="text-sm md:text-base font-bold text-white border-b border-neutral-800 pb-1 mt-4 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--strawberry-red)]"></span>
                      {trimmed.replace(/^##\s+/, '')}
                    </h4>
                  );
                }
                if (trimmed.startsWith('### ')) {
                  return (
                    <h5 key={idx} className="text-xs md:text-sm font-semibold text-neutral-200 mt-3 mb-1">
                      {trimmed.replace(/^###\s+/, '')}
                    </h5>
                  );
                }
                if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  const items = trimmed.split('\n');
                  return (
                    <ul key={idx} className="list-disc pl-5 space-y-1 text-neutral-300">
                      {items.map((item, itemIdx) => (
                        <li key={itemIdx}>{item.replace(/^[-•*]\s+/, '')}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={idx} className="text-neutral-300 whitespace-pre-line">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 px-4 bg-neutral-950/40 border border-neutral-800/40 rounded-xl space-y-2">
              <p className="text-xs font-medium text-neutral-400">
                Notes are not currently available for this video.
              </p>
              <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
                {isTrainerOrAdmin
                  ? 'Attach a PDF, add lesson content, or process a video transcript, then click "Generate Notes" above to create grounded notes.'
                  : 'Study notes will appear here once published by your course instructor.'}
              </p>
              {isTrainerOrAdmin && (
                <button
                  type="button"
                  onClick={handleGenerateNotes}
                  disabled={isGenerating}
                  className="mt-3 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 border border-neutral-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generate Notes</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
