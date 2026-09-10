'use client';

import React, { useState } from 'react';
import { X, Search, Clock, FileText, Sparkles } from 'lucide-react';

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

interface TranscriptViewerProps {
  lessonTitle: string;
  transcriptText?: string | null;
  transcriptMetadata?: {
    segments?: TranscriptSegment[];
    language?: string;
    provider?: string;
  };
  onClose: () => void;
  onJumpToTimestamp?: (seconds: number) => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  lessonTitle,
  transcriptText,
  transcriptMetadata,
  onClose,
  onJumpToTimestamp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const segments = transcriptMetadata?.segments || [];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSegments = segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Video Transcript
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                {lessonTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transcript keyword..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Transcript Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-slate-300 text-sm leading-relaxed">
          {segments.length > 0 ? (
            filteredSegments.length > 0 ? (
              filteredSegments.map((seg, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 hover:border-indigo-500/30 transition-all flex items-start gap-3 group"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (onJumpToTimestamp) onJumpToTimestamp(seg.startTime);
                    }}
                    className="px-2.5 py-1 bg-slate-800 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 text-slate-400 text-[11px] font-mono font-medium rounded-md border border-slate-700/60 transition-all shrink-0 flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    {formatTime(seg.startTime)}
                  </button>
                  <p className="text-xs text-slate-300 pt-0.5">{seg.text}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-500 py-8">
                No matching transcript lines found for "{searchTerm}".
              </p>
            )
          ) : transcriptText ? (
            <div className="whitespace-pre-wrap font-sans text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {transcriptText}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Transcript is not available or processing is pending.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Transcripts are indexed for AI Tutor retrieval
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
