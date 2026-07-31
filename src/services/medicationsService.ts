import { http } from '../api/http';

export type MedicationApi = {
  id: string;
  childId: string;
  professionalId?: string | null;
  name: string;
  activeIngredient?: string | null;
  dosage?: string | null;
  doseAmount?: string | null;
  frequency?: string | null;
  startDate: string;
  startTime?: string | null;
  endDate?: string | null;
  reason?: string | null;
  notes?: string | null;
  inUse: boolean;
  professional?: { id: string; name: string } | null;
};

export type MedicationInput = {
  childId: string;
  professionalId?: string | null;
  name: string;
  activeIngredient?: string | null;
  dosage?: string | null;
  doseAmount?: string | null;
  frequency?: string | null;
  startDate: string;
  startTime?: string | null;
  endDate?: string | null;
  reason?: string | null;
  notes?: string | null;
  inUse: boolean;
};

export const medicationsService = {
  async list(childId: string) {
    const { data } = await http.get<MedicationApi[]>('/medications', { params: { childId } });
    return data;
  },
  async create(input: MedicationInput) {
    const { data } = await http.post<MedicationApi>('/medications', input);
    return data;
  },
  async update(id: string, input: MedicationInput) {
    const { data } = await http.put<MedicationApi>(`/medications/${id}`, input);
    return data;
  },
  async remove(id: string) {
    await http.delete(`/medications/${id}`);
  },
};
