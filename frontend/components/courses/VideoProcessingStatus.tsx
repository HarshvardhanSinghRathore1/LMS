'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Clock, AlertTriangle, FileVideo, FileText, RotateCw } from 'lucide-react';
import { fetchCourseMediaStatusApi } from '../../lib/courses';

interface VideoProcessingStatusProps {
  courseId: string;
}

export const VideoProcessingStatus: React.FC<VideoProcessingStatusProps> = ({ courseId }) => {
  const [mediaStatus, setMediaStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCourseMediaStatusApi(courseId);
      setMediaStatus(data);
    } catch (e) {
      console.error('Failed to load media processing status', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadStatus();
  }, [courseId]);

  if (isLoading) {
    return (
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl animate-pulse text-xs text-slate-400">
        Loading AI knowledge status...
      </div>
    );
  }

  if (!mediaStatus) return null;

  const lessons = mediaStatus.lessons || [];
  const resources = mediaStatus.resources || [];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">
            AI Tutor Course Knowledge Index
          </h4>
        </div>
        <button
          onClick={loadStatus}
          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all"
          title="Refresh status"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Videos Status */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <FileVideo className="w-3.5 h-3.5 text-indigo-400" />
              Lesson Videos
            </span>
            <span className="text-[11px] text-slate-500">{lessons.length} lessons</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {lessons.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-300 truncate max-w-[160px]">{l.title}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  l.transcription_status === 'READY'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : l.transcription_status === 'FAILED'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-indigo-400 bg-indigo-500/10'
                }`}>
                  {l.video_source_type ? (l.transcription_status || 'READY') : 'Text Only'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resources Status */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-red-400" />
              PDF Resources
            </span>
            <span className="text-[11px] text-slate-500">{resources.length} files</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {resources.length > 0 ? (
              resources.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-300 truncate max-w-[160px]">{r.title}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    r.indexing_status === 'INDEXED'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-amber-400 bg-amber-500/10'
                  }`}>
                    {r.indexing_status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-500 py-3 text-center">No PDFs attached</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
