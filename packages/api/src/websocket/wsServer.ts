import { IncomingMessage, Server } from 'http';
import { parse } from 'url';
import WebSocket from 'ws';
import { Client } from 'pg';
import { config } from '../config/env';
import { verifyToken } from '../utils/jwt';
import { subscribe, unsubscribe, broadcast } from './gameChannel';
import { WsMessage, WsMessageType } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let pgListenClient: Client | null = null;
const listenedChannels = new Set<string>();

export function init(server: Server): void {
    const wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (req: IncomingMessage, socket, head) => {
        const { pathname, query } = parse(req.url || '', true);

        const match = pathname?.match(/^\/bt-api\/ws\/game\/([^/]+)$/);
        if (!match) {
            socket.destroy();
            return;
        }

        const gameId = match[1];
        if (!UUID_RE.test(gameId)) {
            socket.destroy();
            return;
        }

        const token = query.token as string;
        if (!token) {
            socket.destroy();
            return;
        }

        try {
            verifyToken(token);
        } catch {
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, gameId);
        });
    });

    wss.on('connection', (ws: WebSocket, gameId: string) => {
        subscribe(gameId, ws);
        ensureListen(gameId).catch((err) => console.error('LISTEN error:', err));

        ws.on('close', () => unsubscribe(gameId, ws));
        ws.on('error', () => {
            unsubscribe(gameId, ws);
            ws.close();
        });
    });

    setupPgListen();
}

function setupPgListen(): void {
    pgListenClient = new Client({
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        password: config.db.password,
    });

    pgListenClient.connect().catch((err) => {
        console.error('WS Postgres LISTEN client failed to connect:', err);
    });

    pgListenClient.on('notification', (msg) => {
        if (!msg.payload || !msg.channel.startsWith('game_')) return;
        try {
            const data = JSON.parse(msg.payload) as { type: WsMessageType; id: string; game_id: string };
            const message: WsMessage = {
                type: data.type,
                game_id: data.game_id,
                payload: { id: data.id },
            };
            broadcast(data.game_id, message);
        } catch {
            // ignore malformed payloads
        }
    });

    pgListenClient.on('error', (err) => {
        console.error('WS Postgres LISTEN client error:', err);
    });
}

async function ensureListen(gameId: string): Promise<void> {
    if (!pgListenClient || listenedChannels.has(gameId)) return;
    listenedChannels.add(gameId);
    await pgListenClient.query(`LISTEN "game_${gameId}"`);
}
