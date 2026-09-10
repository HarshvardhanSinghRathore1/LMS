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

export class GeminiTranscriptionProvider implements TranscriptionProvider {
  public readonly providerName = 'Gemini-1.5';

  public isAvailable(): boolean {
    return Boolean(config.ai.geminiApiKey && config.ai.geminiApiKey.trim().length > 0);
  }

  public async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (!this.isAvailable()) {
      throw new Error('Speech-to-text provider is not configured. Missing GEMINI_API_KEY.');
    }

    if (!fs.existsSync(input.filePath)) {
      throw new Error(`Media file not found at path: ${input.filePath}`);
    }

    const fileBuffer = fs.readFileSync(input.filePath);
    const mimeType = input.mimeType || 'video/mp4';
    const model = config.ai.geminiModel || 'gemini-1.5-flash';
    const apiKey = config.ai.geminiApiKey;

    const promptText = `
You are an expert audio transcription system.
Task: Provide an exact, highly accurate verbatim transcription of the provided audio/video.
Do NOT fabricate, hallucinate, or summarize.

Return ONLY a valid JSON object matching this schema:
{
  "text": "Complete full transcript of all spoken dialogue",
  "language": "en",
  "segments": [
    {
      "startTime": 0.0,
      "endTime": 4.5,
      "text": "Spoken sentence"
    }
  ]
}
`.trim();

    try {
      let parts: any[] = [];

      // If file is under 20MB, send inline base64
      if (fileBuffer.length <= 20 * 1024 * 1024) {
        const base64Data = fileBuffer.toString('base64');
        parts = [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: promptText,
          },
        ];
      } else {
        // For larger files (>20MB), upload via Google AI File API
        const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
        const uploadHeaders = {
          'X-Goog-Upload-Command': 'start, upload, finalize',
          'X-Goog-Upload-Header-Content-Length': fileBuffer.length.toString(),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': mimeType,
        };

        const uploadRes = await axios.post(uploadUrl, fileBuffer, {
          headers: uploadHeaders,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 180000,
        });

        const fileUri = uploadRes.data?.file?.uri;
        if (!fileUri) {
          throw new Error('Failed to retrieve file URI from Gemini upload API');
        }

        parts = [
          {
            fileData: {
              mimeType,
              fileUri,
            },
          },
          {
            text: promptText,
          },
        ];
      }

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await axios.post(
        apiUrl,
        {
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 180000,
        }
      );

      const candidate = response.data?.candidates?.[0];
      const rawJson = candidate?.content?.parts?.[0]?.text;

      if (!rawJson) {
        throw new Error('Gemini did not return any transcription text');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      const fullText = String(parsed.text || '').trim();
      const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
      const segments: TranscriptSegment[] = [];

      for (const seg of rawSegments) {
        if (seg.text && typeof seg.text === 'string') {
          segments.push({
            startTime: Number(seg.startTime ?? seg.start ?? 0),
            endTime: Number(seg.endTime ?? seg.end ?? 0),
            text: seg.text.trim(),
          });
        }
      }

      return {
        text: fullText,
        segments,
        language: parsed.language || 'en',
        provider: this.providerName,
      };
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.message || 'Gemini transcription request failed';
      throw new Error(`Gemini transcription error: ${msg}`);
    }
  }
}
