require('dotenv').config();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (non-fatal):', err?.message ?? err);
});

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const auth       = require('./middleware/auth');
const groupRoute = require('./routes/group');
const tasksRoute = require('./routes/tasks');

const app  = express();
const PORT = process.env.PORT || 3000;

// Railway (and most cloud platforms) sit behind a reverse proxy
app.set('trust proxy', 1);

// 120 requests per minute per IP — enough for 4 players polling every 10s with headroom
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down.' },
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check (no auth required)
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '2' }));

// All routes below require a valid API key and group ID
app.use(auth);
app.use('/group', groupRoute);
app.use('/tasks', tasksRoute);

app.listen(PORT, () => console.log(`GIM Tasks backend listening on port ${PORT}`));
