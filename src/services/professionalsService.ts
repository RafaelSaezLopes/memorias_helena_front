import { http } from '../api/http';

export type SpecialtyApi = {
  id: string;
  name: string;
  description?: string | null;
};

export type ProfessionalApi = {
  id: string;
  childId: string;
  specialtyId: string;
  specialty?: SpecialtyApi | null;
  name: string;
  councilType?: string | null;
  councilNumber?: string | null;
  phone?: string | null;
  whatsApp?: string | null;
  email?: string | null;
  institution?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type ProfessionalInput = {
  childId: string;
  specialtyId: string;
  name: string;
  councilType?: string | null;
  councilNumber?: string | null;
  phone?: string | null;
  whatsApp?: string | null;
  email?: string | null;
  institution?: string | null;
  address?: string | null;
  notes?: string | null;
};

export const professionalsService = {
  async list(childId: string) {
    const { data } = await http.get<ProfessionalApi[]>('/professionals', { params: { childId } });
    return data;
  },

  async listSpecialties() {
    const { data } = await http.get<SpecialtyApi[]>('/specialties');
    return data;
  },

  async create(input: ProfessionalInput) {
    const { data } = await http.post<ProfessionalApi>('/professionals', input);
    return data;
  },

  async update(id: string, input: ProfessionalInput) {
    const { data } = await http.put<ProfessionalApi>(`/professionals/${id}`, input);
    return data;
  },

  async remove(id: string) {
    await http.delete(`/professionals/${id}`);
  },
};
