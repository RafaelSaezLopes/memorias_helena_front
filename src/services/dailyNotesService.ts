import { http } from '../api/http';
import type { ProfessionalApi, SpecialtyApi } from './professionalsService';

export type DailyNoteTypeApi = 'Daily' | 'Appointment';

export type DailyNoteApi = {
  id: string;
  childId: string;
  type: DailyNoteTypeApi;
  occurredAt: string;
  title: string;
  content: string;
  mood?: string | null;
  professionalId?: string | null;
  professional?: ProfessionalApi | null;
  specialtyId?: string | null;
  specialty?: SpecialtyApi | null;
  tags?: string | null;
};

export type DailyNoteInput = {
  childId: string;
  type: DailyNoteTypeApi;
  occurredAt: string;
  title: string;
  content: string;
  mood?: string | null;
  professionalId?: string | null;
  specialtyId?: string | null;
  tags?: string | null;
};

export const dailyNotesService = {
  async list(childId: string, from: string, to: string) {
    const { data } = await http.get<DailyNoteApi[]>('/daily-notes', { params: { childId, from, to } });
    return data;
  },
  async create(input: DailyNoteInput) {
    const { data } = await http.post<DailyNoteApi>('/daily-notes', input);
    return data;
  },
  async update(id: string, input: DailyNoteInput) {
    const { data } = await http.put<DailyNoteApi>(`/daily-notes/${id}`, input);
    return data;
  },
  async remove(id: string) {
    await http.delete(`/daily-notes/${id}`);
  },
};
