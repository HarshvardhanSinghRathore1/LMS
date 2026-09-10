'use client';

import React, { useState, useRef } from 'react';
import { FileUp, FileText, Trash2, Download, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import {
  uploadLessonResourceApi,
  deleteLessonResourceApi,
  getLessonResourceDownloadUrl,
  LessonResource,
} from '../../lib/courses';

interface CourseResourceUploaderProps {
  courseId: string;
  lessonId: string;
  resources: LessonResource[];
  isTrainer: boolean;
  onUpdated: () => void;
}

export const CourseResourceUploader: React.FC<CourseResourceUploaderProps> = ({
  courseId,
  lessonId,
  resources,
  isTrainer,
  onUpdated,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMsg('Only PDF document resources are supported.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('PDF file exceeds maximum allowed size of 50MB.');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);
    if (customTitle.trim()) {
      formData.append('title', customTitle.trim());
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg(null);

    try {
      await uploadLessonResourceApi(courseId, lessonId, formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
        setUploadProgress(percent);
      });
      setCustomTitle('');
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to upload PDF resource.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this PDF resource?')) return;
    setDeletingId(resourceId);
    try {
      await deleteLessonResourceApi(courseId, lessonId, resourceId);
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to delete resource.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <span>📄</span> Lesson Resources & PDFs
        </h4>
        <span className="text-xs text-slate-400">
          {resources.length} {resources.length === 1 ? 'Resource' : 'Resources'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Form for Trainers/Admins */}
      {isTrainer && (
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Resource Title (Optional, defaults to filename)"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading ({uploadProgress}%)
                </>
              ) : (
                <>
                  <FileUp className="w-3.5 h-3.5" />
                  + Attach PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Resource List */}
      <div className="space-y-2">
        {resources.length > 0 ? (
          resources.map((res) => {
            const downloadUrl = getLessonResourceDownloadUrl(courseId, lessonId, res.id);
            return (
              <div
                key={res.id}
                className="bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {res.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">
                        {formatFileSize(res.file_size_bytes)}
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                        res.indexing_status === 'INDEXED'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : res.indexing_status === 'FAILED'
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-indigo-400 bg-indigo-500/10'
                      }`}>
                        {res.indexing_status === 'INDEXED' ? '✓ AI Indexed' : res.indexing_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all flex items-center gap-1"
                    title="Open / Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  {isTrainer && (
                    <button
                      type="button"
                      onClick={() => handleDelete(res.id)}
                      disabled={deletingId === res.id}
                      className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg transition-all disabled:opacity-50"
                      title="Delete resource"
                    >
                      {deletingId === res.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-xs text-slate-500 py-4">
            No PDF resources attached to this lesson yet.
          </p>
        )}
      </div>
    </div>
  );
};
