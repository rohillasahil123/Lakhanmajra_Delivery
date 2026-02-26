import {apiClient, setApiToken} from './apiClient';
import {AuthSession} from '../types/rider';
import {sessionStorage} from './storage';

interface RiderLoginResponse {
  token: string;
  rider: {
    id: string;
    name: string;
    phone: string;
    role: string;
    online?: boolean;
  };
}

interface RiderMeResponse {
  rider: {
    id: string;
    name: string;
    phone: string;
    role: string;
    online?: boolean;
  };
}

export const authService = {
  async login(riderId: string, password: string): Promise<AuthSession> {
    const response = await apiClient.post<RiderLoginResponse>('/rider/login', {
      riderId,
      password,
    });

    if (response.data.rider.role !== 'rider') {
      throw new Error('Access denied: rider role required');
    }

    const session: AuthSession = {
      accessToken: response.data.token,
      rider: {
        id: response.data.rider.id,
        name: response.data.rider.name,
        phone: response.data.rider.phone,
        role: 'rider',
        online: Boolean(response.data.rider.online),
      },
    };

    setApiToken(session.accessToken);
    await sessionStorage.save(session);
    return session;
  },

  async restoreSession(): Promise<AuthSession | null> {
    const session = await sessionStorage.get();
    if (session?.accessToken) {
      setApiToken(session.accessToken);
    }
    return session;
  },

  async validateToken(session: AuthSession): Promise<AuthSession> {
    setApiToken(session.accessToken);
    const response = await apiClient.get<RiderMeResponse>('/rider/me');

    if (response.data.rider.role !== 'rider') {
      throw new Error('Access denied: rider role required');
    }

    const nextSession: AuthSession = {
      accessToken: session.accessToken,
      rider: {
        id: response.data.rider.id,
        name: response.data.rider.name,
        phone: response.data.rider.phone,
        role: 'rider',
        online: Boolean(response.data.rider.online),
      },
    };

    await sessionStorage.save(nextSession);
    return nextSession;
  },

  async logout(): Promise<void> {
    setApiToken(null);
    await sessionStorage.clear();
  },
};
