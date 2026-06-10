import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth';
import { AuthRequest } from './types';
import explainRouter from './routes/explain';
import scansRouter from './routes/scans';
import chatRouter from './routes/chat';
import profileRouter from './routes/profile';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/auth', requireAuth, (req: AuthRequest, res) => {
  res.json({ status: 'ok', userId: req.userId });
});

app.use('/api/explain', explainRouter);
app.use('/api/scans', scansRouter);
app.use('/api/chat', chatRouter);
app.use('/api/profile', profileRouter);

export default app;

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}
