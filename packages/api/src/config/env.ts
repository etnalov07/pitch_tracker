import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string | string[];
  };
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config: Config = {
  port: parseInt(getEnvVariable('PORT', '5000'), 10),
  nodeEnv: getEnvVariable('NODE_ENV', 'development'),
  db: {
    host: getEnvVariable('DB_HOST', 'localhost'),
    port: parseInt(getEnvVariable('DB_PORT', '5432'), 10),
    name: getEnvVariable('DB_NAME'),
    user: getEnvVariable('DB_USER'),
    password: getEnvVariable('DB_PASSWORD'),
  },
  jwt: {
    secret: getEnvVariable('JWT_SECRET'),
    expiresIn: getEnvVariable('JWT_EXPIRES_IN', '7d'),
  },
  cors: {
    origin: getEnvVariable('CORS_ORIGIN', 'http://localhost:3000').split(',').map(o => o.trim()),
  },
};

export default config;