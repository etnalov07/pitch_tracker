# Test Patterns Reference

Package-specific patterns for generating tests in the pitch-tracker monorepo.

---

## API — Service Tests

Services are singletons that call `query()` and `transaction()` from `../config/database`.

```ts
import gameService from '../game.service';
import { query, transaction } from '../../config/database';

jest.mock('../../config/database');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

describe('GameService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getGameById', () => {
        it('should return a game when found', async () => {
            const mockGame = { id: 1, team_id: 1, opponent: 'Tigers' };
            mockQuery.mockResolvedValue({ rows: [mockGame], rowCount: 1 } as any);

            const result = await gameService.getGameById(1);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [1]);
            expect(result).toEqual(mockGame);
        });

        it('should return null when not found', async () => {
            mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

            const result = await gameService.getGameById(999);

            expect(result).toBeNull();
        });
    });
});
```

**Key points:**

- Mock `query` and `transaction` from `../../config/database`
- `transaction` receives a callback with a `client` arg — mock it to invoke the callback: `mockTransaction.mockImplementation(async (cb) => cb(mockClient))`
- Use `as any` on mock return values for QueryResult shape
- Test both success and error/empty paths

---

## API — Controller Tests

Controllers are thin wrappers calling service methods. Mock the service default export.

```ts
import { Request, Response, NextFunction } from 'express';
import gameController from '../game.controller';
import gameService from '../../services/game.service';

jest.mock('../../services/game.service');

const mockService = gameService as jest.Mocked<typeof gameService>;

describe('GameController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {
            params: {},
            body: {},
            user: { id: 1, email: 'test@test.com' },
        };
        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });

    describe('getGame', () => {
        it('should return game data', async () => {
            mockReq.params = { id: '1' };
            const mockGame = { id: 1, opponent: 'Tigers' };
            mockService.getGameById.mockResolvedValue(mockGame as any);

            await gameController.getGame(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith(mockGame);
        });

        it('should return 404 when game not found', async () => {
            mockReq.params = { id: '999' };
            mockService.getGameById.mockResolvedValue(null);

            await gameController.getGame(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });
});
```

---

## API — Route Integration Tests (--integration)

Use supertest with the Express app. Mock auth middleware to bypass JWT.

```ts
import request from 'supertest';
import app from '../../app';
import gameService from '../../services/game.service';

jest.mock('../../services/game.service');
jest.mock('../../middleware/authenticate', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { id: 1, email: 'test@test.com' };
        next();
    },
}));

const mockService = gameService as jest.Mocked<typeof gameService>;

describe('GET /bt-api/games/:id', () => {
    it('should return 200 with game data', async () => {
        const mockGame = { id: 1, opponent: 'Tigers' };
        mockService.getGameById.mockResolvedValue(mockGame as any);

        const res = await request(app).get('/bt-api/games/1');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockGame);
    });
});
```

**Key points:**

- Import `app` from `../../app` (the Express app instance)
- Mock `../../middleware/authenticate` to inject a test user
- Use the full route path including `/bt-api/` prefix

---

## Web — Component Tests

Use React Testing Library with Emotion/Router wrappers as needed.

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InningChangeModal from '../InningChangeModal';

// Mock services if the component calls APIs
jest.mock('../../../services/gameService', () => ({
    gameService: {
        updateInning: jest.fn(),
    },
}));

const defaultProps = {
    open: true,
    onClose: jest.fn(),
    currentInning: 3,
    isTopOfInning: true,
    onConfirm: jest.fn(),
};

const renderComponent = (props = {}) => {
    return render(
        <MemoryRouter>
            <InningChangeModal {...defaultProps} {...props} />
        </MemoryRouter>
    );
};

