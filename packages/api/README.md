# Baseball Tracker API (bt_api)

A comprehensive REST API for tracking baseball pitches, managing games, and providing strategic analytics for coaches.

## Features

- 🔐 **Authentication** - JWT-based user authentication
- 👥 **Team Management** - Create and manage teams
- ⚾ **Player Management** - Roster management with positions
- 🎮 **Game Tracking** - Live game state management
- 📊 **Pitch Logging** - Track pitch type, speed, location
- 📍 **Play Recording** - Record ball-in-play outcomes
- 📈 **Analytics** - Batter history, spray charts, heat maps

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v10 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd bt_api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=baseball_tracker
   DB_USER=your_username
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_key
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Set up the database**
   
   Make sure PostgreSQL is running, then create the database and run the schema:
   ```bash
   createdb baseball_tracker
   psql -U your_username -d baseball_tracker -f path/to/schema.sql
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Teams
- `POST /api/teams` - Create team
- `GET /api/teams` - Get user's teams
- `GET /api/teams/all` - Get all teams
- `GET /api/teams/:id` - Get team by ID
- `GET /api/teams/:id/players` - Get team with players
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Players
- `POST /api/players` - Create player
- `GET /api/players/:id` - Get player by ID
- `GET /api/players/team/:team_id` - Get players by team
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player
- `GET /api/players/:id/stats` - Get player stats

### Games
- `POST /api/game` - Create game
- `GET /api/game/:id` - Get game by ID
- `GET /api/game/team/:team_id` - Get games by team
- `POST /api/game/:id/start` - Start game
- `PUT /api/game/:id/score` - Update score
- `POST /api/game/:id/advance-inning` - Advance to next inning
- `POST /api/game/:id/end` - End game
- `GET /api/game/:id/innings` - Get game innings

### At-Bats
- `POST /api/at-bats` - Create at-bat
- `GET /api/at-bats/:id` - Get at-bat by ID
- `GET /api/at-bats/game/:gameId` - Get at-bats by game
- `GET /api/at-bats/inning/:inningId` - Get at-bats by inning
- `PUT /api/at-bats/:id` - Update at-bat
- `POST /api/at-bats/:id/end` - End at-bat
- `GET /api/at-bats/:id/pitches` - Get at-bat with pitches

### Pitches
- `POST /api/pitches` - Log pitch
- `GET /api/pitches/:id` - Get pitch by ID
- `GET /api/pitches/at-bat/:atBatId` - Get pitches by at-bat
- `GET /api/pitches/game/:gameId` - Get pitches by game
- `GET /api/pitches/pitcher/:pitcherId` - Get pitches by pitcher
- `GET /api/pitches/batter/:batterId` - Get pitches by batter

### Plays
- `POST /api/plays` - Record play
- `GET /api/plays/:id` - Get play by ID
- `GET /api/plays/at-bat/:atBatId` - Get plays by at-bat
- `GET /api/plays/game/:gameId` - Get plays by game
- `GET /api/plays/batter/:batterId` - Get plays by batter
- `PUT /api/plays/:id` - Update play

### Analytics (Key Features!)
- `GET /api/analytics/batter/:batterId/history` - Get batter history
  - Query params: `?pitcherId=<id>&gameId=<id>`
- `GET /api/analytics/batter/:batterId/heat-map` - Get pitch location heat map
  - Query params: `?pitcherId=<id>`
- `GET /api/analytics/batter/:batterId/spray-chart` - Get spray chart
  - Query params: `?gameId=<id>`
- `GET /api/analytics/pitcher/:pitcherId/tendencies` - Get pitcher tendencies
  - Query params: `?gameId=<id>`
- `GET /api/analytics/game/:gameId/state` - Get current game state
- `GET /api/analytics/matchup/:batterId/:pitcherId` - Get matchup stats

## Project Structure

```
bt_api/
├── src/
│   ├── config/          # Database and environment config
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth and error handling
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Helper functions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Key Features for Live Game

The API is designed for real-time game tracking with these key workflows:

1. **Starting a Game**
   - Create game → Start game → Creates first inning automatically

2. **During Live Play**
   - Create at-bat for current batter
   - Log each pitch with location, speed, type
   - Record play outcome when ball is in play
   - End at-bat with result
   - Advance inning when needed

3. **Strategic Analytics** (The Game Changer!)
   - Before each at-bat, fetch batter history vs current pitcher
   - View pitch location heat map
   - See spray chart of where batter hits
   - Get real-time game state

## Example Workflow

```javascript
// 1. Start a game
POST /api/game/:gameId/start

// 2. Create an at-bat
POST /api/at-bats
{
  "game_id": "...",
  "inning_id": "...",
  "batter_id": "...",
  "pitcher_id": "...",
  "outs_before": 0
}

// 3. Get batter history (STRATEGIC!)
GET /api/analytics/batter/:batterId/history?pitcherId=:pitcherId

// 4. Log pitches
POST /api/pitches
{
  "at_bat_id": "...",
  "pitch_type": "fastball",
  "velocity": 85.5,
  "location_x": 0.52,
  "location_y": 0.48,
  "pitch_result": "called_strike"
}

// 5. Record play (if ball in play)
POST /api/plays
{
  "pitch_id": "...",
  "at_bat_id": "...",
  "contact_type": "line_drive",
  "contact_quality": "hard",
  "field_location": "right_center_gap",
  "hit_result": "single"
}

// 6. End at-bat
POST /api/at-bats/:id/end
{
  "result": "single",
  "outs_after": 0,
  "rbi": 1
}
```

## License

ISC

## Contributing

Contributions welcome! Please open an issue or submit a pull request.