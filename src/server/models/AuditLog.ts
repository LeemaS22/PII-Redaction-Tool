import { randomUUID } from 'crypto';

export type AuditAction =
  | 'DOCUMENT_UPLOADED'
  | 'PII_SCAN_STARTED'
  | 'PII_SCAN_COMPLETED'
  | 'PII_REVIEW_STARTED'
  | 'PII_REVIEW_COMPLETED'
  | 'REDACTION_STARTED'
  | 'REDACTION_COMPLETED'
  | 'REDACTION_FAILED'
  | 'PROTECTED_DOCUMENT_GENERATED'
  | 'PROTECTED_DOCUMENT_DOWNLOADED'
  | 'REPORT_EXPORTED';

export type AuditStatus = 'SUCCESS' | 'FAILED' | 'INFO';

export interface IAuditLog {
  _id: string;
  documentId: string;
  action: AuditAction;
  status: AuditStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// In-memory persistent collection for audit records
const auditLogsCollection = new Map<string, IAuditLog>();

export const AuditLogModel = {
  create: async (logData: Partial<IAuditLog>): Promise<IAuditLog> => {
    const id = logData._id || randomUUID();
    const log: IAuditLog = {
      _id: id,
      documentId: logData.documentId!,
      action: logData.action || 'DOCUMENT_UPLOADED',
      status: logData.status || 'SUCCESS',
      timestamp: logData.timestamp || new Date(),
      metadata: logData.metadata || {},
    };
    auditLogsCollection.set(id, log);
    return { ...log };
  },

  find: async (query: { documentId?: string }): Promise<IAuditLog[]> => {
    const all = Array.from(auditLogsCollection.values());
    let filtered = all;
    if (query.documentId) {
      filtered = all.filter((l) => l.documentId === query.documentId);
    }
    // Sort chronologically ascending
    return filtered
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((l) => ({ ...l }));
  },
};
