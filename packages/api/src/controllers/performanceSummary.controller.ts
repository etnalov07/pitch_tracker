import { Response, NextFunction } from 'express';
import { AuthRequest, SummarySourceType } from '../types';
import performanceSummaryService from '../services/performanceSummary.service';
import { query } from '../config/database';

export class PerformanceSummaryController {
    async getOrGenerateSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const sourceType = req.params.sourceType as string;
            const sourceId = req.params.sourceId as string;

            if (sourceType !== 'game' && sourceType !== 'bullpen') {
                res.status(400).json({ error: 'sourceType must be "game" or "bullpen"' });
                return;
            }

            // Try to fetch existing summary
            let summary = await performanceSummaryService.getSummary(sourceType, sourceId);
            if (summary) {
                res.status(200).json({ summary });
                return;
            }

            // Need to generate — resolve pitcher_id and team_id from the source
            let pitcherId: string;
            let teamId: string;

            if (sourceType === 'game') {
                // Find the primary pitcher for this game (most pitches thrown)
                const result = await query(
                    `SELECT p.pitcher_id, g.home_team_id as team_id
                     FROM pitches p
                     JOIN games g ON p.game_id = g.id
                     WHERE p.game_id = $1
                     GROUP BY p.pitcher_id, g.home_team_id
                     ORDER BY COUNT(*) DESC LIMIT 1`,
                    [sourceId]
                );
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'No pitches found for this game' });
                    return;
                }
                pitcherId = result.rows[0].pitcher_id;
                teamId = result.rows[0].team_id;
            } else {
                const result = await query('SELECT pitcher_id, team_id FROM bullpen_sessions WHERE id = $1', [sourceId]);
                if (result.rows.length === 0) {
                    res.status(404).json({ error: 'Bullpen session not found' });
                    return;
                }
                pitcherId = result.rows[0].pitcher_id;
                teamId = result.rows[0].team_id;
            }

            summary = await performanceSummaryService.generateSummary(sourceType, sourceId, pitcherId, teamId);
            res.status(200).json({ summary });
        } catch (error) {
            next(error);
        }
    }

    async getSummariesByPitcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const pitcherId = req.params.pitcherId as string;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await performanceSummaryService.getSummariesByPitcher(pitcherId, limit, offset);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async getBatterBreakdown(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const breakdown = await performanceSummaryService.getBatterBreakdown(gameId as string);
            res.status(200).json({ breakdown });
        } catch (error) {
            next(error);
        }
    }

    async getMyTeamBatterBreakdown(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const breakdown = await performanceSummaryService.getMyTeamBatterBreakdown(gameId as string);
            res.status(200).json({ breakdown });
        } catch (error) {
            next(error);
        }
    }

    async regenerateNarrative(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const summary = await performanceSummaryService.regenerateNarrative(id);

            if (!summary) {
                res.status(404).json({ error: 'Summary not found' });
                return;
            }

            res.status(200).json({ summary });
        } catch (error) {
            next(error);
        }
    }
}

export default new PerformanceSummaryController();
