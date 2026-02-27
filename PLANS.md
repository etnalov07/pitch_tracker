# Development Plans

## Tomorrow's Tasks

### ~~1) In-Play Recording with Baseball Diamond~~ ✅ DONE
- ~~Add a baseball diamond visualization when recording an "in-play" result~~
- ~~Show hit location on the diamond with different line styles:~~
  - ~~**Curved line**: Fly ball~~
  - ~~**Straight line**: Line drive~~
  - ~~**Squiggly line**: Ground ball~~
- ~~Allow user to click/tap where the ball was hit~~
- ~~Record the play result:~~
  - ~~Out (flyout, groundout, lineout, popout, DP, sac fly, FC)~~
  - ~~Hit (single, double, triple, home run)~~
  - ~~Error~~
- Interactive SVG field with position labels (LF, CF, RF, SS, 2B, 3B, 1B)
- Hit type selector (fly ball, line drive, ground ball)
- Visual trajectory from home plate to hit location

### ~~2) Pitcher Stats Tabular Format~~ ✅ DONE
- ~~Refactor PitcherStats component to use tabular layout~~
- ~~Table columns: Type | Ball | Strike | % | Top | Avg~~
- Pitch types sorted by total pitches (descending)
- Strikes highlighted in green, velocities in primary color
- Hover effect on rows

### ~~3) Out Tracking and Inning Advancement~~ ✅ DONE
- ~~When an at-bat results in an out, properly record it~~
- ~~Track outs in the current inning (0, 1, 2)~~
- ~~When 3 outs are recorded:~~
  - ~~End the current half-inning~~
  - ~~Advance to the next half-inning (top -> bottom, or bottom -> top of next inning)~~
  - ~~Reset the out counter~~
- Visual out indicators (2 circles) in game header
- In-play result buttons for hits (single, double, triple, HR) and outs (groundout, flyout, etc.)
- Double play records 2 outs, triple play records 3 outs
- Inning change notification modal when 3 outs reached

### ~~4) Pitcher Heat Zones~~ ✅ DONE
- ~~Visualize zones where a pitcher excels at throwing strikes~~
- ~~Heat map overlay on strike zone showing:~~
  - ~~High strike percentage zones (green/hot)~~
  - ~~Low strike percentage zones (red/cold)~~
- ~~Based on historical data or current game data~~
- ~~Helps identify pitcher strengths for game strategy~~
- 17 zones: 3x3 inside strike zone + 8 outer ring zones
- API endpoint: GET /api/analytics/pitcher/:pitcherId/heat-zones
- HeatZoneOverlay component with color gradient (red → yellow → green)
- Toggle button on both PitcherProfile and LiveGame pages

### ~~5) Desired Pitch Location Tracking~~ ✅ DONE
- ~~Add a new data point: **desired pitch location** (separate from actual result)~~
- ~~Purpose: Track whether the pitcher located his pitch correctly~~
- ~~Compare intended vs actual location~~
- ~~Metrics to derive:~~
  - ~~Location accuracy percentage~~
  - ~~Identify pitcher's strengths (where they hit their spots)~~
  - ~~Identify weaknesses (where they miss their spots)~~
- Target location recorded before pitch (optional)
- Target shown as ball-width hollow circle with crosshair
- Clear target via button, right-click, or double-click
- Previous targets shown with reduced opacity (30%)

### ~~6) Pitch Flow Redesign~~ ✅ DONE
- ~~Reorder the pitch entry workflow:~~
  1. ~~Select **pitch type** first~~
  2. ~~Select **desired location** (where pitcher intended to throw)~~
  3. ~~Record **actual pitch location** (where it ended up)~~
  4. ~~Enter **velocity**~~
  5. ~~Record **result** (ball, strike, in play, etc.)~~
- ~~More natural flow that matches how a coach thinks about pitching~~
- Step indicator showing progress through workflow
- Pitch type grid selector at top of pitch entry
- Guided instructions for target and actual location

