export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface TranscriptionInput {
  filePath: string;
  mimeType?: string;
  language?: string;
  lessonTitle?: string;
  courseTitle?: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  language?: string;
  durationSeconds?: number;
  provider: string;
}

export interface TranscriptionProvider {
  readonly providerName: string;
  isAvailable(): boolean;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
