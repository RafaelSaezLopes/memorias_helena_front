import { http } from '../api/http';
import type { ChildProfile } from '../types';

type ApiChild = {
  id: string;
  fullName: string;
  birthDate: string;
  cpf?: string | null;
  birthCertificate?: string | null;
  bloodType?: string | null;
  nationality?: string | null;
  birthPlace?: string | null;
  address?: string | null;
  school?: string | null;
  healthPlan?: string | null;
  healthPlanNumber?: string | null;
  allergies?: string | null;
  notes?: string | null;
};

export type ChildUpdatePayload = Omit<ApiChild, 'id'>;

function mapChild(data: ApiChild): ChildProfile {
  return {
    id: data.id,
    fullName: data.fullName,
    birthDate: data.birthDate,
    cpf: data.cpf ?? undefined,
    birthCertificate: data.birthCertificate ?? undefined,
    bloodType: data.bloodType ?? undefined,
    nationality: data.nationality ?? undefined,
    birthPlace: data.birthPlace ?? undefined,
    address: data.address ?? undefined,
    school: data.school ?? undefined,
    healthPlan: data.healthPlan ?? undefined,
    healthPlanNumber: data.healthPlanNumber ?? undefined,
    allergies: data.allergies?.split(',').map((value) => value.trim()).filter(Boolean) ?? [],
    notes: data.notes ?? undefined,
  };
}

export async function getChild(id: string): Promise<ChildProfile> {
  const { data } = await http.get<ApiChild>(`/children/${id}`);
  return mapChild(data);
}

export async function updateChild(id: string, payload: ChildUpdatePayload): Promise<ChildProfile> {
  const { data } = await http.put<ApiChild>(`/children/${id}`, payload);
  return mapChild(data);
}
