import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { WsMessage, WsMessageType } from '@pitch-tracker/shared';

type MessageHandlers = Partial<Record<WsMessageType, (payload: Record<string, unknown>) => void>>;

const API_URL: string = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:5000/bt-api';

function getWsUrl(gameId: string, token: string): string {
    const base = API_URL.replace(/^http/, 'ws').replace(/\/bt-api$/, '');
    return `${base}/bt-api/ws/game/${gameId}?token=${encodeURIComponent(token)}`;
}

export function useGameWebSocket(gameId: string | null, handlers: MessageHandlers): void {
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef(handlers);
    const mountedRef = useRef(true);

    handlersRef.current = handlers;

    const connect = useCallback(async () => {
        if (!gameId || !mountedRef.current) return;

        const token = (await AsyncStorage.getItem('token')) ?? '';
        const url = getWsUrl(gameId, token);

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
