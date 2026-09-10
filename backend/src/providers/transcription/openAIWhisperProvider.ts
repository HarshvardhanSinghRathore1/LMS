import fs from 'fs';
import path from 'path';
import axios from 'axios';
import {
  TranscriptionProvider,
  TranscriptionInput,
  TranscriptionResult,
  TranscriptSegment,
} from './transcriptionProvider.interface';
import { config } from '../../config/env';

export class OpenAIWhisperProvider implements TranscriptionProvider {
  public readonly providerName = 'OpenAI-Whisper';

  public isAvailable(): boolean {
    return Boolean(config.ai.openaiApiKey && config.ai.openaiApiKey.trim().length > 0);
  }

  public async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (!this.isAvailable()) {
      throw new Error('Speech-to-text provider is not configured. Missing OPENAI_API_KEY.');
    }

    if (!fs.existsSync(input.filePath)) {
      throw new Error(`Media file not found at path: ${input.filePath}`);
    }

    const fileBuffer = fs.readFileSync(input.filePath);
    const fileName = path.basename(input.filePath);
    const mimeType = input.mimeType || 'video/mp4';

    const blob = new Blob([fileBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('model', config.transcription.whisperModel || 'whisper-1');
    formData.append('response_format', 'verbose_json');
    if (input.language) {
      formData.append('language', input.language);
    }

    try {
      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          Authorization: `Bearer ${config.ai.openaiApiKey}`,
        },
        timeout: 180000, // 3 minutes timeout for large files
      });

      const data = response.data;
      const fullText: string = data.text || '';
      const segments: TranscriptSegment[] = [];

      if (Array.isArray(data.segments)) {
        for (const seg of data.segments) {
          segments.push({
            startTime: Number(seg.start || 0),
            endTime: Number(seg.end || 0),
            text: String(seg.text || '').trim(),
          });
        }
      }

      return {
        text: fullText.trim(),
        segments,
        language: data.language,
        durationSeconds: data.duration ? Number(data.duration) : undefined,
        provider: this.providerName,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Whisper transcription failed';
      throw new Error(`OpenAI Whisper error: ${message}`);
    }
  }
}
