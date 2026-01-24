import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import scoutingService from '../services/scouting.service';

export class ScoutingController {
    async getScoutingReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const batterId = req.params.batterId as string;
            const report = await scoutingService.getScoutingReport(batterId);

            if (!report) {
                res.status(404).json({ error: 'Opponent batter not found' });
                return;
            }

            res.status(200).json({ report });
        } catch (error) {
            next(error);
        }
    }

    async addNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const batterId = req.params.batterId as string;
            const { note_text } = req.body;
            const userId = req.user?.id;

            if (!note_text) {
                res.status(400).json({ error: 'note_text is required' });
                return;
            }

            // Get or create profile for this batter
            const report = await scoutingService.getScoutingReport(batterId);
            if (!report) {
                res.status(404).json({ error: 'Opponent batter not found' });
                return;
            }

            const note = await scoutingService.addNote(report.profile.id, note_text, userId);
            res.status(201).json({ note, message: 'Note added successfully' });
        } catch (error) {
            next(error);
        }
    }

    async updateNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const noteId = req.params.noteId as string;
            const { note_text } = req.body;

            if (!note_text) {
                res.status(400).json({ error: 'note_text is required' });
                return;
            }

            const note = await scoutingService.updateNote(noteId, note_text);
            res.status(200).json({ note, message: 'Note updated successfully' });
        } catch (error) {
            next(error);
        }
    }

    async deleteNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const noteId = req.params.noteId as string;
            await scoutingService.deleteNote(noteId);
            res.status(200).json({ message: 'Note deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    async recalculateTendencies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const batterId = req.params.batterId as string;

            // Get profile for this batter
            const report = await scoutingService.getScoutingReport(batterId);
            if (!report) {
                res.status(404).json({ error: 'Opponent batter not found' });
                return;
            }

            const tendencies = await scoutingService.calculateTendencies(report.profile.id);
            res.status(200).json({ tendencies, message: 'Tendencies recalculated' });
        } catch (error) {
            next(error);
        }
    }
}

export default new ScoutingController();
