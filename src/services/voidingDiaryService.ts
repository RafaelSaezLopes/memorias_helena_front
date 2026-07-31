import { http } from '../api/http';

export type VoidingDiaryApi = {
  id: string;
  childId: string;
  occurredAt: string;
  urineMl?: number | null;
  leakage: boolean;
  leakageLevel?: string | null;
  urgency: boolean;
  moment?: string | null;
  notes?: string | null;
};

export type VoidingDiaryInput = {
  childId: string;
  occurredAt: string;
  urineMl?: number | null;
  leakage: boolean;
  leakageLevel?: string | null;
  urgency: boolean;
  moment?: string | null;
  notes?: string | null;
};

export const voidingDiaryService = {
  async list(childId: string, from: string, to: string) {
    const { data } = await http.get<VoidingDiaryApi[]>('/voiding-diary', { params: { childId, from, to } });
    return data;
  },
  async create(input: VoidingDiaryInput) {
    const { data } = await http.post<VoidingDiaryApi>('/voiding-diary', input);
    return data;
  },
  async update(id: string, input: VoidingDiaryInput) {
    const { data } = await http.put<VoidingDiaryApi>(`/voiding-diary/${id}`, input);
    return data;
  },
  async remove(id: string) { await http.delete(`/voiding-diary/${id}`); },
};
