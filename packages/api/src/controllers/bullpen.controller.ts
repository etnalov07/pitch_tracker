import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import bullpenService from '../services/bullpen.service';

export class BullpenController {
    // Session endpoints

    async createSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const session = await bullpenService.createSession({
                ...req.body,
                created_by: req.user?.id,
            });
            res.status(201).json({ message: 'Bullpen session created', session });
        } catch (error) {
            next(error);
        }
    }

    async getSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const session = await bullpenService.getSessionById(id as string);

            if (!session) {
                res.status(404).json({ error: 'Session not found' });
                return;
            }

            res.status(200).json({ session });
        } catch (error) {
            next(error);
        }
    }

    async getTeamSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { teamId } = req.params;
            const { pitcherId } = req.query;
            const sessions = await bullpenService.getSessionsByTeam(teamId as string, pitcherId as string | undefined);
            res.status(200).json({ sessions });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const sessions = await bullpenService.getSessionsByPitcher(pitcherId as string);
            res.status(200).json({ sessions });
        } catch (error) {
            next(error);
        }
    }

    async updateSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const session = await bullpenService.updateSession(id as string, req.body);
            res.status(200).json({ message: 'Session updated', session });
        } catch (error) {
            next(error);
        }
    }

    async endSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const session = await bullpenService.endSession(id as string, notes);
            res.status(200).json({ message: 'Session ended', session });
        } catch (error) {
            next(error);
        }
    }

    // Pitch endpoints

    async logPitch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const pitch = await bullpenService.logPitch(req.body);
            res.status(201).json({ message: 'Bullpen pitch logged', pitch });
        } catch (error) {
            next(error);
        }
    }

    async getSessionPitches(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { sessionId } = req.params;
            const pitches = await bullpenService.getPitchesBySession(sessionId as string);
            res.status(200).json({ pitches });
        } catch (error) {
            next(error);
        }
    }

    // Analytics endpoints

    async getSessionSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const summary = await bullpenService.getSessionSummary(id as string);

            if (!summary) {
                res.status(404).json({ error: 'Session not found' });
                return;
            }

            res.status(200).json({ summary });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherBullpenLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const { limit, offset } = req.query;
            const result = await bullpenService.getPitcherBullpenLogs(
                pitcherId as string,
                limit ? parseInt(limit as string, 10) : undefined,
                offset ? parseInt(offset as string, 10) : undefined
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
    // Plan endpoints

    async createPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const plan = await bullpenService.createPlan({
                ...req.body,
                created_by: req.user?.id,
            });
            res.status(201).json({ message: 'Bullpen plan created', plan });
        } catch (error) {
            next(error);
        }
    }

    async getPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { planId } = req.params;
            const plan = await bullpenService.getPlanById(planId as string);
            if (!plan) {
                res.status(404).json({ error: 'Plan not found' });
                return;
            }
            res.status(200).json({ plan });
        } catch (error) {
            next(error);
        }
    }

    async getTeamPlans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { teamId } = req.params;
            const plans = await bullpenService.getPlansByTeam(teamId as string);
            res.status(200).json({ plans });
        } catch (error) {
            next(error);
        }
    }

    async updatePlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { planId } = req.params;
            const plan = await bullpenService.updatePlan(planId as string, req.body);
            res.status(200).json({ message: 'Plan updated', plan });
        } catch (error) {
            next(error);
        }
    }

    async deletePlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { planId } = req.params;
            await bullpenService.deletePlan(planId as string);
            res.status(200).json({ message: 'Plan deleted' });
        } catch (error) {
            next(error);
        }
    }

    async assignPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { planId } = req.params;
            const { pitcher_ids } = req.body;
            const assignments = await bullpenService.assignPlan(planId as string, pitcher_ids, req.user?.id);
            res.status(200).json({ message: 'Plan assigned', assignments });
        } catch (error) {
            next(error);
        }
    }

    async unassignPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { planId, pitcherId } = req.params;
            await bullpenService.unassignPlan(planId as string, pitcherId as string);
            res.status(200).json({ message: 'Assignment removed' });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherAssignments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const plans = await bullpenService.getPitcherAssignments(pitcherId as string);
            res.status(200).json({ plans });
        } catch (error) {
            next(error);
        }
    }
}

export default new BullpenController();
