import type {
  ChildProfile,
  HealthProfessional,
  MedicalExam,
  Medication,
  PhotoAlbum,
} from '../types';

export const childProfile: ChildProfile = {
  id: '1',
  fullName: 'Helena Saez Lopes',
  birthDate: '2022-07-19',
  bloodType: 'O+',
  cpf: '000.000.000-00',
  birthCertificate: 'Certidão de nascimento cadastrada',
  school: 'Escola Infantil',
  healthPlan: 'Prevent Senior',
  healthPlanNumber: '000000000',
  allergies: ['Nenhuma alergia registrada'],
  notes: 'Informações gerais da Helena.',
};

export const professionals: HealthProfessional[] = [
  {
    id: '1',
    childId: '1',
    specialtyId: '1',
    name: 'Dra. Mariana Silva',
    specialty: 'Pediatria',
    councilType: 'CRM-SP',
    councilNumber: '123456',
    phone: '(11) 99999-1111',
    institution: 'Clínica Infantil',
  },
  {
    id: '2',
    childId: '1',
    specialtyId: '2',
    name: 'Dr. Paulo Mendes',
    specialty: 'Nefrologia Pediátrica',
    councilType: 'CRM-SP',
    councilNumber: '654321',
    phone: '(11) 99999-2222',
    institution: 'Hospital Infantil',
  },
  {
    id: '3',
    childId: '1',
    specialtyId: '3',
    name: 'Dra. Camila Rocha',
    specialty: 'Urologia Pediátrica',
    councilType: 'CRM-SP',
    councilNumber: '987654',
    phone: '(11) 99999-3333',
    institution: 'Centro Médico',
  },
];

export const exams: MedicalExam[] = [
  {
    id: '1',
    name: 'Cintilografia renal',
    specialty: 'Nefrologia Pediátrica',
    doctorName: 'Dr. Paulo Mendes',
    requestedAt: '2026-07-01',
    performedAt: '2026-07-13',
    status: 'AVALIADO',
    institution: 'Hospital Infantil',
    summary: 'Resultado anexado e avaliado.',
    fileName: 'cintilografia-renal.pdf',
  },
  {
    id: '2',
    name: 'Urocultura',
    specialty: 'Pediatria',
    doctorName: 'Dra. Mariana Silva',
    requestedAt: '2026-06-01',
    performedAt: '2026-06-03',
    status: 'REALIZADO',
    institution: 'Laboratório Central',
    summary: 'Exame laboratorial.',
    fileName: 'urocultura.pdf',
  },
  {
    id: '3',
    name: 'Ultrassom de rins e vias urinárias',
    specialty: 'Urologia Pediátrica',
    doctorName: 'Dra. Camila Rocha',
    requestedAt: '2026-07-20',
    status: 'AGENDADO',
    institution: 'Centro Médico',
  },
];

export const medications: Medication[] = [
  {
    id: '1',
    name: 'Antibiótico',
    dosage: 'Conforme prescrição',
    frequency: 'A cada 8 horas',
    startDate: '2026-06-03',
    endDate: '2026-06-10',
    doctorName: 'Dra. Mariana Silva',
    reason: 'Infecção urinária',
    active: false,
  },
  {
    id: '2',
    name: 'Dipirona',
    dosage: 'Conforme prescrição',
    frequency: 'Se necessário',
    startDate: '2026-06-04',
    doctorName: 'Dra. Mariana Silva',
    reason: 'Febre',
    active: false,
  },
];

export const albums: PhotoAlbum[] = [
  {
    id: '1',
    title: 'Aniversário de 4 anos',
    date: '2026-07-19',
    category: 'Aniversário',
    description: 'Festa de 4 anos da Helena.',
    coverUrl:
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80',
    photoCount: 48,
  },
  {
    id: '2',
    title: 'Passeio em família',
    date: '2026-06-15',
    category: 'Passeio',
    coverUrl:
      'https://images.unsplash.com/photo-1504151932400-72d4384f04b3?auto=format&fit=crop&w=900&q=80',
    photoCount: 22,
  },
  {
    id: '3',
    title: 'Dia na escola',
    date: '2026-05-20',
    category: 'Escola',
    coverUrl:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80',
    photoCount: 15,
  },
];