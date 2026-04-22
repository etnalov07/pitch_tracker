import { WsMessage, WsMessageType } from '@pitch-tracker/shared';
import { useCallback, useEffect, useRef } from 'react';

type MessageHandlers = Partial<Record<WsMessageType, (payload: Record<string, unknown>) => void>>;

export function useGameWebSocket(gameId: string | null, handlers: MessageHandlers): void {
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef(handlers);
    const mountedRef = useRef(true);

    handlersRef.current = handlers;

    const connect = useCallback(() => {
        if (!gameId || !mountedRef.current) return;

        const token = localStorage.getItem('token') ?? '';
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/bt-api';
        const apiOrigin = new URL(apiUrl).origin;
        const wsOrigin = apiOrigin.replace(/^https/, 'wss').replace(/^http/, 'ws');
        const url = `${wsOrigin}/bt-api/ws/game/${gameId}?token=${encodeURIComponent(token)}`;

        const socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string) as WsMessage;
                const handler = handlersRef.current[msg.type];
                if (handler) handler(msg.payload);
            } catch {
                // ignore malformed messages
            }
        };

        socket.onclose = () => {
            if (!mountedRef.current || wsRef.current !== socket) return;
            setTimeout(() => connect(), 3000);
        };

        socket.onerror = () => {
            socket.close();
        };
    }, [gameId]);

    useEffect(() => {
        mountedRef.current = true;
        connect();
        return () => {
            mountedRef.current = false;
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [connect]);
}
