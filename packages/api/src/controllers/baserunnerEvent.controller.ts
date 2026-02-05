import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import baserunnerEventService from '../services/baserunnerEvent.service';

export class BaserunnerEventController {
    async recordEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const event = await baserunnerEventService.recordEvent(req.body);
            res.status(201).json({ message: 'Baserunner event recorded', event });
        } catch (error) {
            next(error);
        }
    }

    async getEventsByGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const events = await baserunnerEventService.getEventsByGame(gameId as string);
            res.status(200).json({ events });
        } catch (error) {
            next(error);
        }
    }

    async getEventsByInning(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { inningId } = req.params;
            const events = await baserunnerEventService.getEventsByInning(inningId as string);
            res.status(200).json({ events });
        } catch (error) {
            next(error);
        }
    }

    async deleteEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            await baserunnerEventService.deleteEvent(id as string);
            res.status(200).json({ message: 'Event deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export default new BaserunnerEventController();
