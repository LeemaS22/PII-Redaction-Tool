import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { DocumentController } from '../controllers/documentController';
import { RedactionController } from '../controllers/redactionController';

const router = Router();

// Multer 50 MB limit
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
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

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
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

// List all documents: GET /api/documents
router.get('/', DocumentController.getDocumentsList);

// Upload document endpoint: POST /api/documents/upload
router.post(
  '/upload',
  (req, res, next) => {
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

      // Normalize file to req.file
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files?.document?.[0]) {
        req.file = files.document[0];
      } else if (files?.file?.[0]) {
        req.file = files.file[0];
      }

      next();
    });
  },
  DocumentController.uploadDocument
);

// Get document audit history: GET /api/documents/:id/history
router.get('/:id/history', DocumentController.getDocumentHistory);

// Scan document endpoint: POST /api/documents/:id/scan
router.post('/:id/scan', DocumentController.scanDocument);

// Get document details endpoint: GET /api/documents/:id
router.get('/:id', DocumentController.getDocument);

// Get detections for document: GET /api/documents/:id/detections
router.get('/:id/detections', DocumentController.getDetections);

// Submit full review decisions: PUT /api/documents/:id/detections/review
router.put('/:id/detections/review', DocumentController.submitReview);

// Update single detection decision: PUT /api/documents/:id/detections/:detectionId/decision
router.put('/:id/detections/:detectionId/decision', DocumentController.updateSingleDecision);
router.patch('/:id/detections/:detectionId/decision', DocumentController.updateSingleDecision);

// Phase 6: Document Redaction endpoint: POST /api/documents/:id/redact
router.post('/:id/redact', RedactionController.redactDocument);

// Phase 6: Download protected document: GET /api/documents/:id/download
router.get('/:id/download', RedactionController.downloadProtectedDocument);

// Preview protected document: GET /api/documents/:id/preview
router.get('/:id/preview', RedactionController.previewProtectedDocument);

// View/Download original document: GET /api/documents/:id/original
router.get('/:id/original', DocumentController.downloadOriginalDocument);

export default router;
