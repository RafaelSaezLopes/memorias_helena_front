import { http } from '../api/http';

export type AudioTranscriptionResult = {
  transcript: string;
  summary?: string | null;
  warning?: string | null;
};

export const audioTranscriptionService = {
  async transcribe(input: {
    childId: string;
    file: File;
    consultationMode: boolean;
  }) {
    const form = new FormData();
    form.append('childId', input.childId);
    form.append('consultationMode', String(input.consultationMode));
    form.append('file', input.file, input.file.name);

    const { data } = await http.post<AudioTranscriptionResult>(
      '/audio-transcription/transcribe',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000,
      },
    );

    return data;
  },
};
