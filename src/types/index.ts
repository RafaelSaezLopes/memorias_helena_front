export type ChildSummary = {
  id: string;
  fullName: string;
  birthDate: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FAMILY';
  permissions?: string[];
  avatarUrl?: string;
};

export type ChildProfile = {
  id: string;
  fullName: string;
  birthDate: string;
  bloodType?: string;
  cpf?: string;
  birthCertificate?: string;
  nationality?: string;
  birthPlace?: string;
  address?: string;
  school?: string;
  healthPlan?: string;
  healthPlanNumber?: string;
  allergies?: string[];
  notes?: string;
};

export type HealthProfessional = {
  id: string;
  childId: string;
  specialtyId: string;
  specialty: string;
  name: string;
  councilType?: string;
  councilNumber?: string;
  phone?: string;
  whatsApp?: string;
  email?: string;
  institution?: string;
  address?: string;
  notes?: string;
};

export type MedicalExam = {
  id: string;
  name: string;
  specialty: string;
  doctorName?: string;
  requestedAt?: string;
  performedAt?: string;
  status: 'SOLICITADO' | 'AGENDADO' | 'REALIZADO' | 'AVALIADO';
  institution?: string;
  summary?: string;
  fileName?: string;
};

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  doctorName?: string;
  reason?: string;
  active: boolean;
};

export type PhotoAlbum = {
  id: string;
  title: string;
  date: string;
  category: string;
  description?: string;
  coverUrl: string;
  photoCount: number;
};


export type VoidingDiaryEntry = {
  id: string;
  date: string;
  time: string;
  urineMl: number;
  fluidIntakeMl: number;
  leakage: boolean;
  leakageLevel?: 'PEQUENA' | 'MEDIA' | 'GRANDE';
  urgency: boolean;
  moment?: string;
  notes?: string;
};

export type DailyNote = {
  id: string;
  date: string;
  time: string;
  type: 'DIA' | 'CONSULTA';
  title: string;
  content: string;
  mood?: 'MUITO_BEM' | 'BEM' | 'NORMAL' | 'IRRITADA' | 'CANSADA' | 'MAL';
  professional?: string;
  specialty?: string;
  tags?: string[];
};
