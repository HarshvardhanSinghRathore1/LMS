export interface YouTubeParsedResult {
  valid: boolean;
  type: 'YOUTUBE_VIDEO' | 'YOUTUBE_PLAYLIST';
  videoId?: string;
  playlistId?: string;
  embedUrl: string;
  originalUrl: string;
  title?: string;
}

export interface VideoProcessingJob {
  organizationId: string;
  courseId: string;
  lessonId: string;
  filePath: string;
  mimeType: string;
  fileName: string;
}

export interface PdfProcessingJob {
  organizationId: string;
  courseId: string;
  lessonId: string;
  resourceId: string;
  filePath: string;
  fileName: string;
  title: string;
}