### ~~7) Pitcher Profile - Game Logs~~ ✅ DONE
- ~~Add historical game logs to pitcher profile page~~
- ~~Per-game statistics:~~
  - ~~Batters faced~~
  - ~~Total pitches~~
  - ~~Balls / Strikes / Strike %~~
  - ~~Breakdown by pitch type:~~
    - ~~Count thrown~~
    - ~~Strike %~~
    - ~~Desired location accuracy %~~
    - ~~Top/Avg velocity~~
- ~~Ability to drill down into individual games~~
- Route: `/teams/:team_id/pitcher/:pitcher_id`
- Profile button added to TeamDetail roster for pitchers
- Career stats card with games, pitches, batters faced, strike %, accuracy
- Game logs table with drill-down modal for pitch type breakdown

### ~~8) Batter Scouting Notes~~ ✅ DONE
- ~~Keep notes on each batter's tendencies~~
- Auto-detect patterns:
  - "Chases low and away breaking balls"
  - "Doesn't swing at borderline pitches"
  - "Aggressive early in count"
  - "Takes first pitch"
- Track swings on pitches outside the zone
- Track takes on pitches inside the zone
- Build a scouting report over time
- Display notes when batter comes up

### ~~9) Mobile App with Expo~~ ✅ DONE
- ~~Create a new `packages/mobile` package using Expo~~
- ~~Share business logic and types from existing packages~~
- ~~Target platforms:~~
  - ~~iOS (Apple App Store)~~
  - ~~Android (Google Play Store)~~
- ~~Features to prioritize for mobile:~~
  - ~~Live game pitch tracking (primary use case)~~
  - ~~Quick pitch entry optimized for touch~~
  - ~~Offline support for games without connectivity~~
  - ~~Sync when back online~~
- ~~React Native Paper for UI components~~
- Expo Router with typed routes, Redux Toolkit state management
- EAS Build CI/CD with TestFlight auto-submit
- Phone and tablet responsive layouts

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

### ~~12) UI Density - Reduce Padding and Font Sizes~~ ✅ DONE
- ~~Current UI feels too spread out, requires excessive scrolling~~
- Priority areas:
  - **LiveGame page** - pitch entry workflow should fit without scrolling
  - Headers and navigation
  - Form inputs and buttons
  - Cards and containers
- Adjustments to consider:
  - Reduce base spacing/padding values in theme
  - Smaller font sizes for labels and secondary text
  - Tighter line heights
  - Compact mode for data-dense views (stats tables, game logs)
- Goal: More information visible at once, especially during live game tracking
- Maintain readability and touch targets for mobile use

### ~~13) Code Cleanup - Component Structure~~ ✅ DONE
- ~~Refactor components folder to match pages structure:~~
  - ~~Each component in its own folder~~
  - ~~Component file + styles file together (e.g., `StrikeZone/StrikeZone.tsx` + `StrikeZone/styles.ts`)~~
  - ~~Index file for clean exports~~
- ~~Break larger components into smaller, focused pieces:~~
  - ~~Identify components over 200-300 lines~~
  - ~~Extract reusable sub-components~~
  - ~~Improve testability and maintainability~~
- ~~Current candidates for refactoring:~~
  - ~~`components/live/` - multiple components in single files~~
  - ~~`StrikeZone` - consider extracting zone rendering, heat map overlay~~
  - ~~`BaseballDiamond` - consider extracting trajectory drawing~~
- ~~Establish consistent patterns for future development~~

### ~~14) Player Login & Team Invites~~ ✅ DONE
- ~~Players (pitchers) get their own login accounts~~
- ~~Coach generates invite link from team roster (no email service — copy/share manually)~~
  - ~~Invite link generated per player from roster management screen~~
  - ~~Link allows player to create account and join the team~~
- ~~Player role vs Coach role:~~
  - ~~**Coach**: Full access (create games, manage roster, record pitches for any pitcher)~~
  - ~~**Player**: View own stats, record own bullpen sessions, see scouting notes~~
- ~~Invite system:~~
  - ~~Random hex token invite links with expiration~~
  - ~~Server-side revocation/tracking~~
  - ~~Resend invite option on roster page~~
- ~~Player can belong to multiple teams (e.g., school team + travel team)~~
- ~~Join requests: players can search teams and request to join~~

