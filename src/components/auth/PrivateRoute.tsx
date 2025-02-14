import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUserRole } from '@/lib/auth';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRole?: 'patient' | 'provider';
}

export function PrivateRoute({ children, allowedRole }: PrivateRouteProps) {
  const location = useLocation();
  const isAuth = isAuthenticated();
  const userRole = getUserRole();

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to={userRole === 'provider' ? '/provider' : '/'} replace />;
  }

  return <>{children}</>;
}