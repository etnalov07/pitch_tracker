# packages/api (Express Backend)

**Architecture**: Routes → Controllers → Services → PostgreSQL

- **Types**: `src/types/index.ts` re-exports all from `@pitch-tracker/shared` plus API-only types (`AuthRequest`, `UserWithPassword`)
- **Services**: Singleton classes (`export default new FooService()`), import types from `'../types'`
- **Controllers**: Thin wrappers, one method per endpoint, call service methods
- **Routes**: Express Router, `authenticate` middleware on all routes, `.bind(controller)` pattern
- **Migrations**: Numbered SQL files in `src/migrations/` (e.g., `005_bullpen_mode.sql`)
- **DB**: Use `query()` for reads, `transaction(async (client) => { ... })` for writes
- **Route registration**: `app.use('/bt-api/<domain>', routes)` in `app.ts`
- Place specific routes (e.g., `/sessions/team/:teamId`) before parameterized routes (`/sessions/:id`) to avoid conflicts
