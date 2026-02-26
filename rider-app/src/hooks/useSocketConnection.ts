import {useEffect, useRef} from 'react';
import {Socket} from 'socket.io-client';
import {connectSocket, disconnectSocket} from '../services/socketService';
import {RiderOrder} from '../types/rider';

interface SocketHandlers {
  enabled: boolean;
  token: string | null;
  onOrderAssigned: (order: RiderOrder) => void;
  onOrderUpdated: (order: RiderOrder) => void;
}

export const useSocketConnection = ({
  enabled,
  token,
  onOrderAssigned,
  onOrderUpdated,
}: SocketHandlers): void => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    const socket = connectSocket(token);
    socketRef.current = socket;

    const handleAssigned = (payload: {order: RiderOrder}) => {
      if (payload?.order) {
        onOrderAssigned(payload.order);
      }
    };

    const handleUpdated = (payload: {order: RiderOrder}) => {
      if (payload?.order) {
        onOrderUpdated(payload.order);
      }
    };

    socket.on('rider:orderAssigned', handleAssigned);
    socket.on('rider:orderUpdated', handleUpdated);

    return () => {
      socket.off('rider:orderAssigned', handleAssigned);
      socket.off('rider:orderUpdated', handleUpdated);
      disconnectSocket();
      socketRef.current = null;
    };
  }, [enabled, token, onOrderAssigned, onOrderUpdated]);
};
