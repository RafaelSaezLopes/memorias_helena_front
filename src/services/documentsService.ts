import { http } from '../api/http';
export type ChildDocument = { id: string; childId: string; originalName: string; contentType: string; sizeBytes: number; createdAt: string; relatedEntityType?: string };
export const listDocuments = async (childId: string) => (await http.get<ChildDocument[]>('/documents', { params: { childId } })).data;
export const uploadDocument = async (childId: string, file: File, type?: string) => {
  const form = new FormData(); form.append('childId', childId); form.append('file', file); form.append('category', 'document'); if (type) form.append('relatedEntityType', type);
  return (await http.post('/files', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};
export const deleteDocument = async (id: string) => http.delete(`/documents/${id}`);
export const downloadDocument = async (id: string, fileName: string) => {
  const response = await http.get(`/files/${id}`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data); const a = window.document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url);
};
