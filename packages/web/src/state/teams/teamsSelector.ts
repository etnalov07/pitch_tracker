import { RootState } from "../store";

export const getTeams = (state: RootState) => state.teams;

export const getTeamRoster = (state: RootState) => {
    return state.teams.roster || [];
}