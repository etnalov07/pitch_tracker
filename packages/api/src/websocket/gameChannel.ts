import WebSocket from 'ws';
import { WsMessage } from '../types';

const channels = new Map<string, Set<WebSocket>>();

export function subscribe(gameId: string, ws: WebSocket): void {
    if (!channels.has(gameId)) {
        channels.set(gameId, new Set());
    }
    channels.get(gameId)!.add(ws);
}

export function unsubscribe(gameId: string, ws: WebSocket): void {
    const subs = channels.get(gameId);
    if (!subs) return;
    subs.delete(ws);
    if (subs.size === 0) {
        channels.delete(gameId);
    }
}

export function broadcast(gameId: string, message: WsMessage): void {
    const subs = channels.get(gameId);
    if (!subs) return;
    const json = JSON.stringify(message);
    for (const ws of subs) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(json);
        }
    }
}

export function getSubscriberCount(gameId: string): number {
    return channels.get(gameId)?.size ?? 0;
}