describe('InningChangeModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render when open is true', () => {
        renderComponent();
        expect(screen.getByText(/inning/i)).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
        renderComponent({ open: false });
        expect(screen.queryByText(/inning/i)).not.toBeInTheDocument();
    });

    it('should call onConfirm when confirmed', async () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
        await waitFor(() => {
            expect(defaultProps.onConfirm).toHaveBeenCalled();
        });
    });
});
```

**Key points:**

- Wrap in `<MemoryRouter>` if component uses `useNavigate`, `useParams`, `Link`, etc.
- Use `screen.getByRole`, `getByText`, `getByTestId` (prefer accessible queries)
- `fireEvent` for user interactions, `waitFor` for async state updates
- Mock service modules at module level with `jest.mock()`

---

## Web — Service Tests

Services are named object exports using an `api` axios instance.

```ts
import { gameService } from '../gameService';
import api from '../api';

jest.mock('../api');

const mockApi = api as jest.Mocked<typeof api>;

describe('gameService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getGames', () => {
        it('should fetch games for a team', async () => {
            const mockGames = [{ id: 1, opponent: 'Tigers' }];
            mockApi.get.mockResolvedValue({ data: mockGames });

            const result = await gameService.getGames(1);

            expect(mockApi.get).toHaveBeenCalledWith('/games/team/1');
            expect(result).toEqual(mockGames);
        });

        it('should throw on API error', async () => {
            mockApi.get.mockRejectedValue(new Error('Network error'));

            await expect(gameService.getGames(1)).rejects.toThrow('Network error');
        });
    });
});
```

---

## Mobile — Component Tests

Use React Native Testing Library. Mock platform APIs.

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PitchButton from '../PitchButton';

// Mock haptics (always use the wrapper, never expo-haptics)
jest.mock('../../../utils/haptics', () => ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: { Medium: 'medium' },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({ id: '1' }),
}));

const createTestStore = (preloadedState = {}) =>
    configureStore({
        reducer: {
            // Add relevant slice reducers
        },
        preloadedState,
    });

describe('PitchButton', () => {
    it('should render pitch type label', () => {
        render(
            <Provider store={createTestStore()}>
                <PitchButton type="fastball" onPress={jest.fn()} />
            </Provider>
        );
        expect(screen.getByText('Fastball')).toBeTruthy();
    });
});
```

**Key points:**

- ALWAYS mock `../../utils/haptics` (NOT `expo-haptics`)
- ALWAYS mock `expo-router` hooks
- Mock `@react-native-async-storage/async-storage` if used
- Wrap in Redux `<Provider>` if component uses `useAppSelector`/`useAppDispatch`
- Use `screen.getByText`, `getByTestId` — RN Testing Library queries

---

## Shared — Utility Tests

Plain Jest tests for pure functions and type utilities.

```ts
import { calculateERA, formatPitchType } from '../index';

describe('calculateERA', () => {
    it('should calculate ERA correctly', () => {
        expect(calculateERA(3, 9)).toBeCloseTo(3.0);
    });

    it('should return Infinity for 0 innings', () => {
        expect(calculateERA(5, 0)).toBe(Infinity);
    });

    it.each([
        [0, 9, 0],
        [9, 3, 27],
        [1, 1, 9],
    ])('calculateERA(%i, %i) = %f', (earnedRuns, innings, expected) => {
        expect(calculateERA(earnedRuns, innings)).toBeCloseTo(expected);
    });
});

describe('formatPitchType', () => {
    it.each([
        ['FB', 'Fastball'],
        ['CB', 'Curveball'],
        ['SL', 'Slider'],
    ])('should format %s as %s', (input, expected) => {
        expect(formatPitchType(input)).toBe(expected);
    });
});
```

**Key points:**

- Use `it.each` for comprehensive input/output testing
- Test edge cases: zero, negative, undefined, empty strings
- No mocking needed for pure functions
- `toBeCloseTo` for floating point comparisons

---

## Common Mock Patterns

### Mock a singleton default export

```ts
jest.mock('../../services/game.service');
import gameService from '../../services/game.service';
const mockService = gameService as jest.Mocked<typeof gameService>;
```

### Mock a named export

```ts
jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));
```

### Mock with factory (when you need custom implementation)

```ts
jest.mock('../../services/auth.service', () => ({
    __esModule: true,
    default: {
        verifyToken: jest.fn().mockResolvedValue({ id: 1 }),
    },
}));
```

### Mock AsyncStorage (mobile)

```ts
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));
```
