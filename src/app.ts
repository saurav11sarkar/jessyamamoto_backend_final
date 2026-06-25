import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import notFoundError from './app/error/notFoundError';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './app/routes/routes';
import webHookHendler from './app/helper/webHookHandler';
const app = express();

// Security headers
app.use(helmet());

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares
const allowedOrigins = [
  'https://jetsetcares.org',
  'https://www.jetsetcares.org',
  'https://dashboard.jetsetcares.org',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.post('/webhook', express.raw({ type: 'application/json' }), webHookHendler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit auth endpoints
app.use('/api/v1/auth', authLimiter);

// Application routes (Centralized router)
app.use('/api/v1', router);

// Root router
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to the server' });
});

// Not found route
app.use(notFoundError);

// Global error handler
app.use(globalErrorHandler);

export default app;
