import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import authRoutes from './src/server/routes/authRoutes';
import documentRoutes from './src/server/routes/documentRoutes';
import dashboardRoutes from './src/server/routes/dashboardRoutes';
import reportsRoutes from './src/server/routes/reportsRoutes';
import analyticsRoutes from './src/server/routes/analyticsRoutes';
import { authenticateToken } from './src/server/middleware/authMiddleware';
import { DocumentController } from './src/server/controllers/documentController';

const app = express();
const PORT = process.env.PORT || 3000;

// Maximum upload size limit: 50 MB
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// Allowed document and image extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.md', '.csv', '.rtf', '.log'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/rtf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/octet-stream',
];

// Configure CORS to reflect request origin and allow credentials
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.options(
  '*',
  cors({
    origin: true,
    credentials: true,
  })
);

// Request logger for API calls
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Configure Multer memory storage and limits
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 50 MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(ext);
    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (isExtensionAllowed || isMimeAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type.'));
    }
  },
});

app.use(express.json());

// API health endpoint (Step 4)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'RedactX API is running',
  });
});

// API upload config endpoint
app.get('/api/config/upload', (_req: Request, res: Response) => {
  res.json({
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    maxFileSizeMB: 50,
    allowedExtensions: ALLOWED_EXTENSIONS,
  });
});

// Mount Authentication routes: /api/auth (POST /register, POST /login, GET /me, POST /logout)
app.use('/api/auth', authRoutes);

// Mount Document routes: /api/documents (Protected by JWT authentication)
app.use('/api/documents', authenticateToken, documentRoutes);

// Mount Dashboard routes: /api/dashboard (Protected by JWT authentication)
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Mount Reports routes: /api/reports (Protected by JWT authentication)
app.use('/api/reports', authenticateToken, reportsRoutes);

// Mount Analytics routes: /api/analytics (Protected by JWT authentication)
app.use('/api/analytics', authenticateToken, analyticsRoutes);

// Direct /api/upload alias endpoint (Protected by JWT authentication)
app.post(
  '/api/upload',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    upload.fields([
      { name: 'document', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File size exceeds the 50 MB limit.',
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload error.',
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files?.document?.[0]) {
        req.file = files.document[0];
      } else if (files?.file?.[0]) {
        req.file = files.file[0];
      }

      DocumentController.uploadDocument(req, res);
    });
  }
);

// Prevent API routes from falling through to Vite SPA HTML fallback
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.path}`,
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
