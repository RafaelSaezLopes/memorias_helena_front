import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProfilePage from '../pages/profile/ProfilePage';
import AlbumsPage from '../pages/photos/AlbumsPage';
import AlbumDetailPage from '../pages/photos/AlbumDetailPage';
import ProfessionalsPage from '../pages/health/ProfessionalsPage';
import ExamsPage from '../pages/health/ExamsPage';
import MedicationsPage from '../pages/health/MedicationsPage';
import SettingsPage from '../pages/settings/SettingsPage';
import VoidingDiaryPage from '../pages/health/VoidingDiaryPage';
import DailyNotesPage from '../pages/diary/DailyNotesPage';
import DocumentsPage from '../pages/profile/DocumentsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dados-pessoais" element={<ProfilePage />} />
          <Route path="/documentos" element={<DocumentsPage />} />
          <Route path="/fotos" element={<AlbumsPage />} />
          <Route path="/fotos/:albumId" element={<AlbumDetailPage />} />
          <Route path="/saude/profissionais" element={<ProfessionalsPage />} />
          <Route path="/saude/exames" element={<ExamsPage />} />
          <Route path="/saude/medicamentos" element={<MedicationsPage />} />
          <Route path="/saude/diario-miccional" element={<VoidingDiaryPage />} />
          <Route path="/diario" element={<DailyNotesPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
