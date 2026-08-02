import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type PermissionRouteProps = {
  module: string;
};

export function PermissionRoute({ module }: PermissionRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  const allowed =
    user?.role === 'ADMIN' || user?.permissions?.includes(module) === true;

  if (allowed) {
    return <Outlet />;
  }

  const firstAllowedPath =
    user?.role === 'ADMIN'
      ? '/'
      : [
          ['dashboard', '/'],
          ['personal_data', '/dados-pessoais'],
          ['documents', '/documentos'],
          ['photos', '/fotos'],
          ['professionals', '/saude/profissionais'],
          ['exams', '/saude/exames'],
          ['medications', '/saude/medicamentos'],
          ['voiding_diary', '/saude/diario-miccional'],
          ['daily_notes', '/diario'],
        ].find(([permission]) => user?.permissions?.includes(permission))?.[1] ??
        '/configuracoes';

  return (
    <Navigate
      to={firstAllowedPath}
      replace
      state={{
        permissionDenied: true,
        from: location.pathname,
      }}
    />
  );
}
