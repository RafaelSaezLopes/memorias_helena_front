import { http } from '../api/http';

export type ChildDocument = {
  id: string;
  childId: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  relatedEntityType?: string;
};

export const listDocuments = async (childId: string) =>
  (await http.get<ChildDocument[]>('/documents', { params: { childId } })).data;

export const uploadDocument = async (childId: string, file: File, type?: string) => {
  const form = new FormData();
  form.append('childId', childId);
  form.append('file', file);
  form.append('category', 'document');
  if (type) form.append('relatedEntityType', type);

  return (
    await http.post('/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data;
};

export const renameDocument = async (id: string, name: string) =>
  (await http.put<ChildDocument>(`/documents/${id}/name`, { name })).data;

export const deleteDocument = async (id: string) => http.delete(`/documents/${id}`);

export const getDocumentBlob = async (id: string) =>
  (await http.get<Blob>(`/files/${id}`, { responseType: 'blob' })).data;

export const downloadDocument = async (id: string, fileName: string) => {
  const blob = await getDocumentBlob(id);
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};
