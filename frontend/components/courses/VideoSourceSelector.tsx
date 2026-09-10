'use client';

import React, { useState } from 'react';
import { Youtube, Upload, Link, Check, AlertCircle, Loader2 } from 'lucide-react';
import { setYouTubeVideoApi, CourseLesson } from '../../lib/courses';
import { VideoUploader } from './VideoUploader';

interface VideoSourceSelectorProps {
  courseId: string;
  lessonId: string;
  currentLesson: CourseLesson;
  onUpdated: (lesson: CourseLesson) => void;
}

export const VideoSourceSelector: React.FC<VideoSourceSelectorProps> = ({
  courseId,
  lessonId,
  currentLesson,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>(
    currentLesson.video_source_type === 'UPLOADED' ? 'upload' : 'youtube'
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    currentLesson.video_metadata?.originalUrl || currentLesson.video_url || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSaveYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await setYouTubeVideoApi(courseId, lessonId, youtubeUrl.trim());
      onUpdated(updated);
      setSuccessMsg('YouTube video source linked successfully!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to link YouTube video.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span>🎬</span> Lesson Video Media
        </h4>
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveTab('youtube')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'youtube'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            YouTube
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Video
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === 'youtube' ? (
        <form onSubmit={handleSaveYouTube} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              YouTube Video or Playlist URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/... or playlist?list=..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports standard YouTube videos, short links (youtu.be), and playlists. Embeds cleanly with no ads tracking.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !youtubeUrl.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save YouTube Source
            </button>
          </div>
        </form>
      ) : (
        <VideoUploader
          courseId={courseId}
          lessonId={lessonId}
          currentLesson={currentLesson}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
};
