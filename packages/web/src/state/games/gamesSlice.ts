import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Game, Team, Player, AtBat, Pitch, Play } from '../../types';
import { gamesApi } from './api/gamesApi';

interface GameState {
    game: Game;
    homeTeam: Team;
    awayTeam: Team;
    currentPitcher?: Player;
    currentBatter?: Player;
}

interface GamesSliceState {
    games: Game[];
    selectedGame: Game | null;
    currentGameState: GameState | null;
    currentAtBat: AtBat | null;
    pitches: Pitch[];
    loading: boolean;
    gameStateLoading: boolean;
    error: string | null;
}

const initialState: GamesSliceState = {
    games: [],
    selectedGame: null,
    currentGameState: null,
    currentAtBat: null,
    pitches: [],
    loading: false,
    gameStateLoading: false,
    error: null,
};

// Async Thunks
export const fetchAllGames = createAsyncThunk('games/fetchAll', async (_, { rejectWithValue }) => {
    try {
        return await gamesApi.getAllGames();
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to fetch games');
    }
});

export const fetchGameById = createAsyncThunk('games/fetchById', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.getGameById(gameId);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to fetch game');
    }
});

export const createGame = createAsyncThunk('games/create', async (gameData: Partial<Game>, { rejectWithValue }) => {
    try {
        return await gamesApi.createGame(gameData);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to create game');
    }
});

export const updateGame = createAsyncThunk(
    'games/update',
    async ({ id, data }: { id: string; data: Partial<Game> }, { rejectWithValue }) => {
        try {
            return await gamesApi.updateGame(id, data);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to update game');
        }
    }
);

export const deleteGame = createAsyncThunk('games/delete', async (gameId: string, { rejectWithValue }) => {
    try {
        await gamesApi.deleteGame(gameId);
        return gameId;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to delete game');
    }
});

export const startGame = createAsyncThunk('games/start', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.startGame(gameId);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to start game');
    }
});

export const endGame = createAsyncThunk(
    'games/end',
    async ({ gameId, finalData }: { gameId: string; finalData: { homeScore: number; awayScore: number } }, { rejectWithValue }) => {
        try {
            return await gamesApi.endGame(gameId, finalData);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to end game');
        }
    }
);

export const advanceInning = createAsyncThunk('games/advanceInning', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.advanceInning(gameId);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to advance inning');
    }
});

export const fetchCurrentGameState = createAsyncThunk('games/fetchCurrentState', async (gameId: string, { rejectWithValue }) => {
    try {
        return await gamesApi.getCurrentGameState(gameId);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to fetch game state');
    }
});

export const createAtBat = createAsyncThunk('games/createAtBat', async (atBatData: Partial<AtBat>, { rejectWithValue }) => {
    try {
        return await gamesApi.createAtBat(atBatData);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to create at-bat');
    }
});

export const updateAtBat = createAsyncThunk(
    'games/updateAtBat',
    async ({ id, data }: { id: string; data: Partial<AtBat> }, { rejectWithValue }) => {
        try {
            return await gamesApi.updateAtBat(id, data);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to update at-bat');
        }
    }
);

export const logPitch = createAsyncThunk('games/logPitch', async (pitchData: Partial<Pitch>, { rejectWithValue }) => {
    try {
        return await gamesApi.logPitch(pitchData);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to log pitch');
    }
});

export const recordPlay = createAsyncThunk('games/recordPlay', async (playData: Partial<Play>, { rejectWithValue }) => {
    try {
        return await gamesApi.recordPlay(playData);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to record play');
    }
});

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
            state.pitches = [];
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

        // Update Game
        builder
            .addCase(updateGame.fulfilled, (state, action) => {
                const index = state.games.findIndex((g) => g.id === action.payload.id);
                if (index !== -1) {
                    state.games[index] = action.payload;
                }
                if (state.selectedGame?.id === action.payload.id) {
                    state.selectedGame = action.payload;
                }
            })
            .addCase(updateGame.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Delete Game
        builder
            .addCase(deleteGame.fulfilled, (state, action) => {
                state.games = state.games.filter((g) => g.id !== action.payload);
                if (state.selectedGame?.id === action.payload) {
                    state.selectedGame = null;
                }
            })
            .addCase(deleteGame.rejected, (state, action) => {
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
    },
});

export const { clearGamesError, clearSelectedGame, setSelectedGame, setCurrentAtBat, addPitch, clearPitches } = gamesSlice.actions;

export default gamesSlice.reducer;
