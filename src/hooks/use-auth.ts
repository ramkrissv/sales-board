'use client';
import { useSession, signOut } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();
  return {
    user: session?.user ? {
      id: (session.user as any).id,
      email: session.user.email,
      firstName: session.user.name?.split(' ')[0] || '',
      lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
      profileImageUrl: session.user.image,
      role: (session.user as any).role || 'rep',
    } : null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    logout: () => signOut({ callbackUrl: '/login' }),
    isLoggingOut: false,
  };
}
