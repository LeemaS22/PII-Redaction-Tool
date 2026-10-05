import path from 'path';
import {
  DocumentModel,
  DetectionModel,
  IDocument,
  IDetection,
  RedactionStrategy,
} from '../models/Document';
import { TxtRedactor } from '../redaction/txtRedactor';
import { DocxRedactor } from '../redaction/docxRedactor';
import { PdfRedactor } from '../redaction/pdfRedactor';
import { ImageRedactor } from '../redaction/imageRedactor';
import { auditService } from './auditService';
import { TextExtractor } from './textExtractor';

export interface RedactionResult {
  documentId: string;
  originalFileName: string;
  protectedFileName: string;
  redactedCount: number;
  keptCount: number;
  totalDetections: number;
  redactionStrategy: RedactionStrategy;
  redactionStatus: 'COMPLETED';
  redactedAt: Date;
  downloadUrl: string;
}

export class RedactionService {
  public static async redactDocument(
    documentId: string,
    requestedStrategy?: RedactionStrategy
  ): Promise<RedactionResult> {
    // 1. Find document
    const document = await DocumentModel.findById(documentId);
    if (!document) {
      const err: any = new Error(`Document with ID ${documentId} not found.`);
      err.code = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    if (!document.fileBuffer) {
      const err: any = new Error('Original document data is not available.');
      err.code = 'ORIGINAL_FILE_MISSING';
      throw err;
    }

    // 2. Verify Phase 5 review status
    if (document.reviewStatus !== 'COMPLETED') {
      const err: any = new Error(
        'Complete the PII review before generating the protected document.'
      );
      err.code = 'REVIEW_INCOMPLETE';
      throw err;
    }

    // 3. Retrieve all detections for this document
    const detections = await DetectionModel.find({ documentId });

    // 4. Confirm no detection is still PENDING
    const pendingCount = detections.filter((d) => d.decision === 'PENDING').length;
    if (pendingCount > 0) {
      const err: any = new Error(
        `There are ${pendingCount} pending detection(s). All detections must have a decision before redaction.`
      );
      err.code = 'REVIEW_INCOMPLETE';
      throw err;
    }

    const strategy: RedactionStrategy =
      requestedStrategy || document.redactionStrategy || 'STANDARD';

    // Log REDACTION_STARTED audit event
    await auditService.log({
      documentId,
      action: 'REDACTION_STARTED',
      status: 'SUCCESS',
      metadata: {
        redactionStrategy: strategy,
        totalDetections: detections.length,
      },
    });

    // Set redaction status to PROCESSING
    await DocumentModel.findByIdAndUpdate(documentId, {
      redactionStatus: 'PROCESSING',
    });

    const ext = path.extname(document.filename).toLowerCase();
    const isPdf = ext === '.pdf' || document.mimeType.includes('application/pdf');
    const isDocx =
      ext === '.docx' ||
      document.mimeType.includes('wordprocessingml') ||
      document.mimeType.includes('officedocument');
    const isTxt = ext === '.txt' || document.mimeType.includes('text/plain');
    const isImage =
      ['.png', '.jpg', '.jpeg'].includes(ext) || document.mimeType.startsWith('image/');

    let outputBuffer: Buffer;
    let actualRedactedCount = 0;
    let outputMimeType = document.mimeType;

    try {
      if (isImage) {
        const result = await ImageRedactor.redact(document.fileBuffer, document.mimeType, detections, strategy);
        outputBuffer = result.buffer;
        actualRedactedCount = result.redactedCount;
        outputMimeType = 'application/pdf';
      } else if (isTxt) {
        const result = TxtRedactor.redact(document.fileBuffer, detections, strategy);
        outputBuffer = result.buffer;
        actualRedactedCount = result.redactedCount;
        outputMimeType = 'text/plain';
      } else if (isDocx) {
        const result = DocxRedactor.redact(document.fileBuffer, detections, strategy);
        outputBuffer = result.buffer;
        actualRedactedCount = result.redactedCount;
        outputMimeType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (isPdf) {
        const result = await PdfRedactor.redact(document.fileBuffer, detections, strategy);
        outputBuffer = result.buffer;
        actualRedactedCount = result.redactedCount;
        outputMimeType = 'application/pdf';
      } else {
        // Fallback to text redactor for other text-based files
        const result = TxtRedactor.redact(document.fileBuffer, detections, strategy);
        outputBuffer = result.buffer;
        actualRedactedCount = result.redactedCount;
      }

      // 4.5 STRICT POST-GENERATION VERIFICATION (Requirements 9, 11, 21)
      const targetExtCheck = isImage ? '.pdf' : ext;
      const baseNameCheck = path.basename(document.filename, ext);
      const tempProtectedFileName = `${baseNameCheck}_redacted${targetExtCheck}`;

      let extractedProtectedText = '';
      try {
        extractedProtectedText = await TextExtractor.extract(outputBuffer, outputMimeType, tempProtectedFileName);
      } catch (e) {
        extractedProtectedText = outputBuffer.toString('utf-8');
      }

      // Strip out redaction placeholders, replacement tokens, and mask symbols to prevent false positive matches (e.g. "[REDACTED]" containing "ED" or "Ms" in boilerplate)
      const cleanedProtectedText = (extractedProtectedText || '')
        .replace(/\[REDACTED[^\]]*\]/gi, ' ')
        .replace(/\[MASKED[^\]]*\]/gi, ' ')
        .replace(/\[CONFIDENTIAL\]/gi, ' ')
        .replace(/\[PRIVACY_PROTECTED\]/gi, ' ')
        .replace(/\*{2,}/g, ' ')
        .replace(/█+/g, ' ')
        .replace(/\s+/g, ' ');

      let verificationFailed = false;
      let successfulRedactedCount = 0;
      const redactDetections = detections.filter((d) => d.decision === 'REDACT');
      const failedValues: string[] = [];

      for (const det of redactDetections) {
        if (det.value && det.value.trim().length > 0) {
          const val = det.value.trim();
          const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // Use word boundary regex if the sensitive value consists of word characters to avoid substring false positives (e.g., "ED" inside "education" or "Ms" inside "terms")
          let regex: RegExp;
          if (/^\w+$/.test(val)) {
            regex = new RegExp(`\\b${escapedVal}\\b`, 'i');
          } else {
            regex = new RegExp(escapedVal, 'i');
          }

          if (regex.test(cleanedProtectedText)) {
            console.error(`Redaction verification failed: sensitive value "${det.value}" still present in protected document text.`);
            failedValues.push(det.value);
            verificationFailed = true;
          } else {
            successfulRedactedCount++;
          }
        }
      }

      if (verificationFailed || (redactDetections.length > 0 && successfulRedactedCount === 0)) {
        await DocumentModel.findByIdAndUpdate(documentId, {
          status: 'FAILED',
          redactionStatus: 'FAILED',
        });

        const failureDetail = failedValues.length > 0
          ? `original sensitive value (${failedValues.join(', ')}) still present in the protected document text layer.`
          : 'original sensitive value is still present in the protected document text layer.';

        await auditService.log({
          documentId,
          action: 'REDACTION_FAILED',
          status: 'FAILED',
          metadata: {
            errorCode: 'VERIFICATION_FAILED',
            errorMessage: `Redaction verification failed: ${failureDetail}`,
          },
        });

        const err: any = new Error(`Redaction verification failed: ${failureDetail}`);
        err.code = 'VERIFICATION_FAILED';
        throw err;
      }

      var finalRedactedCount = successfulRedactedCount > 0 ? successfulRedactedCount : actualRedactedCount;
    } catch (processErr: any) {
      // Update document to FAILED status
      await DocumentModel.findByIdAndUpdate(documentId, {
        status: 'FAILED',
        redactionStatus: 'FAILED',
      });

      // Log REDACTION_FAILED audit event
      await auditService.log({
        documentId,
        action: 'REDACTION_FAILED',
        status: 'FAILED',
        metadata: {
          errorCode: processErr.code || 'REDACTION_ERROR',
          errorMessage: processErr.message || 'Processing failed',
        },
      });

      throw processErr;
    }

    // 5. Generate protected filename (NEVER overwrite original)
    const targetExt = isImage ? '.pdf' : ext;
    const baseName = path.basename(document.filename, ext);
    const protectedFileName = `${baseName}_redacted${targetExt}`;

    const now = new Date();
    const keptCount = detections.filter((d) => d.decision === 'KEEP').length;

    // 6. Update MongoDB document record with status = 'REDACTED'
    await DocumentModel.findByIdAndUpdate(documentId, {
      status: 'REDACTED',
      redactionStatus: 'COMPLETED',
      protectedFileName,
      protectedFileBuffer: outputBuffer,
      protectedMimeType: outputMimeType,
      redactedCount: finalRedactedCount,
      redactionStrategy: strategy,
      redactedAt: now,
    });

    // 7. Log REDACTION_COMPLETED and PROTECTED_DOCUMENT_GENERATED audit events
    await auditService.log({
      documentId,
      action: 'REDACTION_COMPLETED',
      status: 'SUCCESS',
      metadata: {
        redactedCount: finalRedactedCount,
        keptCount,
        redactionStrategy: strategy,
        protectedFileName,
      },
    });

    await auditService.log({
      documentId,
      action: 'PROTECTED_DOCUMENT_GENERATED',
      status: 'SUCCESS',
      metadata: {
        protectedFileName,
        fileSizeBytes: outputBuffer.length,
      },
    });

    return {
      documentId,
      originalFileName: document.originalName || document.filename,
      protectedFileName,
      redactedCount: finalRedactedCount,
      keptCount,
      totalDetections: detections.length,
      redactionStrategy: strategy,
      redactionStatus: 'COMPLETED',
      redactedAt: now,
      downloadUrl: `/api/documents/${documentId}/download`,
    };
  }
}
