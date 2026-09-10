import { TranscriptionProvider } from './transcriptionProvider.interface';
import { GeminiTranscriptionProvider } from './geminiTranscriptionProvider';
import { OpenAIWhisperProvider } from './openAIWhisperProvider';
import { NullTranscriptionProvider } from './nullTranscriptionProvider';
import { config } from '../../config/env';

export class TranscriptionProviderFactory {
  private static instance: TranscriptionProvider | null = null;

  public static getProvider(): TranscriptionProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = config.transcription.provider;

    if (providerType === 'gemini') {
      if (config.ai.geminiApiKey) {
        this.instance = new GeminiTranscriptionProvider();
      } else {
        this.instance = new NullTranscriptionProvider(
          'Gemini Speech-to-text provider is not configured. Missing GEMINI_API_KEY.'
        );
      }
    } else if (providerType === 'openai' || providerType === 'whisper') {
      if (config.ai.openaiApiKey) {
        this.instance = new OpenAIWhisperProvider();
      } else {
        this.instance = new NullTranscriptionProvider(
          'OpenAI Whisper provider is not configured. Missing OPENAI_API_KEY.'
        );
      }
    } else {
      // Auto selection
      if (config.ai.geminiApiKey) {
        this.instance = new GeminiTranscriptionProvider();
      } else if (config.ai.openaiApiKey) {
        this.instance = new OpenAIWhisperProvider();
      } else {
        this.instance = new NullTranscriptionProvider(
          'No speech-to-text provider is configured. Please set GEMINI_API_KEY or OPENAI_API_KEY.'
        );
      }
    }

    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = null;
  }
}
