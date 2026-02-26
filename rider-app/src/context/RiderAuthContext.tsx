import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {authService} from '../services/authService';
import {setUnauthorizedHandler} from '../services/apiClient';
import {AuthSession} from '../types/rider';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface RiderAuthContextType {
  status: AuthStatus;
  session: AuthSession | null;
  login: (riderId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setOnlineState: (online: boolean) => void;
}

const RiderAuthContext = createContext<RiderAuthContextType | undefined>(undefined);

export const RiderAuthProvider: React.FC<React.PropsWithChildren> = ({children}) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleUnauthorized = () => {
      if (!mounted) {
        return;
      }
      setSession(null);
      setStatus('unauthenticated');
      authService.logout().catch(() => {});
    };

    setUnauthorizedHandler(handleUnauthorized);

    const bootstrap = async () => {
      try {
        const restored = await authService.restoreSession();
        if (!mounted) {
          return;
        }

        if (!restored) {
          setSession(null);
          setStatus('unauthenticated');
          return;
        }

        const validated = await authService.validateToken(restored);
        if (!mounted) {
          return;
        }

        setSession(validated);
        setStatus('authenticated');
      } catch {
        if (mounted) {
          await authService.logout().catch(() => {});
          setSession(null);
          setStatus('unauthenticated');
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = async (riderId: string, password: string): Promise<void> => {
    const nextSession = await authService.login(riderId, password);
    setSession(nextSession);
    setStatus('authenticated');
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setSession(null);
    setStatus('unauthenticated');
  };

  const setOnlineState = (online: boolean): void => {
    setSession((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        rider: {
          ...prev.rider,
          online,
        },
      };
    });
  };

  const value = useMemo(
    () => ({status, session, login, logout, setOnlineState}),
    [status, session]
  );

  return <RiderAuthContext.Provider value={value}>{children}</RiderAuthContext.Provider>;
};

export const useRiderAuth = (): RiderAuthContextType => {
  const ctx = useContext(RiderAuthContext);
  if (!ctx) {
    throw new Error('useRiderAuth must be used within RiderAuthProvider');
  }
  return ctx;
};
