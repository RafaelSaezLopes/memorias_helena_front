import type { ChildSummary, User } from '../types';
import { http } from '../api/http';

type ApiAuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  child: ChildSummary;
};

export async function login(email: string, password: string): Promise<ApiAuthResponse> {
  const { data } = await http.post<ApiAuthResponse>('/auth/login', { email, password });
  return data;
}
