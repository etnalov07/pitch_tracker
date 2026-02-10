import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    Game,
    Team,
    Player,
    AtBat,
    Pitch,
    Play,
    Inning,
    GamePitcherWithPlayer,
    OpponentLineupPlayer,
    BaseRunners,
    BaserunnerEvent,
    BaserunnerEventType,
    RunnerBase,
} from '@pitch-tracker/shared';
import { gamesApi, GameState } from './api/gamesApi';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message;
    return fallback;
};

interface GamesSliceState {
    games: Game[];
    selectedGame: Game | null;
    currentGameState: GameState | null;
    currentAtBat: AtBat | null;
    currentInning: Inning | null;
    gamePitchers: GamePitcherWithPlayer[];
    opponentLineup: OpponentLineupPlayer[];
    pitches: Pitch[];
    baseRunners: BaseRunners;
    loading: boolean;
    gameStateLoading: boolean;
    error: string | null;
}

const initialState: GamesSliceState = {
    games: [],
    selectedGame: null,
    currentGameState: null,
    currentAtBat: null,
    currentInning: null,
    gamePitchers: [],
    opponentLineup: [],
    pitches: [],
    baseRunners: { first: false, second: false, third: false },
    loading: false,
    gameStateLoading: false,
    error: null,
};

// Async Thunks
export const fetchAllGames = createAsyncThunk('games/fetchAll', async (_, { rejectWithValue }) => {
    try {
        return await gamesApi.getAllGames();
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch games'));
    }
});

export const fetchGameById = createAsyncThunk('games/fetchById', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.getGameById(gameId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch game'));
    }
});

export const createGame = createAsyncThunk('games/create', async (gameData: Partial<Game>, { rejectWithValue }) => {
    try {
        return await gamesApi.createGame(gameData);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to create game'));
    }
});

export const startGame = createAsyncThunk('games/start', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.startGame(gameId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to start game'));
    }
});

export const endGame = createAsyncThunk(
    'games/end',
    async (
        { gameId, finalData }: { gameId: string; finalData: { home_score: number; away_score: number } },
        { rejectWithValue }
    ) => {
        try {
            return await gamesApi.endGame(gameId, finalData);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to end game'));
        }
    }
);

export const advanceInning = createAsyncThunk('games/advanceInning', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.advanceInning(gameId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to advance inning'));
    }
});

export const fetchCurrentGameState = createAsyncThunk('games/fetchCurrentState', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.getCurrentGameState(gameId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch game state'));
    }
});

export const createAtBat = createAsyncThunk('games/createAtBat', async (atBatData: Partial<AtBat>, { rejectWithValue }) => {
    try {
        return await gamesApi.createAtBat(atBatData);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to create at-bat'));
    }
});

export const updateAtBat = createAsyncThunk(
    'games/updateAtBat',
    async ({ id, data }: { id: string; data: Partial<AtBat> }, { rejectWithValue }) => {
        try {
            return await gamesApi.updateAtBat(id, data);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update at-bat'));
        }
    }
);

export const logPitch = createAsyncThunk('games/logPitch', async (pitchData: Partial<Pitch>, { rejectWithValue }) => {
    try {
        return await gamesApi.logPitch(pitchData);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to log pitch'));
    }
});

export const recordPlay = createAsyncThunk('games/recordPlay', async (playData: Partial<Play>, { rejectWithValue }) => {
    try {
        return await gamesApi.recordPlay(playData);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to record play'));
    }
});

export const fetchCurrentInning = createAsyncThunk('games/fetchCurrentInning', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.getCurrentInning(gameId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch current inning'));
    }
});

export const fetchGamePitchers = createAsyncThunk('games/fetchGamePitchers', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.getGamePitchers(gameId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch game pitchers'));
    }
});

export const changePitcher = createAsyncThunk(
    'games/changePitcher',
    async (
        { gameId, playerId, inningEntered }: { gameId: string; playerId: string; inningEntered: number },
        { rejectWithValue }
    ) => {
        try {
            return await gamesApi.changePitcher(gameId, playerId, inningEntered);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to change pitcher'));
        }
    }
);

