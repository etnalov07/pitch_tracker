# Baseball Tracker Web App (bt_web)

A React + TypeScript web application for tracking baseball pitches during live games. Built with Emotion styled-components for a modern, responsive UI.

## 🎯 Features

### Core Functionality
- **Interactive Strike Zone** - Visual pitch location selector with real-time tracking
- **Batter History Panel** - Strategic analysis showing:
  - Recent at-bats vs current pitcher
  - Stats (AB, H, BB, K, AVG)
  - Pitch sequences with color-coded results
  - Toggle between pitcher-specific and all-time data
- **Live Game Tracking** - Real-time pitch logging with:
  - Ball/strike count automation
  - Multiple pitch types (fastball, slider, curveball, etc.)
  - Velocity tracking
  - Pitch result classification
- **Authentication** - Secure login/register with JWT tokens
- **Protected Routes** - Auth-gated access to game tracking

### Tech Stack
- **React 18** with TypeScript
- **Emotion** for styled-components
- **React Router** for navigation
- **Axios** for API calls
- **JWT** authentication

## 📁 Project Structure

```
bt_web/
├── src/
│   ├── components/
│   │   └── live/
│   │       ├── StrikeZone.tsx       # Interactive pitch location selector
│   │       └── BatterHistory.tsx    # Batter stats & history panel
│   ├── pages/
│   │   ├── Login.tsx                # Login/Register page
│   │   └── LiveGame.tsx             # Main live game tracking interface
│   ├── services/
│   │   ├── api.ts                   # Axios instance with interceptors
│   │   ├── authService.ts           # Authentication API calls
│   │   ├── gameService.ts           # Game management API calls
│   │   └── pitchService.ts          # Pitch logging & analytics API calls
│   ├── types/
│   │   └── index.ts                 # TypeScript type definitions
│   ├── styles/
│   │   └── theme.ts                 # Theme configuration (colors, spacing, etc.)
│   ├── App.tsx                      # Main app with routing
│   └── index.tsx                    # App entry point
├── .env                             # Environment variables
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 14+
- npm or yarn
- Backend API running (bt_api)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Edit `.env` file and set your API URL:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

   App will open at [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App (⚠️ irreversible)

## 🎮 Usage

### 1. Authentication
- Navigate to `/login`
- Register a new account or sign in
- JWT token stored in localStorage

### 2. Live Game Tracking
- Navigate to `/game/:gameId` (replace `:gameId` with actual game ID)
- **Start At-Bat** - Click to begin tracking a new plate appearance
- **Select Pitch Location** - Click on the strike zone where the pitch landed
- **Enter Pitch Details**:
  - Select pitch type (fastball, slider, curveball, etc.)
  - Enter velocity (optional)
  - Select result (ball, called strike, swinging strike, foul, in play)
- **Log Pitch** - Saves pitch and updates count automatically
- **View Batter History** - Left panel shows strategic data

### 3. Key Components

#### StrikeZone Component
- Interactive grid-based strike zone
- Click to select pitch location
- Shows previous pitches color-coded by result
- Legend for pitch result colors

#### BatterHistory Component
- Displays recent at-bats (last 10 by default)
- Shows stats: AB, H, BB, K, AVG
- Toggle between "vs This Pitcher" and "All Time"
- Pitch sequence visualization

#### LiveGame Page
- Two-panel layout (history + tracking)
- Game header with score and inning
- Real-time count display
- Pitch entry form with quick-tap buttons

## 🎨 Styling with Emotion

All components use `@emotion/styled` for styling. Example:

```tsx
import styled from '@emotion/styled';
import { theme } from '../styles/theme';

const Button = styled.button`
  background-color: ${theme.colors.primary[600]};
  color: white;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};

  &:hover {
    background-color: ${theme.colors.primary[700]};
  }
`;
```

### Theme System
Access design tokens from `src/styles/theme.ts`:
- **Colors**: `theme.colors.primary[600]`, `theme.colors.gray[100]`, etc.
- **Spacing**: `theme.spacing.sm`, `theme.spacing.lg`, etc.
- **Typography**: `theme.fontSize.xl`, `theme.fontWeight.bold`, etc.
- **Breakpoints**: `theme.breakpoints.md`, `theme.breakpoints.lg`, etc.

## 🔌 API Integration

### API Service (`src/services/api.ts`)
- Axios instance with base URL from `.env`
- **Request Interceptor**: Adds JWT token to all requests
- **Response Interceptor**: Handles 401 errors (auto-logout)

### Service Files
- **authService**: Login, register, logout, profile
- **gameService**: CRUD operations, start/end game, advance inning
- **pitchService**: Log pitches, create at-bats, record plays
- **analyticsService**: Batter history, heat maps, spray charts

## 📱 Responsive Design

The app is mobile-optimized with breakpoints:
- **Mobile**: Single column layout
- **Desktop (1024px+)**: Two-panel layout (history sidebar + main tracking)

## 🔒 Authentication Flow

1. User logs in → JWT token received
2. Token stored in `localStorage`
3. All API requests include `Authorization: Bearer <token>` header
4. 401 responses trigger auto-logout and redirect to `/login`

## 🎯 Next Steps / Todo

- [ ] Add Dashboard page for game/team selection
- [ ] Add Team Management UI
- [ ] Add Player Roster UI
- [ ] Add Game History/Review page
- [ ] Add Analytics Visualizations (charts/graphs)
- [ ] Add Play Recording form (for balls in play)
- [ ] Add Spray Chart visualization
- [ ] Add Heat Map visualization
- [ ] Implement real-time updates (WebSockets)
- [ ] Add offline support (PWA)
- [ ] Deploy to production

## 🐛 Troubleshooting

### "Network Error" when logging in
- Ensure backend API (bt_api) is running
- Check `.env` file has correct `REACT_APP_API_URL`
- Verify backend is accessible at the specified URL

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and `package-lock.json`, then reinstall

### Styling not working
- Ensure `@emotion/react` and `@emotion/styled` are installed
- Check that components import `styled` from `@emotion/styled`

## 📚 Learning Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Emotion Documentation](https://emotion.sh/docs/introduction)
- [React Router](https://reactrouter.com)
- [Axios](https://axios-http.com)

## 🤝 Contributing

This is a personal project from your conversation with Claude. Feel free to extend it!

## 📄 License

MIT

---

**Built with ⚾ for Baseball Tracking**
