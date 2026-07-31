import { http } from '../api/http';

export type ExamStatusApi = 'Requested' | 'Scheduled' | 'Performed' | 'ResultAvailable' | 'Reviewed';

export type ExamFileApi = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export type ExamApi = {
  id: string;
  childId: string;
  professionalId?: string | null;
  specialtyId?: string | null;
  name: string;
  category?: string | null;
  requestedAt?: string | null;
  scheduledAt?: string | null;
  performedAt?: string | null;
  resultReceivedAt?: string | null;
  institution?: string | null;
  resultSummary?: string | null;
  medicalEvaluation?: string | null;
  notes?: string | null;
  status: ExamStatusApi;
  professional?: { id: string; name: string } | null;
  specialty?: { id: string; name: string } | null;
  files: ExamFileApi[];
};

export type ExamInput = {
  childId: string;
  professionalId?: string | null;
  specialtyId?: string | null;
  name: string;
  category?: string | null;
  requestedAt?: string | null;
  scheduledAt?: string | null;
  performedAt?: string | null;
  resultReceivedAt?: string | null;
  institution?: string | null;
  resultSummary?: string | null;
  medicalEvaluation?: string | null;
  notes?: string | null;
  status: ExamStatusApi;
};

export const examsService = {
  async list(childId: string) {
    const { data } = await http.get<ExamApi[]>('/exams', { params: { childId } });
    return data;
  },

  async get(id: string) {
    const { data } = await http.get<ExamApi>(`/exams/${id}`);
    return data;
  },

  async create(input: ExamInput) {
    const { data } = await http.post<ExamApi>('/exams', input);
    return data;
  },

  async update(id: string, input: ExamInput) {
    const { data } = await http.put<ExamApi>(`/exams/${id}`, input);
    return data;
  },

  async remove(id: string) {
    await http.delete(`/exams/${id}`);
  },

  async uploadFile(childId: string, examId: string, file: File) {
    const form = new FormData();
    form.append('childId', childId);
    form.append('file', file);
    form.append('category', 'medical-exam');
    form.append('relatedEntityId', examId);
    form.append('relatedEntityType', 'MedicalExam');

    const { data } = await http.post<{ id: string }>('/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },

  async deleteFile(examId: string, fileId: string) {
    await http.delete(`/exams/${examId}/files/${fileId}`);
  },

  async getFileBlob(fileId: string) {
    const { data } = await http.get<Blob>(`/files/${fileId}`, { responseType: 'blob' });
    return data;
  },
};
