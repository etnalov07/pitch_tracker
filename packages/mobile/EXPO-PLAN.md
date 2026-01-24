# Expo Mobile App - Remaining Plan

## Completed (Phase 1: Foundation)

- [x] Initialize Expo project with TypeScript
- [x] Configure Expo Router navigation structure
- [x] Set up React Native Paper theme (matching web colors)
- [x] Integrate @pitch-tracker/shared types
- [x] Set up API client with axios and SecureStore
- [x] Implement auth Redux slice with SecureStore
- [x] Create login and register screens
- [x] Create placeholder game screens
- [x] Configure tablet support (`supportsTablet: true`, `orientation: default`)
- [x] Create `useDeviceType` hook for phone/tablet detection

---

## Phase 2: LiveGame Core (Critical)

The primary use case - live pitch tracking during games.

### Components to Build

1. **StrikeZone.tsx** (`src/components/live/`)
   - Port from web's `packages/web/src/components/live/StrikeZone/StrikeZone.tsx`
   - Use `react-native-svg` instead of browser SVG
   - Implement touch handlers with `PanResponder` or `GestureHandler`
   - Larger touch targets (44pt minimum per Apple HIG)
   - Support both target location (optional) and actual pitch location
   - Show previous pitches with color-coded markers
   - Add haptic feedback on selection (`expo-haptics`)

2. **PitchTypeGrid.tsx** (`src/components/live/`)
   - Grid of pitch type buttons (fastball, curveball, slider, etc.)
   - Filter to show only pitcher's available pitch types
   - Highlight selected pitch type

3. **ResultButtons.tsx** (`src/components/live/`)
   - Ball, Called Strike, Swinging Strike, Foul, In Play buttons
   - Large touch targets for quick entry
   - Color-coded (gray, green, red, yellow, blue)

4. **BaseballDiamond.tsx** (`src/components/live/`)
   - Port from web for in-play hit location recording
   - Field visualization with positions
   - Hit type selector (fly ball, line drive, ground ball)
   - Trajectory visualization

5. **PitcherSelector.tsx** (`src/components/game/`)
   - Bottom sheet modal for selecting current pitcher
   - Show "In Game" vs "Available" pitchers
   - Display pitcher stats

6. **BatterSelector.tsx** (`src/components/game/`)
   - Bottom sheet modal for selecting opponent batter
   - Show batting order (1-9)
   - Highlight "Next Up" batter

7. **GameHeader.tsx** (`src/components/live/`)
   - Score display
   - Current inning and half (top/bottom)
   - Out indicators
   - Pitcher/batter info

### LiveGame Screen Updates

Update `app/game/[id]/live.tsx`:
- Implement 5-step pitch entry workflow
- Connect to games Redux slice
- Add real pitcher/batter selection
- Implement pitch logging API calls
- Handle inning advancement
- Responsive layout: split-view on tablet landscape, stacked on phone

### Redux State (Games Slice)

Create `src/state/games/gamesSlice.ts`:
- Port from `packages/web/src/state/games/gamesSlice.ts`
- Thunks: fetchGameById, startGame, logPitch, createAtBat, updateAtBat, advanceInning
- State: games, selectedGame, currentAtBat, pitches, loading, error

### API Services

Create `src/services/gameService.ts`:
- Port from `packages/web/src/state/games/api/gamesApi.ts`
- All game-related API calls

---

## Phase 3: Offline Support (High Priority)

Enable pitch tracking without network connectivity.

### SQLite Setup

1. **Schema** (`src/db/schema.ts`)
   ```sql
   CREATE TABLE pending_actions (
     id TEXT PRIMARY KEY,
     action_type TEXT NOT NULL,  -- 'LOG_PITCH', 'CREATE_ATBAT', etc.
     payload TEXT NOT NULL,       -- JSON serialized
     created_at INTEGER NOT NULL,
     retry_count INTEGER DEFAULT 0
   );

   CREATE TABLE cached_games (
     id TEXT PRIMARY KEY,
     data TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   );
   ```

2. **Offline Slice** (`src/state/offline/offlineSlice.ts`)
   - Track online/offline status
   - Queue pending actions when offline
   - Manage sync state

3. **Sync Service** (`src/services/offlineService.ts`)
   - Save pending actions to SQLite
   - Sync when back online
   - Retry failed actions with exponential backoff

4. **Network Listener**
   - Use `expo-network` to detect connectivity changes
   - Trigger sync when coming back online

5. **UI Indicators**
   - Show sync status in header/settings
   - Indicate pending actions count
   - Show "Offline Mode" banner when disconnected

---

## Phase 4: Supporting Features (Medium Priority)

### Dashboard Enhancements

Update `app/(tabs)/index.tsx`:
- Fetch and display active games
- Show recent games list
- Display team count
- Quick actions (Start Game, View Teams)

### Teams Slice

Create `src/state/teams/teamsSlice.ts`:
- Port from web
- Thunks: fetchAllTeams, fetchTeamById, fetchTeamRoster

### Teams Screen

Update `app/(tabs)/teams.tsx`:
- List user's teams with logos
- Navigate to team details
- Create new team

### Team Detail Screen

Update `app/team/[id]/index.tsx`:
- Team info and roster
- List of games
- Navigate to pitcher profiles
- Start new game button

### PitcherStats Component

Create `src/components/live/PitcherStats.tsx`:
- Real-time pitcher performance display
- Total pitches, strike %, velocity stats
- Breakdown by pitch type

### BatterHistory Component

Create `src/components/live/BatterHistory.tsx`:
- Historical performance vs pitcher
- Recent at-bat details
- Scouting notes

---

## Phase 5: Polish & Deploy (Medium Priority)

### UI/UX Polish

1. **Haptic Feedback**
   - Add to all buttons and interactions
   - Different feedback for different actions

2. **Loading States**
   - Skeleton screens for data loading
   - Pull-to-refresh on lists

3. **Error Handling**
   - Toast notifications for errors
   - Retry buttons for failed operations

4. **Animations**
   - Smooth transitions between screens
   - Pitch marker animations

### Build Configuration

1. **EAS Build Setup** (`eas.json`)
   ```json
   {
     "build": {
       "development": { "developmentClient": true },
       "preview": { "distribution": "internal" },
       "production": { "autoIncrement": true }
     }
   }
   ```

2. **Environment Variables**
   - Configure API URL for dev/staging/production
   - Use `expo-constants` for runtime config

3. **App Icons & Splash**
   - Create proper app icons (1024x1024)
   - Design splash screen

### Deployment

1. **TestFlight (iOS)**
   - `eas build --platform ios`
   - `eas submit --platform ios`

2. **Play Store (Android)**
   - `eas build --platform android`
   - `eas submit --platform android`

---

## Key Files Reference

| Purpose | Web File to Reference |
|---------|----------------------|
| All types | `packages/shared/src/index.ts` |
| LiveGame logic | `packages/web/src/pages/LiveGame/LiveGame.tsx` |
| StrikeZone SVG | `packages/web/src/components/live/StrikeZone/StrikeZone.tsx` |
| Games slice | `packages/web/src/state/games/gamesSlice.ts` |
| Games API | `packages/web/src/state/games/api/gamesApi.ts` |
| API config | `packages/web/src/services/api.ts` |

---

## Notes

- Mobile is excluded from npm workspaces to prevent React duplication
- Shared package is linked via `file:../shared`
- Metro config watches only the shared package folder
- Use `npx expo start --clear` when making config changes
