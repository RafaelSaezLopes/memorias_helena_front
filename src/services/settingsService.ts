import { http } from '../api/http';

export type Permission = { module: string; canView: boolean; canEdit: boolean };
export type MeSettings = {
  id: string; name: string; email: string; role: 'ADMIN' | 'FAMILY'; active: boolean;
  permissions: Permission[];
  notification: { appointmentEnabled: boolean; medicationEnabled: boolean; notificationEmail?: string };
};
export type ManagedUser = { id: string; name: string; email: string; role: 'ADMIN' | 'FAMILY'; active: boolean; permissions: Permission[] };

export const getMe = async () => (await http.get<MeSettings>('/settings/me')).data;
export const updateAccount = async (data: { name: string; email: string }) => (await http.put('/settings/account', data)).data;
export const changePassword = async (data: { currentPassword: string; newPassword: string }) => http.put('/settings/password', data);
export const updateNotifications = async (data: { appointmentEnabled: boolean; medicationEnabled: boolean; notificationEmail?: string }) => (await http.put('/settings/notifications', data)).data;
export const listUsers = async () => (await http.get<ManagedUser[]>('/admin/users')).data;
export const createUser = async (data: unknown) => (await http.post('/admin/users', data)).data;
export const updateUser = async (id: string, data: unknown) => (await http.put(`/admin/users/${id}`, data)).data;
export const resetUserPassword = async (id: string, newPassword: string) => http.post(`/admin/users/${id}/reset-password`, { currentPassword: '', newPassword });
