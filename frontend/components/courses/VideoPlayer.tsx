'use client';

import React, { useRef, useEffect } from 'react';
import { Video, AlertCircle } from 'lucide-react';
import { getLessonVideoStreamUrl } from '../../lib/courses';

interface VideoPlayerProps {
  courseId: string;
  lessonId: string;
  title?: string;
  initialTimestamp?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  courseId,
  lessonId,
  title = 'Course Lecture Video',
  initialTimestamp,
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamUrl = getLessonVideoStreamUrl(courseId, lessonId);

  useEffect(() => {
    if (videoRef.current && initialTimestamp !== undefined && initialTimestamp > 0) {
      videoRef.current.currentTime = initialTimestamp;
      videoRef.current.play().catch(() => {});
    }
  }, [initialTimestamp]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-slate-800/80 group">
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        className="w-full h-full object-contain"
        preload="metadata"
        onTimeUpdate={() => {
          if (videoRef.current && onTimeUpdate) {
            onTimeUpdate(videoRef.current.currentTime);
          }
        }}
      >
        <source src={streamUrl} type="video/mp4" />
        <source src={streamUrl} type="video/webm" />
        Your browser does not support HTML5 video playback.
      </video>
    </div>
  );
};
