import { http } from '../api/http';

export type AlbumApi = {
  id: string;
  childId: string;
  title: string;
  eventDate: string;
  eventType?: string;
  location?: string;
  description?: string;
  coverFileId?: string;
  photoCount: number;
};

export type PhotoApi = {
  id: string;
  fileId: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  takenAt: string;
  caption?: string;
  tags?: string;
};

export type AlbumDetailApi = Omit<AlbumApi, 'photoCount'> & {
  photos: PhotoApi[];
};

export type CreateAlbumInput = {
  childId: string;
  title: string;
  eventDate: string;
  eventType?: string;
  location?: string;
  description?: string;
  coverFileId?: string | null;
};

export const albumsService = {
  async list(childId: string) {
    const { data } = await http.get<AlbumApi[]>('/albums', { params: { childId } });
    return data;
  },

  async get(id: string) {
    const { data } = await http.get<AlbumDetailApi>(`/albums/${id}`);
    return data;
  },

  async create(input: CreateAlbumInput) {
    const { data } = await http.post<AlbumApi>('/albums', input);
    return data;
  },

  async remove(id: string) {
    await http.delete(`/albums/${id}`);
  },

  async uploadFile(childId: string, albumId: string, file: File) {
    const form = new FormData();
    form.append('childId', childId);
    form.append('file', file);
    form.append('category', 'photo');
    form.append('relatedEntityId', albumId);
    form.append('relatedEntityType', 'PhotoAlbum');

    const { data } = await http.post<{ id: string }>('/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },

  async addPhoto(albumId: string, input: { fileId: string; takenAt: string; caption?: string; tags?: string }) {
    const { data } = await http.post<PhotoApi>(`/albums/${albumId}/photos`, input);
    return data;
  },

  async deletePhoto(albumId: string, photoId: string) {
    await http.delete(`/albums/${albumId}/photos/${photoId}`);
  },

  async setCover(albumId: string, fileId: string) {
    await http.put(`/albums/${albumId}/cover/${fileId}`);
  },

  async getFileBlob(fileId: string) {
    const { data } = await http.get<Blob>(`/files/${fileId}`, { responseType: 'blob' });
    return data;
  },
};
