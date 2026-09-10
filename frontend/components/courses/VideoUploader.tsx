'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileVideo, Trash2, RotateCw, CheckCircle2, AlertCircle, Loader2, Sparkles, FileText } from 'lucide-react';
import {
  uploadLessonVideoApi,
  deleteLessonVideoApi,
  reprocessLessonVideoApi,
  CourseLesson,
} from '../../lib/courses';
import { TranscriptViewer } from './TranscriptViewer';

interface VideoUploaderProps {
  courseId: string;
  lessonId: string;
  currentLesson: CourseLesson;
  onUpdated: (lesson: CourseLesson) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  courseId,
  lessonId,
  currentLesson,
  onUpdated,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isUploaded = currentLesson.video_source_type === 'UPLOADED' && currentLesson.video_url;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov)$/i)) {
      setErrorMsg('Please select a valid video file (MP4, WebM, or MOV).');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setErrorMsg('Video file size exceeds maximum limit of 500MB.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg(null);

    try {
      const updated = await uploadLessonVideoApi(courseId, lessonId, formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
        setUploadProgress(percent);
      });
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to upload video file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this video and its knowledge base vectors?')) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const updated = await deleteLessonVideoApi(courseId, lessonId);
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to delete video.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReprocess = async () => {
    setIsReprocessing(true);
    setErrorMsg(null);
    try {
      await reprocessLessonVideoApi(courseId, lessonId);
      alert('Video speech-to-text & RAG re-processing has been queued.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to reprocess video.');
    } finally {
      setIsReprocessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileSelect}
        className="hidden"
      />

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isUploaded ? (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileVideo className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                {currentLesson.video_metadata?.originalName || 'Uploaded Lecture Video'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-slate-400">
                  {currentLesson.video_metadata?.size
                    ? `${(currentLesson.video_metadata.size / (1024 * 1024)).toFixed(1)} MB`
                    : 'Web Video'}
                </span>
                <span className="text-slate-600">•</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  currentLesson.transcription_status === 'READY'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : currentLesson.transcription_status === 'FAILED'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                }`}>
                  {currentLesson.transcription_status === 'READY'
                    ? '✓ AI Knowledge Ready'
                    : currentLesson.transcription_status === 'FAILED'
                    ? '⚠ STT Provider Idle'
                    : '⏳ Transcribing & Indexing'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {currentLesson.transcript_text && (
              <button
                type="button"
                onClick={() => setShowTranscript(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Transcript
              </button>
            )}

            <button
              type="button"
              onClick={handleReprocess}
              disabled={isReprocessing}
              title="Reprocess transcription & AI vectors"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-medium rounded-lg transition-all"
            >
              Replace
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg transition-all disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isUploading
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/30 bg-slate-950/50'
          }`}
        >
          {isUploading ? (
            <div className="max-w-xs mx-auto space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-200">
                Uploading Video ({uploadProgress}%)
              </p>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Large videos may take a moment to upload and process.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Click or drag & drop video file to upload
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Supports MP4, WebM, QuickTime up to 500MB. Uploaded videos are securely stored and automatically processed for AI Tutor retrieval.
              </p>
            </div>
          )}
        </div>
      )}

      {showTranscript && (
        <TranscriptViewer
          lessonTitle={currentLesson.title}
          transcriptText={currentLesson.transcript_text}
          transcriptMetadata={currentLesson.transcript_metadata}
          onClose={() => setShowTranscript(false)}
        />
      )}
    </div>
  );
};
