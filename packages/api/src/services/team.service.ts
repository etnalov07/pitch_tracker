import { query } from '../config/database';
import { Team } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { deleteLogoFiles } from '../utils/imageProcessor';

export interface TeamBrandingUpdate {
    logo_path?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
}

export class TeamService {
  async createTeam(userId: string, teamData: Partial<Team>): Promise<Team> {
    const { name, organization, age_group, season } = teamData;

    if (!name) {
      throw new Error('Team name is required');
    }

    const team_id = uuidv4();
    const result = await query(
      `INSERT INTO teams (id, name, owner_id, organization, age_group, season)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [team_id, name, userId, organization, age_group, season]
    );

    return result.rows[0];
  }

  async getTeamById(team_id: string): Promise<Team | null> {
    const result = await query('SELECT * FROM teams WHERE id = $1', [team_id]);
    return result.rows[0] || null;
  }

  async getTeamsByOwner(userId: string): Promise<Team[]> {
    const result = await query(
      'SELECT * FROM teams WHERE owner_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getAllTeams(): Promise<Team[]> {
    const result = await query('SELECT * FROM teams ORDER BY name ASC');
    return result.rows;
  }

  async updateTeam(team_id: string, userId: string, updates: Partial<Team>): Promise<Team> {
    // Verify ownership
    const team = await this.getTeamById(team_id);
    if (!team) {
      throw new Error('Team not found');
    }
    if (team.owner_id !== userId) {
      throw new Error('Unauthorized: You do not own this team');
    }

    const { name, organization, age_group, season } = updates;

    const result = await query(
      `UPDATE teams 
       SET name = COALESCE($1, name),
           organization = COALESCE($2, organization),
           age_group = COALESCE($3, age_group),
           season = COALESCE($4, season)
       WHERE id = $5
       RETURNING *`,
      [name, organization, age_group, season, team_id]
    );

    return result.rows[0];
  }

  async deleteTeam(team_id: string, userId: string): Promise<void> {
    // Verify ownership
    const team = await this.getTeamById(team_id);
    if (!team) {
      throw new Error('Team not found');
    }
    if (team.owner_id !== userId) {
      throw new Error('Unauthorized: You do not own this team');
    }

    await query('DELETE FROM teams WHERE id = $1', [team_id]);
  }

  async getTeamWithPlayers(team_id: string): Promise<any> {
    const teamResult = await query('SELECT * FROM teams WHERE id = $1', [team_id]);
    if (teamResult.rows.length === 0) {
      throw new Error('Team not found');
    }

    const playersResult = await query(
      'SELECT * FROM players WHERE team_id = $1 AND is_active = true ORDER BY jersey_number',
      [team_id]
    );

    return {
      ...teamResult.rows[0],
      players: playersResult.rows,
    };
  }

  async updateTeamBranding(
    team_id: string,
    userId: string,
    updates: TeamBrandingUpdate
  ): Promise<Team> {
    // Verify ownership
    const team = await this.getTeamById(team_id);
    if (!team) {
      throw new Error('Team not found');
    }
    if (team.owner_id !== userId) {
      throw new Error('Unauthorized: You do not own this team');
    }

    const { logo_path, primary_color, secondary_color, accent_color } = updates;

    const result = await query(
      `UPDATE teams
       SET logo_path = COALESCE($1, logo_path),
           primary_color = COALESCE($2, primary_color),
           secondary_color = COALESCE($3, secondary_color),
           accent_color = COALESCE($4, accent_color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [logo_path, primary_color, secondary_color, accent_color, team_id]
    );

    return result.rows[0];
  }

  async updateTeamColors(
    team_id: string,
    userId: string,
    colors: { primary_color?: string; secondary_color?: string; accent_color?: string }
  ): Promise<Team> {
    return this.updateTeamBranding(team_id, userId, colors);
  }

  async deleteLogo(team_id: string, userId: string): Promise<Team> {
    // Verify ownership
    const team = await this.getTeamById(team_id);
    if (!team) {
      throw new Error('Team not found');
    }
    if (team.owner_id !== userId) {
      throw new Error('Unauthorized: You do not own this team');
    }

    // Delete logo files from filesystem
    if (team.logo_path) {
      deleteLogoFiles(team_id);
    }

    const result = await query(
      `UPDATE teams
       SET logo_path = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [team_id]
    );

    return result.rows[0];
  }
}

export default new TeamService();