export const fetchOpponentLineup = createAsyncThunk('games/fetchOpponentLineup', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.getOpponentLineup(gameId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch opponent lineup'));
    }
});

export const createOpponentLineup = createAsyncThunk(
    'games/createOpponentLineup',
    async (
        {
            gameId,
            players,
        }: {
            gameId: string;
            players: {
                player_name: string;
                batting_order: number;
                position?: string;
                bats: 'R' | 'L' | 'S';
                is_starter: boolean;
            }[];
        },
        { rejectWithValue }
    ) => {
        try {
            return await gamesApi.createOpponentLineupBulk(gameId, players);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create opponent lineup'));
        }
    }
);

export const fetchTeamPitcherRoster = createAsyncThunk(
    'games/fetchTeamPitcherRoster',
    async (teamId: string, { rejectWithValue }) => {
        try {
            return await gamesApi.getTeamPitchers(teamId);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch team pitchers'));
        }
    }
);

export const updateBaseRunners = createAsyncThunk(
    'games/updateBaseRunners',
    async ({ gameId, baseRunners }: { gameId: string; baseRunners: BaseRunners }, { rejectWithValue }) => {
        try {
            const game = await gamesApi.updateBaseRunners(gameId, baseRunners);
            return { game, baseRunners };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update base runners'));
        }
    }
);

export const fetchBaseRunners = createAsyncThunk('games/fetchBaseRunners', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.getBaseRunners(gameId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch base runners'));
    }
});

export const recordBaserunnerEvent = createAsyncThunk(
    'games/recordBaserunnerEvent',
    async (
        eventData: {
            game_id: string;
            inning_id: string;
            at_bat_id?: string;
            event_type: BaserunnerEventType;
            runner_base: RunnerBase;
            outs_before: number;
        },
        { rejectWithValue }
    ) => {
        try {
            return await gamesApi.recordBaserunnerEvent(eventData);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to record baserunner event'));
        }
    }
);

