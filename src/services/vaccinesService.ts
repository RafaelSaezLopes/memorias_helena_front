import { http } from '../api/http';
export type Vaccine = { id: string; childId: string; name: string; dose?: string; appliedAt: string; nextDoseAt?: string; institution?: string; batch?: string; notes?: string };
export type VaccinePayload = Omit<Vaccine, 'id'>;
export const listVaccines = async (childId: string) => (await http.get<Vaccine[]>('/vaccines', { params: { childId } })).data;
export const createVaccine = async (data: VaccinePayload) => (await http.post<Vaccine>('/vaccines', data)).data;
export const updateVaccine = async (id: string, data: VaccinePayload) => (await http.put<Vaccine>(`/vaccines/${id}`, data)).data;
export const deleteVaccine = async (id: string) => http.delete(`/vaccines/${id}`);