### 15) Bullpen Mode (Practice Sessions)
- Practice pitch tracking without a batter or game context
- **Simplified workflow** (no at-bat, no lineup, no innings):
  1. Select pitch type
  2. Set target location (where pitcher intended to throw)
  3. Record actual pitch location
  4. Enter velocity (optional)
  5. Record result: ball or strike
- **Key difference from live game**: Focus on command development, not game outcomes
- **Intensity levels**:
  - **Low**: Mechanics focus, recovery days (60-70% effort)
  - **Medium**: Building up, feel for pitches (75-85% effort)
  - **High**: Game-like intensity, pre-game bullpen (90-100% effort)
- **Bullpen Plans** (reusable templates):
  - Coach creates plans with predefined pitch sequences
  - Each pitch in plan: pitch type, target location, optional instruction
  - Example plans: "Pre-Game 25 Pitch Routine", "Slider Development Day"
  - Pitcher can load a plan or throw free-form
  - Display shows "Pitch 12 of 30" when following a plan
- **Target accuracy**:
  - "Hit target" = actual location within one ball width of target edge
  - Contributes to pitcher's location accuracy stats and heat zones
- **Session notes**:
  - Pitcher and/or coach can add notes about the session
  - Free-text (e.g., "Slider felt sharp", "Struggling with changeup grip")
  - Notes visible to both player and coach
- **Data model**:
  - `bullpen_sessions`: id, team_id, pitcher_id, date, intensity, notes, plan_id?, status
  - `bullpen_pitches`: id, session_id, pitch_number, pitch_type, target_x/y, actual_x/y, velocity?, result
  - `bullpen_plans`: id, team_id, name, description, created_by
  - `bullpen_plan_pitches`: id, plan_id, sequence, pitch_type, target_x/y, instruction?
- **Analytics integration**:
  - Included in heat zone data (hot/cold zones)
  - Included in location accuracy stats
  - Included in velocity tracking
  - Pitcher Profile shows bullpen sessions separately (marked as "Practice")
- **Access**:
  - Coach: from Team Detail page (select pitcher)
  - Player: from own dashboard (self-record)
- **Future consideration**: Catcher feedback per pitch (not in initial release)

### 16) Mobile Splash Screen
- Design and implement a branded splash screen for the mobile app
- Match app branding (logo, colors)
- Configured via Expo splash screen plugin in app.json
- Smooth transition from splash to app content

### 17) App Theme & Pitch Tracking Colors
- Revisit and adjust the color palette for both web and mobile
- Pitch type colors: ensure each pitch type has a distinct, readable color
  - Consistent across strike zone dots, stats tables, charts
  - Work well on both light and dark backgrounds
- Overall app theme adjustments:
  - Primary/secondary/accent colors
  - Ensure consistency between web and mobile
- Consider dark mode support

### ~~18) Rename Mobile App to "Pitch Chart"~~ ✅ DONE
- ~~Update app display name from "Pitch Tracker" to "Pitch Chart"~~
- ~~Update in:~~
  - ~~app.json (`name`, `slug`)~~
  - ~~App Store / TestFlight metadata~~
  - ~~Splash screen text (if applicable)~~
  - ~~Any in-app branding references~~

### ~~19) Team Year & Team Type~~ ✅ DONE
- ~~Add a **year** field to teams (e.g., 2025, 2026)~~
  - ~~Allows tracking the same program across seasons~~
  - ~~Historical team data preserved by year~~
- ~~Add a **team type** field:~~
  - ~~**High School**: Player limited to one high school team per year~~
  - ~~**Travel**: Player can be on multiple travel teams per year (within an organization)~~
- ~~Player-team relationship:~~
  - ~~Players can belong to multiple teams across types~~
  - ~~Validation: max one high school team per player per year~~
  - ~~No limit on travel team memberships per year~~
- ~~Added team_type (high_school/travel/club/college) and year columns~~
- ~~Structured season dropdown (Spring/Summer/Fall/Winter) + year input~~
- ~~HS validation enforced in invite accept and join request approval~~
- ~~Filter/sort teams by year and type in UI~~

