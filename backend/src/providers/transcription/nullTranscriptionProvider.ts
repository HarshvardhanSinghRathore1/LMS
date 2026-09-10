import {
  TranscriptionProvider,
  TranscriptionInput,
  TranscriptionResult,
} from './transcriptionProvider.interface';

export class NullTranscriptionProvider implements TranscriptionProvider {
  public readonly providerName = 'None';
  private readonly reason: string;

  constructor(reason = 'Speech-to-text provider is not configured.') {
    this.reason = reason;
  }

  public isAvailable(): boolean {
    return false;
  }

  public async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new Error(this.reason);
  }
}