const gamesSlice = createSlice({
    name: 'games',
    initialState,
    reducers: {
        clearGamesError: (state) => {
            state.error = null;
        },
        clearSelectedGame: (state) => {
            state.selectedGame = null;
            state.currentGameState = null;
            state.currentAtBat = null;
            state.currentInning = null;
            state.gamePitchers = [];
            state.opponentLineup = [];
            state.pitches = [];
            state.baseRunners = { first: false, second: false, third: false };
        },
        setSelectedGame: (state, action: PayloadAction<Game>) => {
            state.selectedGame = action.payload;
        },
        setCurrentAtBat: (state, action: PayloadAction<AtBat | null>) => {
            state.currentAtBat = action.payload;
        },
        addPitch: (state, action: PayloadAction<Pitch>) => {
            state.pitches.push(action.payload);
        },
        clearPitches: (state) => {
            state.pitches = [];
        },
        setBaseRunners: (state, action: PayloadAction<BaseRunners>) => {
            state.baseRunners = action.payload;
        },
        clearBaseRunners: (state) => {
            state.baseRunners = { first: false, second: false, third: false };
        },
    },
    extraReducers: (builder) => {
        // Fetch All Games
        builder
            .addCase(fetchAllGames.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllGames.fulfilled, (state, action) => {
                state.loading = false;
                state.games = action.payload;
            })
            .addCase(fetchAllGames.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Fetch Game By Id
        builder
            .addCase(fetchGameById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchGameById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedGame = action.payload;
            })
            .addCase(fetchGameById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Create Game
        builder
            .addCase(createGame.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createGame.fulfilled, (state, action) => {
                state.loading = false;
                state.games.push(action.payload);
                state.selectedGame = action.payload;
            })
            .addCase(createGame.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Start Game
        builder
            .addCase(startGame.fulfilled, (state, action) => {
                const index = state.games.findIndex((g) => g.id === action.payload.id);
                if (index !== -1) {
                    state.games[index] = action.payload;
                }
                if (state.selectedGame?.id === action.payload.id) {
                    state.selectedGame = action.payload;
                }
            })
            .addCase(startGame.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // End Game
        builder
            .addCase(endGame.fulfilled, (state, action) => {
                const index = state.games.findIndex((g) => g.id === action.payload.id);
                if (index !== -1) {
                    state.games[index] = action.payload;
                }
                if (state.selectedGame?.id === action.payload.id) {
                    state.selectedGame = action.payload;
                }
            })
            .addCase(endGame.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Advance Inning
        builder
            .addCase(advanceInning.fulfilled, (state, action) => {
                const index = state.games.findIndex((g) => g.id === action.payload.id);
                if (index !== -1) {
                    state.games[index] = action.payload;
                }
                if (state.selectedGame?.id === action.payload.id) {
                    state.selectedGame = action.payload;
                }
            })
            .addCase(advanceInning.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Fetch Current Game State
        builder
            .addCase(fetchCurrentGameState.pending, (state) => {
                state.gameStateLoading = true;
                state.error = null;
            })
            .addCase(fetchCurrentGameState.fulfilled, (state, action) => {
                state.gameStateLoading = false;
                state.currentGameState = action.payload;
                state.selectedGame = action.payload.game;
            })
            .addCase(fetchCurrentGameState.rejected, (state, action) => {
                state.gameStateLoading = false;
                state.error = action.payload as string;
            });

        // Create At-Bat
        builder
            .addCase(createAtBat.fulfilled, (state, action) => {
                state.currentAtBat = action.payload;
                state.pitches = [];
            })
            .addCase(createAtBat.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Update At-Bat
        builder
            .addCase(updateAtBat.fulfilled, (state, action) => {
                state.currentAtBat = action.payload;
            })
            .addCase(updateAtBat.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Log Pitch
        builder
            .addCase(logPitch.fulfilled, (state, action) => {
                state.pitches.push(action.payload);
            })
            .addCase(logPitch.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Record Play
        builder.addCase(recordPlay.rejected, (state, action) => {
            state.error = action.payload as string;
        });

        // Fetch Current Inning
        builder.addCase(fetchCurrentInning.fulfilled, (state, action) => {
            state.currentInning = action.payload;
        });

        // Fetch Game Pitchers
        builder.addCase(fetchGamePitchers.fulfilled, (state, action) => {
            state.gamePitchers = action.payload;
        });

        // Change Pitcher
        builder.addCase(changePitcher.fulfilled, (state, action) => {
            // Add new pitcher to list, mark previous as exited
            const existing = state.gamePitchers.find((p) => !p.inning_exited && p.id !== action.payload.id);
            if (existing) {
                existing.inning_exited = action.payload.inning_entered;
            }
            const idx = state.gamePitchers.findIndex((p) => p.id === action.payload.id);
            if (idx !== -1) {
                state.gamePitchers[idx] = action.payload;
            } else {
                state.gamePitchers.push(action.payload);
            }
        });

        // Fetch Opponent Lineup
        builder.addCase(fetchOpponentLineup.fulfilled, (state, action) => {
            state.opponentLineup = action.payload;
        });

        // Create Opponent Lineup
        builder.addCase(createOpponentLineup.fulfilled, (state, action) => {
            state.opponentLineup = action.payload;
        });

        // Update Base Runners
        builder.addCase(updateBaseRunners.fulfilled, (state, action) => {
            state.baseRunners = action.payload.baseRunners;
            if (state.selectedGame?.id === action.payload.game.id) {
                state.selectedGame = action.payload.game;
            }
        });

        // Fetch Base Runners
        builder.addCase(fetchBaseRunners.fulfilled, (state, action) => {
            state.baseRunners = action.payload;
        });

        // Record Baserunner Event (updates happen on server, refetch runners)
        builder.addCase(recordBaserunnerEvent.fulfilled, (state, action) => {
            // The server already removed the runner, update local state
            const base = action.payload.runner_base as keyof BaseRunners;
            state.baseRunners[base] = false;
        });
    },
});

export const {
    clearGamesError,
    clearSelectedGame,
    setSelectedGame,
    setCurrentAtBat,
    addPitch,
    clearPitches,
    setBaseRunners,
    clearBaseRunners,
} = gamesSlice.actions;

export default gamesSlice.reducer;
