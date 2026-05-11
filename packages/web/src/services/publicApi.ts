import axios from 'axios';

// Axios instance for public, unauthenticated endpoints (e.g. the postgame
// share-link page at /report/:gameId). Intentionally has neither the auth
// interceptor nor the 401-redirect interceptor from `./api` — public visitors
// have no token and must not be bounced to /login on any error.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/bt-api';

const publicApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default publicApi;
