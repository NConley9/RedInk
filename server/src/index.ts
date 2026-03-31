import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { aiRouter } from './routes/ai.js';
import { charactersRouter } from './routes/characters.js';
import { scenariosRouter } from './routes/scenarios.js';
import { chatsRouter } from './routes/chats.js';
import { settingsRouter } from './routes/settings.js';
import { imagesRouter } from './routes/images.js';
import { contentRouter } from './routes/content.js';

const app = express();
const PORT = process.env.PORT || 3001;

const configuredOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URLS,
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(',').map((v) => v.trim()).filter(Boolean));

const allowedOrigins = Array.from(new Set([
  'http://localhost:5173',
  'https://red-ink-client.onrender.com',
  ...configuredOrigins,
]));

app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin requests (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/ai', aiRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/content', contentRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