### ~~20) Base Runners in Live Game~~ ✅ DONE
- ~~Add a baseball diamond to the score/game status area showing base runners~~
- ~~Diamond shows 1st, 2nd, 3rd bases as the infield view~~
  - ~~Empty base: outline only~~
  - ~~Occupied base: filled/highlighted~~
- ~~Update base runners during at-bat:~~
  - ~~Single: advance runners appropriately~~
  - ~~Double: advance runners~~
  - ~~Triple: advance runners~~
  - ~~HR: clear bases, all score~~
  - ~~Walk: force advance if bases loaded~~
  - ~~Outs: runners stay (unless double play, etc.)~~
- ~~Display in both web and mobile live game screens~~
- ~~Reset bases on inning change (3 outs)~~
- Runner advancement modal allows manual adjustment (extra-base takes)
- Caught stealing / pickoff recording via "Runner Out" button
- `baserunner_events` table tracks CS, pickoffs, etc.
- Runs scored go to opponent (away_score) since user's team is pitching

### ~~21) Organization Level for Travel Teams~~ ✅ DONE
- ~~Add an Organization entity above the Team level~~
  - ~~Organization has a name, logo, and admin users~~
  - ~~An organization can contain multiple teams (e.g., "Lions Den 14U", "Lions Den 16U", "Lions Den 18U")~~
  - ~~Teams within an org have a year and type (see #19)~~
- ~~Roles:~~
  - ~~**Org Admin**: View all teams, all players, all stats across the organization~~
  - ~~**Coach**: Manages their own team(s) within the org (existing behavior)~~
  - ~~**Player**: Views own stats (existing behavior)~~
- ~~Organization dashboard:~~
  - ~~Overview of all teams in the org~~
  - ~~Aggregate stats across teams~~
  - ~~Player search across the organization~~
- ~~Team assignment:~~
  - ~~Players can be moved between teams within the same org~~
  - ~~Coaches can be assigned to one or more teams~~
- ~~Useful for travel ball organizations managing multiple age groups or squads~~

### 22) Pitch Velocity Detection (Video + Audio)
- Estimate pitch velocity from standard 30fps smartphone video recorded behind home plate
- Uses audio glove-pop detection as the primary timing signal, with optional radar calibration for accuracy
- **Modes**:
  - **Calibrated Mode** (±2-3 mph) — Radar gun provides ground-truth for 1-3 pitches. Algorithm learns the pitcher's flight time at known velocity. All subsequent pitches: detect glove pop only, compute velocity from calibrated baseline.
  - **Quick-Cal Mode** (±4-5 mph) — User provides pitcher's approximate average velocity ("he throws about 80"). No radar needed.
  - **Uncalibrated Mode** (±6-8 mph) — Foot plant audio + biomechanical offset fallback. Least accurate.
- **Algorithm Pipeline**:
  1. Extract audio from video (44.1kHz mono PCM)
  2. Detect glove pop — impulsive transient with <2ms rise time, >5× median amplitude, isolated local max within ±50ms. 90%+ detection confidence in testing.
  3. Correct for sound travel — camera behind backstop (~15ft / 1125 ft/s = 13ms)
  4. Estimate release time — from calibrated profile (radar baseline) or foot plant audio + 180ms biomechanical offset (fallback)
  5. Calculate velocity — 55ft (release-to-plate) ÷ flight time
- **Calibration Flow (UX)**:
  1. Start of outing: user taps "Calibrate" in PitchChart
  2. Records 1-3 pitches on video while someone radars them (Pocket Radar Ball Coach, Stalker Sport 2, or stadium gun reading)
  3. User enters radar MPH for each pitch
  4. App builds pitcher profile: learns avg flight time (e.g. 469ms for ~80 mph pitcher)
  5. Rest of game: just record video, app auto-detects velocity from glove pop timing
  6. Profile persists per pitcher, can be recalibrated anytime
- **Key Technical Decisions**:
  - **Audio > Video for timing.** At 30fps the ball is visible in only 2-3 frames during flight. Audio at 44.1kHz gives 1,600× more temporal resolution. The glove pop is the single most reliable signal.
  - **Calibration > Detection.** Foot plant detection is unreliable in noisy environments (crowd, PA, bat sounds). Radar calibration eliminates the need to detect the release point — we learn it once and reuse.
  - **Amplitude adjustment.** With 2+ calibration points, louder glove pops weakly correlate with faster pitches. Algorithm applies a conservative ±3 mph amplitude-based adjustment.
- **Validated Results** (3 game pitches, same pitcher):

  | Pitch | Uncalibrated | Calibrated (79/80/81 radar) | Actual (visual est.) |
  |-------|-------------|----------------------------|---------------------|
  | IMG_7067 | 71.9 mph | 78.7 mph | ~78-81 mph |
  | IMG_7073 | 85.8 mph | 80.7 mph | ~78-81 mph |
  | IMG_7075 | 99.4 mph | 80.6 mph | ~78-81 mph |

  Calibration collapsed the uncalibrated spread (72-99 mph) to 78.7-80.7 mph — matching observed velocity.
- **API Surface** (`PitchAnalyzer` class):
  ```python
  analyzer = PitchAnalyzer(camera_distance_ft=15.0)

  # Calibrate with radar readings
  analyzer.calibrate("pitch1.MOV", radar_mph=79)
  analyzer.calibrate("pitch2.MOV", radar_mph=80)
  analyzer.calibrate("pitch3.MOV", radar_mph=81)

  # Or quick-cal with known average
  analyzer.calibrate_from_average(80)

  # Analyze any pitch
  result = analyzer.analyze("pitch4.MOV")
  result.velocity_mph      # 78.7
  result.velocity_low_mph  # 75
  result.velocity_high_mph # 83
  result.confidence        # 'high'
  result.method            # 'calibrated'
  result.glove_pop_amplitude  # 10519
  ```

---

## Future / Under Discussion

### Integrate with PitchSafe
- Explore integration with PitchSafe pitch count monitoring
- Need to coordinate with Lions Den on API/data sharing
- Potential features:
  - Automatic pitch count limits and warnings
  - Rest day recommendations based on pitch counts
  - Compliance tracking for league rules

### Integrate with Pocket Radar
- Connect to Pocket Radar devices for automatic velocity capture
- Eliminate manual velocity entry during games and bullpens
- Bluetooth or API integration depending on device capabilities
- Auto-populate velocity field when pitch is detected

### Automated Pitch Charting from Video
- Fully automate pitch charting by analyzing video captured from behind home plate
- Builds on #22 (Velocity Detection) — extends audio/video analysis to extract all pitch data
- **Video capture integration**:
  - Record video directly within PitchChart during games or bullpens
  - Continuous recording mode: app segments video per pitch automatically (glove pop to glove pop)
  - Import existing video clips for post-game charting
- **Data extracted per pitch**:
  - **Pitch type** — classify fastball, curveball, slider, changeup, etc. from trajectory arc, spin, and velocity
  - **Velocity** — via glove-pop timing (from #22 pipeline)
  - **Actual location** — track ball position as it crosses the plate using frame-by-frame analysis
  - **Target location** — infer from catcher's glove setup position before the pitch
  - **Result** — ball/strike/foul/in-play from batter and umpire reactions, ball trajectory
  - **Hit outcome** — if in play, detect ball off bat direction and approximate landing zone
- **Computer vision pipeline**:
  - Detect strike zone boundaries from batter stance
  - Track ball trajectory across frames (even at 30fps, entry and glove frames bracket the zone)
  - Catcher glove position detection for target inference
  - Batter swing/no-swing detection
- **Workflow**:
  - Coach sets up phone on tripod behind backstop, hits record
  - App captures entire inning or outing as continuous video
  - Post-pitch or post-game: app processes video and populates pitch-by-pitch chart
  - Coach reviews and corrects any misclassifications before saving
- **Accuracy tiers**:
  - **Velocity**: High confidence (proven in #22)
  - **Location**: Moderate — depends on camera angle and stability
  - **Pitch type**: Moderate — benefits from calibration pitches of known types
  - **Result**: Lower — may need manual confirmation for close calls
- **Future considerations**:
  - ML model training on labeled pitch data from manual charting sessions
  - Higher frame rate cameras (60/120fps) for improved ball tracking
  - Multi-camera support for better 3D position estimation
  - Integration with broadcast camera feeds for tournament/showcase use
