import type { ChildSummary, User } from '../types';
import { http } from '../api/http';

const useMocks = (import.meta.env.VITE_USE_MOCKS ?? 'false') === 'true';

type ApiAuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  child: ChildSummary;
};

export async function login(email: string, password: string): Promise<ApiAuthResponse> {
  if (useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (email !== '' || password !== '') {
      throw new Error('E-mail ou senha inválidos');
    }

    return {
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      user: { id: '1', name: 'Rafael Saez', email, role: 'ADMIN' },
      child: { id: '1', fullName: 'Helena Couto Lopes', birthDate: '2022-07-19' },
    };
  }

  const { data } = await http.post<ApiAuthResponse>('/auth/login', { email, password });
  return data;
}
