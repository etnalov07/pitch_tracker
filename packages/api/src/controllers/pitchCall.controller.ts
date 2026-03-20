import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import pitchCallService from '../services/pitchCall.service';

export class PitchCallController {
    async createCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const call = await pitchCallService.createCall({
                ...req.body,
                called_by: req.user?.id,
            });
            res.status(201).json({ message: 'Pitch call created', call });
        } catch (error) {
            next(error);
        }
    }

    async changeCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const call = await pitchCallService.changeCall({
                original_call_id: id as string,
                pitch_type: req.body.pitch_type,
                zone: req.body.zone,
                called_by: req.user?.id as string,
            });
            res.status(201).json({ message: 'Pitch call changed', call });
        } catch (error) {
            next(error);
        }
    }

    async markTransmitted(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const call = await pitchCallService.markTransmitted(id as string);
            res.status(200).json({ message: 'Call marked as transmitted', call });
        } catch (error) {
            next(error);
        }
    }

    async logResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const call = await pitchCallService.logResult(id as string, req.body);
            res.status(200).json({ message: 'Result logged', call });
        } catch (error) {
            next(error);
        }
    }

    async getCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const call = await pitchCallService.getCallById(id as string);

            if (!call) {
                res.status(404).json({ error: 'Call not found' });
                return;
            }

            res.status(200).json({ call });
        } catch (error) {
            next(error);
        }
    }

    async getGameCalls(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const calls = await pitchCallService.getCallsByGame(gameId as string);
            res.status(200).json({ calls });
        } catch (error) {
            next(error);
        }
    }

    async getAtBatCalls(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { atBatId } = req.params;
            const calls = await pitchCallService.getCallsByAtBat(atBatId as string);
            res.status(200).json({ calls });
        } catch (error) {
            next(error);
        }
    }

    async getActiveCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const call = await pitchCallService.getActiveCall(gameId as string);
            res.status(200).json({ call });
        } catch (error) {
            next(error);
        }
    }

    async getGameSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const summary = await pitchCallService.getGameSummary(gameId as string);

            if (!summary) {
                res.status(404).json({ error: 'No pitch calls found for this game' });
                return;
            }

            res.status(200).json({ summary });
        } catch (error) {
            next(error);
        }
    }
}

export default new PitchCallController();
