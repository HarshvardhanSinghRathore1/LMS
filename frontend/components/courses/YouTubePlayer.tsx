'use client';

import React from 'react';
import { Play } from 'lucide-react';

interface YouTubePlayerProps {
  embedUrl: string;
  title?: string;
  isPlaylist?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  embedUrl,
  title = 'Course Video',
  isPlaylist = false,
}) => {
  if (!embedUrl) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center text-slate-400 border border-slate-800">
        <Play className="w-12 h-12 mb-2 text-slate-600" />
        <p className="text-sm font-medium">No video source provided</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-slate-800/80 group">
      {isPlaylist && (
        <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          YouTube Playlist
        </div>
      )}
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};
