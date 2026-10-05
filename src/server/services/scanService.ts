import { DocumentModel, DetectionModel, IDocument, IDetection, ReviewDecision } from '../models/Document';
import { TextExtractor } from './textExtractor';
import { DetectionService } from './detectionService';
import { auditService } from './auditService';

export interface ScanResult {
  documentId: string;
  filename: string;
  fileType: string;
  fileSize: string;
  status: 'SCANNED';
  reviewStatus: 'PENDING';
  piiCount: number;
  detections: {
    id: string;
    documentId: string;
    type: string;
    value: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
    source: 'REGEX' | 'RULE' | 'NLP';
    status: 'DETECTED';
    decision: ReviewDecision;
    createdAt: Date;
  }[];
}

export class ScanService {
  public static async scanDocument(
    documentId: string,
    detectionTypes?: string[]
  ): Promise<ScanResult> {
    const document = await DocumentModel.findById(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found.`);
    }

    if (!document.fileBuffer) {
      throw new Error('Uploaded file data is not available for scanning.');
    }

    // Record PII_SCAN_STARTED audit event
    await auditService.log({
      documentId,
      action: 'PII_SCAN_STARTED',
      status: 'SUCCESS',
      metadata: {
        requestedTypes: detectionTypes || ['ALL'],
      },
    });

    // Update status to SCANNING
    await DocumentModel.findByIdAndUpdate(documentId, { status: 'SCANNING' });

    try {
      // 1. Extract text from stored file
      const extractedText = await TextExtractor.extract(
        document.fileBuffer,
        document.mimeType,
        document.filename
      );

      // 2. Clear any prior detections for this document to prevent duplicates on re-scan
      await DetectionModel.deleteMany({ documentId });

      // 3. Run unified PII detection (Structured Regex + Local NLP) on extracted text
      const detectedEntities = DetectionService.detectAll(extractedText, detectionTypes);

      // 4. Save detections to MongoDB (with initial decision = 'PENDING')
      const detectionRecordsToCreate = detectedEntities.map((entity) => ({
        documentId,
        type: entity.type,
        value: entity.value,
        confidence: entity.confidence,
        startIndex: entity.startIndex,
        endIndex: entity.endIndex,
        source: entity.source,
        status: 'DETECTED' as const,
        decision: 'PENDING' as const,
      }));

      const savedDetections = await DetectionModel.createMany(detectionRecordsToCreate);

      // 5. Update Document record in MongoDB (status = 'SCANNED', reviewStatus = 'PENDING')
      await DocumentModel.findByIdAndUpdate(documentId, {
        status: 'SCANNED',
        reviewStatus: 'PENDING',
        piiCount: savedDetections.length,
        redactedCount: 0,
        privacyScore: null,
      });

      // Record PII_SCAN_COMPLETED audit event
      await auditService.log({
        documentId,
        action: 'PII_SCAN_COMPLETED',
        status: 'SUCCESS',
        metadata: {
          totalDetections: savedDetections.length,
        },
      });

      return {
        documentId,
        filename: document.originalName || document.filename,
        fileType: document.fileType,
        fileSize: document.sizeFormatted,
        status: 'SCANNED',
        reviewStatus: 'PENDING',
        piiCount: savedDetections.length,
        detections: savedDetections.map((d) => ({
          id: d._id,
          documentId: d.documentId,
          type: d.type,
          value: d.value,
          confidence: d.confidence,
          startIndex: d.startIndex,
          endIndex: d.endIndex,
          source: d.source,
          status: 'DETECTED',
          decision: d.decision,
          createdAt: d.createdAt,
        })),
      };
    } catch (err: any) {
      // Transition to FAILED state and clean up partial state
      await DocumentModel.findByIdAndUpdate(documentId, { status: 'FAILED' });
      await DetectionModel.deleteMany({ documentId });
      await auditService.log({
        documentId,
        action: 'PII_SCAN_COMPLETED',
        status: 'FAILED',
        metadata: {
          error: err?.message || 'Scan processing error',
        },
      });
      throw err;
    }
  }
}
