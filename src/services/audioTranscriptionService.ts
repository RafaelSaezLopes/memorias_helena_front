import { http } from '../api/http';

export type AudioTranscriptionResult = {
  transcript: string;
  summary?: string | null;
  warning?: string | null;
  doctorName?: string | null;
  specialty?: string | null;
  diagnosis?: string[] | null;
  medications?: string[] | null;
  requestedExams?: string[] | null;
  recommendations?: string[] | null;
  followUp?: string | null;
};

type GeminiApiResponse = {
  transcript?: string | null;
  transcription?: string | null;
  summary?: string | null;
  warning?: string | null;
  doctorName?: string | null;
  doctor_name?: string | null;
  specialty?: string | null;
  diagnosis?: string[] | null;
  diagnoses?: string[] | null;
  medications?: string[] | null;
  requestedExams?: string[] | null;
  requested_exams?: string[] | null;
  exams?: string[] | null;
  recommendations?: string[] | null;
  followUp?: string | null;
  follow_up?: string | null;
};

const listSection = (title: string, values?: string[] | null) => {
  const items = values?.map((value) => value.trim()).filter(Boolean) ?? [];
  return items.length ? `${title}:\n${items.map((item) => `- ${item}`).join('\n')}` : null;
};

const buildStructuredSummary = (data: GeminiApiResponse) => {
  const sections = [
    data.summary?.trim() || null,
    data.doctorName || data.doctor_name
      ? `PROFISSIONAL: ${data.doctorName || data.doctor_name}`
      : null,
    data.specialty ? `ESPECIALIDADE: ${data.specialty}` : null,
    listSection('DIAGNÓSTICOS OU HIPÓTESES MENCIONADAS', data.diagnosis || data.diagnoses),
    listSection('MEDICAMENTOS MENCIONADOS', data.medications),
    listSection('EXAMES SOLICITADOS OU MENCIONADOS', data.requestedExams || data.requested_exams || data.exams),
    listSection('ORIENTAÇÕES E CUIDADOS', data.recommendations),
    data.followUp || data.follow_up
      ? `RETORNO E PRÓXIMOS PASSOS: ${data.followUp || data.follow_up}`
      : null,
  ].filter((section): section is string => Boolean(section));

  return sections.length ? sections.join('\n\n') : null;
};

export const audioTranscriptionService = {
  async transcribe(input: {
    childId: string;
    file: File;
    consultationMode: boolean;
  }): Promise<AudioTranscriptionResult> {
    const form = new FormData();
    form.append('childId', input.childId);
    form.append('consultationMode', String(input.consultationMode));
    form.append('file', input.file, input.file.name);

    const endpoint =
      import.meta.env.VITE_AUDIO_AI_ENDPOINT || '/audio-transcription/transcribe';

    const { data } = await http.post<GeminiApiResponse>(
      endpoint,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000,
      },
    );

    const transcript = (data.transcript || data.transcription || '').trim();

    return {
      transcript,
      summary: input.consultationMode ? buildStructuredSummary(data) : data.summary,
      warning: data.warning,
      doctorName: data.doctorName || data.doctor_name,
      specialty: data.specialty,
      diagnosis: data.diagnosis || data.diagnoses,
      medications: data.medications,
      requestedExams: data.requestedExams || data.requested_exams || data.exams,
      recommendations: data.recommendations,
      followUp: data.followUp || data.follow_up,
    };
  },
};
