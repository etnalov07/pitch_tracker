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
- Simplified workflow (no at-bat, no lineup, no innings):
  1. Select pitch type
  2. Set target location (where pitcher intended to throw)
  3. Record actual pitch location
  4. Enter velocity (optional)
  - No ball/strike result needed (coach/player decides focus)
- Data recorded per pitch:
  - Pitch type
  - Target location (desired)
  - Actual location
  - Velocity (where applicable)
  - Timestamp
- Session tracking:
  - Start/end a bullpen session
  - Session tagged as "practice" (distinct from "game")
  - Session notes (e.g., "working on slider command")
- Contributes to pitcher analytics:
  - Included in heat zone data (hot/cold zones)
  - Included in location accuracy stats
  - Included in velocity tracking
  - Pitcher Profile game logs show bullpen sessions separately (marked as "Practice")
- Available to both coach and player (player can self-record)
- Accessible from:
  - Team detail page (coach selects a pitcher)
  - Player's own dashboard (if player login is implemented)
- Player can add personal notes about their bullpen session
  - Free-text notes per session (e.g., "Slider felt sharp today", "Struggling with changeup grip")
  - Notes visible to both player and coach

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

### 18) Rename Mobile App to "Pitch Chart"
- Update app display name from "Pitch Tracker" to "Pitch Chart"
- Update in:
  - app.json (`name`, `slug`)
  - App Store / TestFlight metadata
  - Splash screen text (if applicable)
  - Any in-app branding references

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

### 20) Base Runners in Live Game
- Add a baseball diamond to the score/game status area showing base runners
- Diamond shows 1st, 2nd, 3rd bases as the infield view
  - Empty base: outline only
  - Occupied base: filled/highlighted
- Update base runners during at-bat:
  - Single: advance runners appropriately
  - Double: advance runners
  - Triple: advance runners
  - HR: clear bases, all score
  - Walk: force advance if bases loaded
  - Outs: runners stay (unless double play, etc.)
- Display in both web and mobile live game screens
- Reset bases on inning change (3 outs)
- Visual consistency with existing baseball diamond component style

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
