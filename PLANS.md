# Development Plans

## Tomorrow's Tasks

### 1) In-Play Recording with Baseball Diamond
- Add a baseball diamond visualization when recording an "in-play" result
- Show hit location on the diamond with different line styles:
  - **Curved line**: Fly ball
  - **Straight line**: Line drive
  - **Squiggly line**: Ground ball
- Allow user to click/tap where the ball was hit
- Record the play result:
  - Out (flyout, groundout, lineout)
  - Hit (single, double, triple, home run)
  - Error
  - Fielder's choice

### 2) Pitcher Stats Tabular Format
- Refactor PitcherStats component to use tabular layout
- Table columns:
  | Pitch Type | Ball | Strike | % | Top Vel | Avg Vel |
  |------------|------|--------|---|---------|---------|
  | FB         | 3    | 7      | 70| 92      | 89.5    |
  | SL         | 2    | 4      | 67| 84      | 82.3    |

### 3) Out Tracking and Inning Advancement
- When an at-bat results in an out, properly record it
- Track outs in the current inning (0, 1, 2, 3)
- When 3 outs are recorded:
  - End the current half-inning
  - Advance to the next half-inning (top -> bottom, or bottom -> top of next inning)
  - Reset the out counter
  - If moving to bottom of inning, swap offense/defense roles

### 4) Pitcher Heat Zones
- Visualize zones where a pitcher excels at throwing strikes
- Heat map overlay on strike zone showing:
  - High strike percentage zones (green/hot)
  - Low strike percentage zones (red/cold)
- Could be based on historical data or current game data
- Helps identify pitcher strengths for game strategy

### 5) Desired Pitch Location Tracking
- Add a new data point: **desired pitch location** (separate from actual result)
- Purpose: Track whether the pitcher located his pitch correctly
- Compare intended vs actual location
- Metrics to derive:
  - Location accuracy percentage
  - Identify pitcher's strengths (where they hit their spots)
  - Identify weaknesses (where they miss their spots)

### 6) Pitch Flow Redesign
- Reorder the pitch entry workflow:
  1. Select **pitch type** first
  2. Select **desired location** (where pitcher intended to throw)
  3. Record **actual pitch location** (where it ended up)
  4. Enter **velocity**
  5. Record **result** (ball, strike, in play, etc.)
- More natural flow that matches how a coach thinks about pitching

### 7) Pitcher Profile - Game Logs
- Add historical game logs to pitcher profile page
- Per-game statistics:
  - Batters faced
  - Total pitches
  - Balls / Strikes / Strike %
  - Breakdown by pitch type:
    - Count thrown
    - Strike %
    - Desired location accuracy %
    - Top/Avg velocity
- Ability to drill down into individual games

### 8) Batter Scouting Notes
- Keep notes on each batter's tendencies
- Auto-detect patterns:
  - "Chases low and away breaking balls"
  - "Doesn't swing at borderline pitches"
  - "Aggressive early in count"
  - "Takes first pitch"
- Track swings on pitches outside the zone
- Track takes on pitches inside the zone
- Build a scouting report over time
- Display notes when batter comes up

### 9) Mobile App with Expo
- Create a new `packages/mobile` package using Expo
- Share business logic and types from existing packages
- Target platforms:
  - iOS (Apple App Store)
  - Android (Google Play Store)
- Features to prioritize for mobile:
  - Live game pitch tracking (primary use case)
  - Quick pitch entry optimized for touch
  - Offline support for games without connectivity
  - Sync when back online
- Consider React Native Paper or similar for UI components

### 10) Roster Import from File
- Support importing roster from common file formats:
  - CSV (comma-separated values)
  - Excel (.xlsx)
  - JSON
- Required fields mapping:
  - First name, Last name
  - Jersey number
  - Position
  - Bats/Throws
- Optional fields:
  - Pitch types (for pitchers)
- Validation and error reporting for bad data
- Preview before confirming import
- Option to merge with existing roster or replace

### 11) Team Customization - Logo & Colors
- Allow team logo upload when creating/editing team:
  - Support common image formats (PNG, JPG, SVG)
  - Auto-resize/crop for consistency
  - Display in headers, game screens, reports
- Team color selection:
  - Primary color
  - Secondary color
  - Accent color
- Apply team colors as app theme when viewing that team:
  - Headers and navigation
  - Buttons and accents
  - Charts and visualizations
- Store colors in team record
- Consider color contrast for accessibility
