// Loaded via jest setupFiles — runs before any module import in the test suite.
// Must set all env vars that config/env.ts reads on require() before app.ts is imported.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });
