import { useAuth } from '../../context/AuthContext';

export default function useNavbarAuth(navigate) {
  const { user, isLoggedIn, isAdmin, isInitializing, logout } = useAuth();

  const nameFromEmail = (email) => {
    if (!email) return 'Usuario';
    const base = email.split('@')[0] || 'Usuario';
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const email = user?.email || '';
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || nameFromEmail(email);
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  return {
    checking: isInitializing,
    isLoggedIn,
    userEmail: email,
    avatarUrl,
    displayName,
    isAdmin,
    handleLogout
  };
}