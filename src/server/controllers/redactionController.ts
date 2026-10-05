import { Request, Response } from 'express';
import { RedactionService } from '../services/redactionService';
import { DocumentModel, DetectionModel } from '../models/Document';
import { auditService } from '../services/auditService';
import { TextExtractor } from '../services/textExtractor';

function checkOwnership(doc: { userId?: string }, req: Request): boolean {
  if (doc.userId && req.user?.id && doc.userId !== req.user.id) {
    return false;
  }
  return true;
}

export class RedactionController {
  public static async redactDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { strategy } = req.body || {};

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

      const result = await RedactionService.redactDocument(id, strategy);

      return res.json({
        success: true,
        data: result,
        message: 'Protected document generated successfully.',
      });
    } catch (err: any) {
      console.error('Redaction controller error:', err);
      const statusCode =
        err.code === 'DOCUMENT_NOT_FOUND'
          ? 404
          : err.code === 'REVIEW_INCOMPLETE'
          ? 400
          : err.code === 'IMAGE_REDACTION_UNSUPPORTED'
          ? 422
          : 500;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: err.code || 'REDACTION_FAILED',
          message: err.message || 'The protected document could not be generated.',
        },
      });
    }
  }

  public static async previewProtectedDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const raw = req.query.raw === 'true';

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Document ID is required.',
          },
        });
      }

      const document = await DocumentModel.findById(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
          },
        });
      }

      if (!checkOwnership(document, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      if (document.redactionStatus !== 'COMPLETED' || !document.protectedFileBuffer) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NOT_REDACTED',
            message: 'The protected document has not been generated yet.',
          },
        });
      }

      const filename = document.protectedFileName || `${document.originalName}_redacted.pdf`;
      const mimeType = document.protectedMimeType || 'application/octet-stream';

      // If client requests raw binary for iframe/embed viewing
      if (raw) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length', document.protectedFileBuffer.length);
        return res.send(document.protectedFileBuffer);
      }

      // Extract sanitized text content from protected file buffer
      let textContent = '';
      try {
        textContent = await TextExtractor.extract(
          document.protectedFileBuffer,
          mimeType,
          filename
        );
      } catch (e) {
        textContent = document.protectedFileBuffer.toString('utf-8');
      }

      const detections = await DetectionModel.find({ documentId: id });
      const redactedDetections = detections.filter((d) => d.decision === 'REDACT');
      const keptDetections = detections.filter((d) => d.decision === 'KEEP');

      return res.json({
        success: true,
        data: {
          documentId: id,
          filename,
          originalName: document.originalName || document.filename,
          mimeType,
          fileType: document.fileType,
          fileSizeBytes: document.protectedFileBuffer.length,
          redactionStrategy: document.redactionStrategy || 'STANDARD',
          redactedCount: document.redactedCount || redactedDetections.length,
          keptCount: keptDetections.length,
          totalDetections: detections.length,
          textContent,
          rawUrl: `/api/documents/${id}/preview?raw=true`,
          downloadUrl: `/api/documents/${id}/download`,
        },
      });
    } catch (err: any) {
      console.error('Preview error:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PREVIEW_FAILED',
          message: err.message || 'Error occurred while generating document preview.',
        },
      });
    }
  }

  public static async downloadProtectedDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const isInline = req.query.inline === 'true';

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Document ID is required.',
          },
        });
      }

      const document = await DocumentModel.findById(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found.',
          },
        });
      }

      if (!checkOwnership(document, req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'You do not have permission to access this document.',
          },
        });
      }

      if (document.redactionStatus !== 'COMPLETED' || !document.protectedFileBuffer) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NOT_REDACTED',
            message: 'The protected document has not been generated yet.',
          },
        });
      }

      const filename = document.protectedFileName || `${document.originalName}_redacted.pdf`;
      const mimeType = document.protectedMimeType || 'application/octet-stream';

      // Log PROTECTED_DOCUMENT_DOWNLOADED audit event only on actual downloads (not inline previews)
      if (!isInline) {
        await auditService.log({
          documentId: id,
          action: 'PROTECTED_DOCUMENT_DOWNLOADED',
          status: 'SUCCESS',
          metadata: {
            protectedFileName: filename,
            fileSizeBytes: document.protectedFileBuffer.length,
          },
        });
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `${isInline ? 'inline' : 'attachment'}; filename="${filename}"`
      );
      res.setHeader('Content-Length', document.protectedFileBuffer.length);

      return res.send(document.protectedFileBuffer);
    } catch (err: any) {
      console.error('Download error:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: err.message || 'Error occurred while downloading the protected document.',
        },
      });
    }
  }
}
