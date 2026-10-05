import { Request, Response } from 'express';
import { DocumentModel, DetectionModel, ReviewDecision } from '../models/Document';
import { ScanService } from '../services/scanService';
import { auditService } from '../services/auditService';
import {
  isValidDocumentId,
  sanitizeFilename,
  validateDetectionTypes,
  isValidReviewDecision,
} from '../utils/validation';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const VALID_REVIEW_DECISIONS: ReviewDecision[] = ['REDACT', 'KEEP'];
const MAX_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024; // 50 MB

function checkOwnership(doc: { userId?: string }, req: Request): boolean {
  if (doc.userId && req.user?.id && doc.userId !== req.user.id) {
    return false;
  }
  return true;
}

export class DocumentController {
  public static async uploadDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'Please select a document before starting the scan.',
          },
        });
      }

      const file = req.file;

      if (!file.buffer || file.size === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_FILE',
            message: 'Uploaded file cannot be empty.',
          },
        });
      }

      if (file.size > MAX_UPLOAD_LIMIT_BYTES) {
        return res.status(413).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds the 50 MB limit.',
          },
        });
      }

      // Sanitize original filename to protect against path traversal
      const safeOriginalName = sanitizeFilename(file.originalname);
      const extension = safeOriginalName.split('.').pop()?.toUpperCase() || 'FILE';
      const sizeFormatted = formatFileSize(file.size);

      // Save document to MongoDB with status = 'UPLOADED'
      const doc = await DocumentModel.create({
        userId: req.user?.id,
        filename: safeOriginalName,
        originalName: safeOriginalName,
        fileType: extension,
        mimeType: file.mimetype,
        size: file.size,
        sizeFormatted,
        fileBuffer: file.buffer,
        status: 'UPLOADED',
        reviewStatus: 'PENDING',
        redactionStatus: 'NOT_STARTED',
        piiCount: 0,
        redactedCount: 0,
        privacyScore: null,
      });

      // Log DOCUMENT_UPLOADED audit event
      await auditService.log({
        documentId: doc._id,
        action: 'DOCUMENT_UPLOADED',
        status: 'SUCCESS',
        metadata: {
          filename: doc.originalName,
          fileType: doc.fileType,
          fileSize: doc.sizeFormatted,
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          documentId: doc._id,
          id: doc._id,
          filename: doc.originalName,
          fileType: doc.fileType,
          fileSize: doc.sizeFormatted,
          status: doc.status,
          reviewStatus: doc.reviewStatus,
          redactionStatus: doc.redactionStatus,
        },
      });
    } catch (err: any) {
      console.error('Document upload error:', err.message || err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Internal server error during document upload.',
        },
      });
    }
  }

  public static async scanDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidDocumentId(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_ID',
            message: 'Invalid document ID format.',
          },
        });
      }

      const doc = await DocumentModel.findById(id);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
          },
        });
      }

      if (!checkOwnership(doc, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      const { detectionTypes } = req.body || {};
      const validatedTypes = validateDetectionTypes(detectionTypes);

      const result = await ScanService.scanDocument(id, validatedTypes);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('Scan error:', err.message || err);
      const isNotFound = err.message?.includes('not found');
      const statusCode = isNotFound ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: isNotFound ? 'DOCUMENT_NOT_FOUND' : 'SCAN_FAILED',
          message: err.message || 'Failed to scan document.',
        },
      });
    }
  }

  public static async getDocumentsList(req: Request, res: Response) {
    try {
      const statusFilter = req.query.status as string | undefined;
      const userId = req.user?.id;
      const documents = await DocumentModel.find({
        userId,
        status: statusFilter && statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      const list = documents.map((doc) => ({
        id: doc._id,
        documentId: doc._id,
        fileName: doc.originalName || doc.filename,
        filename: doc.originalName || doc.filename,
        fileType: doc.fileType,
        fileSize: doc.sizeFormatted,
        status: doc.status,
        reviewStatus: doc.reviewStatus,
        redactionStatus: doc.redactionStatus,
        piiCount: doc.piiCount,
        redactedCount: doc.redactedCount,
        protectedFileName: doc.protectedFileName,
        redactionStrategy: doc.redactionStrategy,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      return res.json({
        success: true,
        data: list,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: err.message || 'Error fetching document list.',
        },
      });
    }
  }

  public static async getDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidDocumentId(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_ID',
            message: 'Invalid document ID format.',
          },
        });
      }

      const doc = await DocumentModel.findById(id);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
          },
        });
      }

      if (!checkOwnership(doc, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      const detections = await DetectionModel.find({ documentId: id });
      const history = await auditService.getHistory(id);

      return res.json({
        success: true,
        data: {
          documentId: doc._id,
          id: doc._id,
          filename: doc.originalName,
          fileType: doc.fileType,
          fileSize: doc.sizeFormatted,
          status: doc.status,
          reviewStatus: doc.reviewStatus,
          redactionStatus: doc.redactionStatus,
          piiCount: doc.piiCount,
          redactedCount: doc.redactedCount,
          privacyScore: doc.privacyScore,
          redactionStrategy: doc.redactionStrategy,
          protectedFileName: doc.protectedFileName,
          redactedAt: doc.redactedAt,
          detections: detections.map((d) => ({
            id: d._id,
            documentId: d.documentId,
            type: d.type,
            value: d.value,
            confidence: d.confidence,
            startIndex: d.startIndex,
            endIndex: d.endIndex,
            source: d.source,
            status: d.status,
            decision: d.decision,
            createdAt: d.createdAt,
          })),
          history,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: err.message || 'Error fetching document.',
        },
      });
    }
  }

  public static async getDocumentHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidDocumentId(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_ID',
            message: 'Invalid document ID format.',
          },
        });
      }

      const doc = await DocumentModel.findById(id);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
          },
        });
      }

      if (!checkOwnership(doc, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      const history = await auditService.getHistory(id);

      return res.json({
        success: true,
        data: {
          documentId: doc._id,
          filename: doc.originalName || doc.filename,
          fileType: doc.fileType,
          fileSize: doc.sizeFormatted,
          status: doc.status,
          reviewStatus: doc.reviewStatus,
          redactionStatus: doc.redactionStatus,
          piiCount: doc.piiCount,
          redactedCount: doc.redactedCount,
          protectedFileName: doc.protectedFileName,
          redactionStrategy: doc.redactionStrategy,
          history,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'HISTORY_FETCH_FAILED',
          message: err.message || 'Error fetching document history.',
        },
      });
    }
  }

  public static async getDetections(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidDocumentId(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_ID',
            message: 'Invalid document ID format.',
          },
        });
      }

      const doc = await DocumentModel.findById(id);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
          },
        });
      }

      if (!checkOwnership(doc, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      const detections = await DetectionModel.find({ documentId: id });

      return res.json({
        success: true,
        data: {
          documentId: doc._id,
          filename: doc.originalName,
          fileType: doc.fileType,
          fileSize: doc.sizeFormatted,
          status: doc.status,
          reviewStatus: doc.reviewStatus,
          redactionStatus: doc.redactionStatus,
          piiCount: doc.piiCount,
          detections: detections.map((d) => ({
            id: d._id,
            documentId: d.documentId,
            type: d.type,
            value: d.value,
            confidence: d.confidence,
            startIndex: d.startIndex,
            endIndex: d.endIndex,
            source: d.source,
            status: d.status,
            decision: d.decision,
            createdAt: d.createdAt,
          })),
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DETECTIONS_FETCH_FAILED',
          message: err.message || 'Error fetching detections.',
        },
      });
    }
  }

  public static async updateSingleDecision(req: Request, res: Response) {
    try {
      const { id, detectionId } = req.params;
      const { decision } = req.body || {};

      if (!isValidDocumentId(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_ID',
            message: 'Invalid document ID format.',
          },
        });
      }

      if (!isValidDocumentId(detectionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DETECTION_ID',
            message: 'Invalid detection ID format.',
          },
        });
      }

      const doc = await DocumentModel.findById(id);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
          },
        });
      }

      if (!checkOwnership(doc, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      if (!VALID_REVIEW_DECISIONS.includes(decision) && decision !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REVIEW_DECISION',
            message: `Invalid review decision '${decision}'. Allowed values: REDACT, KEEP, PENDING.`,
          },
        });
      }

      const detection = await DetectionModel.findById(detectionId);
      if (!detection || detection.documentId !== id) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DETECTION_NOT_FOUND',
            message: 'Detection not found or does not belong to this document.',
          },
        });
      }

      const updated = await DetectionModel.findByIdAndUpdate(detectionId, {
        decision: decision as ReviewDecision,
      });

      // Update document reviewStatus to IN_REVIEW if not already COMPLETED
      if (doc.reviewStatus === 'PENDING') {
        await DocumentModel.findByIdAndUpdate(id, { reviewStatus: 'IN_REVIEW' });
        // Log PII_REVIEW_STARTED audit event
        await auditService.log({
          documentId: id,
          action: 'PII_REVIEW_STARTED',
          status: 'SUCCESS',
          metadata: {
            totalDetections: doc.piiCount,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          detectionId: updated?._id,
          decision: updated?.decision,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_DECISION_FAILED',
          message: err.message || 'Error updating detection decision.',
        },
      });
    }
  }

  public static async submitReview(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidDocumentId(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_ID',
            message: 'Invalid document ID format.',
          },
        });
      }

      const body = req.body || {};

      // If user sends invalid direct decision property
      if (body.decision && !isValidReviewDecision(body.decision)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REVIEW_DECISION',
            message: `Invalid review decision '${body.decision}'. Allowed values: REDACT, KEEP.`,
          },
        });
      }

      const { decisions } = body;

      // 1. Validate document existence
      const doc = await DocumentModel.findById(id);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
          },
        });
      }

      if (!checkOwnership(doc, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      // 2. Validate decisions payload structure
      if (!Array.isArray(decisions) || decisions.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Decisions array is required and must not be empty.',
          },
        });
      }

      // 3. Retrieve all existing detections for this document from MongoDB
      const existingDetections = await DetectionModel.find({ documentId: id });
      const detectionMap = new Map(existingDetections.map((d) => [d._id, d]));

      // 4. Validate each decision item
      for (const item of decisions) {
        const { detectionId, decision } = item;
        if (!isValidDocumentId(detectionId)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DETECTION_ID',
              message: `Invalid detectionId format for item.`,
            },
          });
        }

        if (!isValidReviewDecision(decision)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REVIEW_DECISION',
              message: `Invalid review decision '${decision}'. Allowed values: REDACT, KEEP.`,
            },
          });
        }

        const existing = detectionMap.get(detectionId);
        if (!existing) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'DETECTION_MISMATCH',
              message: `Detection ${detectionId} does not belong to document ${id}.`,
            },
          });
        }
      }

      // 5. Update decisions in MongoDB
      for (const item of decisions) {
        await DetectionModel.findByIdAndUpdate(item.detectionId, {
          decision: item.decision as ReviewDecision,
        });
      }

      // 6. Refresh and verify all detections for this document
      const updatedDetections = await DetectionModel.find({ documentId: id });
      const totalDetections = updatedDetections.length;
      const redactCount = updatedDetections.filter((d) => d.decision === 'REDACT').length;
      const keepCount = updatedDetections.filter((d) => d.decision === 'KEEP').length;
      const pendingCount = updatedDetections.filter((d) => d.decision === 'PENDING').length;

      const isReviewFullyCompleted = pendingCount === 0 && totalDetections > 0;
      const newReviewStatus = isReviewFullyCompleted ? 'COMPLETED' : 'IN_REVIEW';
      const newDocStatus = isReviewFullyCompleted ? 'REVIEWED' : doc.status;

      // 7. Update document status and reviewStatus in MongoDB
      await DocumentModel.findByIdAndUpdate(id, {
        status: newDocStatus,
        reviewStatus: newReviewStatus,
        redactedCount: redactCount,
      });

      // 8. Record audit log event if fully reviewed
      if (isReviewFullyCompleted) {
        await auditService.log({
          documentId: id,
          action: 'PII_REVIEW_COMPLETED',
          status: 'SUCCESS',
          metadata: {
            totalDetections,
            redactCount,
            keepCount,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          documentId: id,
          status: newDocStatus,
          reviewStatus: newReviewStatus,
          totalDetections,
          redactCount,
          keepCount,
          pendingCount,
        },
        message: 'PII review completed successfully.',
      });
    } catch (err: any) {
      console.error('Submit review error:', err.message || err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'REVIEW_FAILED',
          message: err.message || 'Failed to submit review decisions.',
        },
      });
    }
  }

  public static async downloadOriginalDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Document ID is required.',
          },
        });
      }

      const doc = await DocumentModel.findById(id);
      if (!doc || !doc.fileBuffer) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Original document file buffer not found.',
          },
        });
      }

      if (!checkOwnership(doc, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      const filename = doc.originalName || doc.filename || 'document.pdf';
      const mimeType = doc.mimeType || 'application/pdf';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', doc.fileBuffer.length);
      return res.send(doc.fileBuffer);
    } catch (err: any) {
      console.error('Download original error:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: err.message || 'Error occurred while loading the original document.',
        },
      });
    }
  }
}
