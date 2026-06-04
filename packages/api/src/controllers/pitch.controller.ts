import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import pitchService from '../services/pitch.service';

export class PitchController {
    async logPitch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const pitch = await pitchService.logPitch(req.body);
            res.status(201).json({ message: 'Pitch logged successfully', pitch });
        } catch (error) {
            next(error);
        }
    }

    async undoPitch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const result = await pitchService.undoPitch(id as string);
            res.status(200).json({
                message: 'Pitch undone successfully',
                pitch: result.pitch,
                atBat: result.atBat,
                game: result.game,
            });
        } catch (error) {
            const status = (error as { status?: number })?.status;
            if (status) {
                res.status(status).json({ error: (error as Error).message });
                return;
            }
            next(error);
        }
    }

    async updatePitchResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { pitch_result } = req.body as { pitch_result?: string };
            if (!pitch_result) {
                res.status(400).json({ error: 'pitch_result is required' });
                return;
            }
            const result = await pitchService.updatePitchResult(id as string, pitch_result);
            res.status(200).json({
                message: 'Pitch updated successfully',
                pitch: result.pitch,
                atBat: result.atBat,
            });
        } catch (error) {
            const status = (error as { status?: number })?.status;
            const code = (error as { code?: string })?.code;
            if (status) {
                res.status(status).json({ error: (error as Error).message, code });
                return;
            }
            next(error);
        }
    }

    async updatePitchVelocities(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { game_id, updates } = req.body as {
                game_id?: string;
                updates?: { pitch_id?: string; velocity?: number | null }[];
            };
            if (!game_id) {
                res.status(400).json({ error: 'game_id is required' });
                return;
            }
            if (!Array.isArray(updates) || updates.length === 0) {
                res.status(400).json({ error: 'updates must be a non-empty array' });
                return;
            }
            for (const u of updates) {
                if (!u || typeof u.pitch_id !== 'string') {
                    res.status(400).json({ error: 'each update requires a pitch_id' });
                    return;
                }
                const v = u.velocity;
                // null clears a velocity; otherwise a sane mph range (matches velocityCall).
                if (v !== null && (typeof v !== 'number' || Number.isNaN(v) || v < 20 || v > 130)) {
                    res.status(400).json({ error: 'velocity must be null or a number between 20 and 130' });
                    return;
                }
            }
            const result = await pitchService.updatePitchVelocities(
                game_id,
                updates as { pitch_id: string; velocity: number | null }[]
            );
            res.status(200).json({ message: 'Velocities updated', updated: result.updated });
        } catch (error) {
            const status = (error as { status?: number })?.status;
            const code = (error as { code?: string })?.code;
            if (status) {
                res.status(status).json({ error: (error as Error).message, code });
                return;
            }
            next(error);
        }
    }

    async getPitchById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const pitch = await pitchService.getPitchById(id as string);

            if (!pitch) {
                res.status(404).json({ error: 'Pitch not found' });
                return;
            }

            res.status(200).json({ pitch });
        } catch (error) {
            next(error);
        }
    }

    async getPitchesByAtBat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { atBatId } = req.params;
            const pitches = await pitchService.getPitchesByAtBat(atBatId as string);
            res.status(200).json({ pitches });
        } catch (error) {
            next(error);
        }
    }

    async getPitchesByGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const pitches = await pitchService.getPitchesByGame(gameId as string);
            res.status(200).json({ pitches });
        } catch (error) {
            next(error);
        }
    }

    async getPitchesByPitcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const { gameId } = req.query;
            const pitches = await pitchService.getPitchesByPitcher(pitcherId as string, gameId as string);
            res.status(200).json({ pitches });
        } catch (error) {
            next(error);
        }
    }

    async getPitchesByBatter(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { batterId } = req.params;
            const { gameId } = req.query;
            const pitches = await pitchService.getPitchesByBatter(batterId as string, gameId as string);
            res.status(200).json({ pitches });
        } catch (error) {
            next(error);
        }
    }
}

export default new PitchController();
