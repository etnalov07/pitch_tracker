import { query, transaction } from '../config/database';
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
    const { name, organization, age_group, season, organization_id } = teamData;

    if (!name) {
      throw new Error('Team name is required');
    }

    return await transaction(async (client) => {
      const team_id = uuidv4();
      const result = await client.query(
        `INSERT INTO teams (id, name, owner_id, organization, age_group, season, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [team_id, name, userId, organization, age_group, season, organization_id || null]
      );

      // Also create team_members entry for owner
      await client.query(
        `INSERT INTO team_members (id, team_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [uuidv4(), team_id, userId]
      );

      return result.rows[0];
    });
  }

  async getTeamById(team_id: string): Promise<Team | null> {
    const result = await query('SELECT * FROM teams WHERE id = $1', [team_id]);
    return result.rows[0] || null;
  }

  async getTeamsByOwner(userId: string): Promise<Team[]> {
    // Query via team_members to include teams where user has any role,
    // plus legacy owner_id for backwards compatibility
    const result = await query(
      `SELECT DISTINCT t.*, tm.role as user_role
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
       WHERE t.owner_id = $1 OR tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getAllTeams(): Promise<Team[]> {
    const result = await query('SELECT * FROM teams ORDER BY name ASC');
    return result.rows;
  }

  async searchTeams(searchQuery: string, limit = 20): Promise<Team[]> {
    const result = await query(
      `SELECT id, name, organization, age_group, season, logo_path, primary_color
       FROM teams
       WHERE LOWER(name) LIKE LOWER($1)
       ORDER BY name
       LIMIT $2`,
      [`%${searchQuery}%`, limit]
    );
    return result.rows;
  }

  private async verifyTeamAccess(team_id: string, userId: string): Promise<Team> {
    const team = await this.getTeamById(team_id);
    if (!team) {
      throw new Error('Team not found');
    }
    // Check legacy owner_id OR team_members role
    if (team.owner_id === userId) return team;

    const memberResult = await query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2 AND role IN ('owner', 'coach')`,
      [team_id, userId]
    );
    if (memberResult.rows.length > 0) return team;

    throw new Error('Unauthorized: You do not have access to this team');
  }

  async updateTeam(team_id: string, userId: string, updates: Partial<Team>): Promise<Team> {
    await this.verifyTeamAccess(team_id, userId);

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
    await this.verifyTeamAccess(team_id, userId);
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
    await this.verifyTeamAccess(team_id, userId);

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
    const team = await this.verifyTeamAccess(team_id, userId);

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