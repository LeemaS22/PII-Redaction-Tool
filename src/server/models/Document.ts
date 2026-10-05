import { randomUUID } from 'crypto';

export type DocumentProcessingStatus =
  | 'UPLOADED'
  | 'SCANNING'
  | 'SCANNED'
  | 'REVIEWED'
  | 'REDACTED'
  | 'FAILED';

export type RedactionStatus = 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type RedactionStrategy = 'STANDARD' | 'MASK' | 'STRICT';

export interface IDocument {
  _id: string;
  userId?: string;
  filename: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  size: number;
  sizeFormatted: string;
  fileBuffer?: Buffer;
  status: DocumentProcessingStatus;
  reviewStatus: 'PENDING' | 'IN_REVIEW' | 'COMPLETED';
  redactionStatus: RedactionStatus;
  piiCount: number;
  redactedCount: number;
  privacyScore: number | null;
  redactionStrategy?: RedactionStrategy;
  protectedFileName?: string;
  protectedFileBuffer?: Buffer;
  protectedMimeType?: string;
  redactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDecision = 'PENDING' | 'REDACT' | 'KEEP';

export interface IDetection {
  _id: string;
  documentId: string;
  type: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  source: 'REGEX' | 'RULE' | 'NLP';
  status: 'DETECTED' | 'REDACTED';
  decision: ReviewDecision;
  createdAt: Date;
  updatedAt?: Date;
}

// In-memory persistent collections that simulate MongoDB collection operations
const documentsCollection = new Map<string, IDocument>();
const detectionsCollection = new Map<string, IDetection>();

export const DocumentModel = {
  create: async (docData: Partial<IDocument>): Promise<IDocument> => {
    const id = docData._id || randomUUID();
    const now = new Date();
    const doc: IDocument = {
      _id: id,
      userId: docData.userId,
      filename: docData.filename || 'document.pdf',
      originalName: docData.originalName || docData.filename || 'document.pdf',
      fileType: docData.fileType || 'PDF',
      mimeType: docData.mimeType || 'application/octet-stream',
      size: docData.size || 0,
      sizeFormatted: docData.sizeFormatted || '0 B',
      fileBuffer: docData.fileBuffer,
      status: docData.status || 'UPLOADED',
      reviewStatus: docData.reviewStatus || 'PENDING',
      redactionStatus: docData.redactionStatus || 'NOT_STARTED',
      piiCount: docData.piiCount || 0,
      redactedCount: 0,
      privacyScore: null,
      createdAt: now,
      updatedAt: now,
    };
    documentsCollection.set(id, doc);
    return { ...doc };
  },

  findById: async (id: string): Promise<IDocument | null> => {
    const doc = documentsCollection.get(id);
    if (!doc) return null;
    return { ...doc };
  },

  findByIdAndUpdate: async (
    id: string,
    updates: Partial<IDocument>
  ): Promise<IDocument | null> => {
    const existing = documentsCollection.get(id);
    if (!existing) return null;
    const updated: IDocument = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    documentsCollection.set(id, updated);
    return { ...updated };
  },

  find: async (query?: { status?: string; userId?: string }): Promise<IDocument[]> => {
    const all = Array.from(documentsCollection.values());
    let filtered = all;
    if (query?.userId) {
      filtered = filtered.filter((d) => d.userId === query.userId);
    }
    if (query?.status && query.status !== 'ALL') {
      filtered = filtered.filter((d) => d.status === query.status);
    }
    // Sort descending by createdAt
    return filtered
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((d) => ({ ...d }));
  },
};

export const DetectionModel = {
  create: async (detData: Partial<IDetection>): Promise<IDetection> => {
    const id = detData._id || randomUUID();
    const now = new Date();
    const detection: IDetection = {
      _id: id,
      documentId: detData.documentId!,
      type: detData.type || 'UNKNOWN',
      value: detData.value || '',
      confidence: detData.confidence ?? 0.95,
      startIndex: detData.startIndex ?? 0,
      endIndex: detData.endIndex ?? 0,
      source: detData.source || 'REGEX',
      status: 'DETECTED',
      decision: detData.decision || 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    detectionsCollection.set(id, detection);
    return { ...detection };
  },

  createMany: async (detections: Partial<IDetection>[]): Promise<IDetection[]> => {
    const results: IDetection[] = [];
    for (const d of detections) {
      const created = await DetectionModel.create(d);
      results.push(created);
    }
    return results;
  },

  findById: async (id: string): Promise<IDetection | null> => {
    const det = detectionsCollection.get(id);
    if (!det) return null;
    return { ...det };
  },

  findByIdAndUpdate: async (
    id: string,
    updates: Partial<IDetection>
  ): Promise<IDetection | null> => {
    const existing = detectionsCollection.get(id);
    if (!existing) return null;
    const updated: IDetection = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    detectionsCollection.set(id, updated);
    return { ...updated };
  },

  find: async (query: { documentId?: string }): Promise<IDetection[]> => {
    const all = Array.from(detectionsCollection.values());
    if (query.documentId) {
      return all
        .filter((d) => d.documentId === query.documentId)
        .map((d) => ({ ...d }));
    }
    return all.map((d) => ({ ...d }));
  },

  deleteMany: async (query: { documentId: string }): Promise<number> => {
    let deletedCount = 0;
    for (const [id, det] of detectionsCollection.entries()) {
      if (det.documentId === query.documentId) {
        detectionsCollection.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  },
};
