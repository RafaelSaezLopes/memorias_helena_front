import { http } from '../api/http';

export type FluidIntakeApi = {
  id: string;
  childId: string;
  occurredAt: string;
  amountMl: number;
  beverage?: string | null;
  notes?: string | null;
};

export type FluidIntakeInput = {
  childId: string;
  occurredAt: string;
  amountMl: number;
  beverage?: string | null;
  notes?: string | null;
};

export const fluidIntakeService = {
  async list(childId: string, from: string, to: string) {
    const { data } = await http.get<FluidIntakeApi[]>('/fluid-intake', { params: { childId, from, to } });
    return data;
  },
  async create(input: FluidIntakeInput) {
    const { data } = await http.post<FluidIntakeApi>('/fluid-intake', input);
    return data;
  },
  async update(id: string, input: FluidIntakeInput) {
    const { data } = await http.put<FluidIntakeApi>(`/fluid-intake/${id}`, input);
    return data;
  },
  async remove(id: string) {
    await http.delete(`/fluid-intake/${id}`);
  },
};
