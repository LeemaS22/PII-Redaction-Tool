import { DocumentModel, DetectionModel, IDocument, IDetection } from '../models/Document';
import { AuditLogModel, IAuditLog } from '../models/AuditLog';

export interface DashboardStats {
  totalDocuments: number;
  scannedDocuments: number;
  reviewedDocuments: number;
  redactedDocuments: number;
  failedDocuments: number;
  totalPII: number;
  totalRedacted: number;
  totalKept: number;
  sanitizationRate: number;
}

export interface PiiBreakdownItem {
  category: string;
  type: string;
  detected: number;
  redacted: number;
  count: number;
  share: string;
}

export interface DocumentStatusItem {
  status: string;
  count: number;
  percentage: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  status: string;
  category: 'upload' | 'scan' | 'detection' | 'protection';
  documentId: string;
  documentName: string;
  detail: string;
  timestamp: string;
  rawTimestamp: Date;
}

const TYPE_DISPLAY_NAMES: Record<string, string> = {
  PERSON_NAME: 'Person Name',
  ADDRESS: 'Address',
  EMAIL: 'Email Address',
  PHONE: 'Phone Number',
  AADHAAR: 'Aadhaar Card',
  CREDIT_CARD: 'Credit / Debit Card',
  BANK_ACCOUNT: 'Bank Account',
  IP_ADDRESS: 'IP Address',
  DATE_OF_BIRTH: 'Date of Birth',
  PASSPORT: 'Passport',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export class DashboardService {
  public static async getStats(userId?: string): Promise<DashboardStats> {
    const documents = await DocumentModel.find(userId ? { userId } : undefined);
    const docIds = new Set(documents.map((d) => d._id));

    const allDetections = await DetectionModel.find({});
    const detections = allDetections.filter((d) => docIds.has(d.documentId));

    const totalDocuments = documents.length;
    const scannedDocuments = documents.filter((d) =>
      ['SCANNED', 'REVIEWED', 'REDACTED'].includes(d.status)
    ).length;
    const reviewedDocuments = documents.filter(
      (d) => d.reviewStatus === 'COMPLETED'
    ).length;
    const redactedDocuments = documents.filter(
      (d) => d.redactionStatus === 'COMPLETED' || d.status === 'REDACTED'
    ).length;
    const failedDocuments = documents.filter(
      (d) => d.status === 'FAILED' || d.redactionStatus === 'FAILED'
    ).length;

    const totalPII = detections.length;
    const totalRedacted = detections.filter((d) => d.decision === 'REDACT').length;
    const totalKept = detections.filter((d) => d.decision === 'KEEP').length;

    const sanitizationRate =
      totalPII > 0 ? Math.round((totalRedacted / totalPII) * 100) : 0;

    return {
      totalDocuments,
      scannedDocuments,
      reviewedDocuments,
      redactedDocuments,
      failedDocuments,
      totalPII,
      totalRedacted,
      totalKept,
      sanitizationRate,
    };
  }

  public static async getPiiBreakdown(userId?: string): Promise<PiiBreakdownItem[]> {
    const documents = await DocumentModel.find(userId ? { userId } : undefined);
    const docIds = new Set(documents.map((d) => d._id));

    const allDetections = await DetectionModel.find({});
    const detections = allDetections.filter((d) => docIds.has(d.documentId));

    const total = detections.length;
    const groupMap = new Map<string, { detected: number; redacted: number }>();

    for (const det of detections) {
      const type = (det.type || 'UNKNOWN').toUpperCase();
      const current = groupMap.get(type) || { detected: 0, redacted: 0 };
      current.detected += 1;
      if (det.decision === 'REDACT') {
        current.redacted += 1;
      }
      groupMap.set(type, current);
    }

    const items: PiiBreakdownItem[] = [];
    for (const [type, counts] of groupMap.entries()) {
      const sharePercent = total > 0 ? Math.round((counts.detected / total) * 100) : 0;
      items.push({
        category: TYPE_DISPLAY_NAMES[type] || type,
        type,
        detected: counts.detected,
        redacted: counts.redacted,
        count: counts.detected,
        share: `${sharePercent}%`,
      });
    }

    // Sort descending by detected count
    items.sort((a, b) => b.detected - a.detected);

    return items;
  }

  public static async getDocumentStatusBreakdown(userId?: string): Promise<DocumentStatusItem[]> {
    const documents = await DocumentModel.find(userId ? { userId } : undefined);
    const total = documents.length;

    const statusCounts: Record<string, number> = {
      UPLOADED: 0,
      SCANNED: 0,
      REVIEWED: 0,
      REDACTED: 0,
      FAILED: 0,
    };

    for (const doc of documents) {
      const s = doc.status || 'UPLOADED';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  public static async getRecentDocuments(userId?: string, limit = 6): Promise<any[]> {
    const documents = await DocumentModel.find(userId ? { userId } : undefined);
    const sorted = [...documents].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    return sorted.slice(0, limit).map((doc) => ({
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
  }

  public static async getRecentActivity(userId?: string, limit = 10): Promise<RecentActivityItem[]> {
    const documents = await DocumentModel.find(userId ? { userId } : undefined);
    const docIds = new Set(documents.map((d) => d._id));
    const docMap = new Map(documents.map((d) => [d._id, d]));

    const logs = await AuditLogModel.find({});
    const filteredLogs = logs.filter((l) => docIds.has(l.documentId));

    const sorted = [...filteredLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sorted.slice(0, limit).map((log) => {
      const doc = docMap.get(log.documentId);
      const docName = doc ? doc.originalName || doc.filename : 'Document';

      let category: 'upload' | 'scan' | 'detection' | 'protection' = 'scan';
      let actionLabel = log.action.replace(/_/g, ' ');
      let detail = '';

      switch (log.action) {
        case 'DOCUMENT_UPLOADED':
          category = 'upload';
          actionLabel = 'Document Uploaded';
          detail = `${doc?.fileType || 'File'} • ${doc?.sizeFormatted || 'Uploaded'}`;
          break;
        case 'PII_SCAN_STARTED':
          category = 'scan';
          actionLabel = 'PII Scan Started';
          detail = 'Scanning entities';
          break;
        case 'PII_SCAN_COMPLETED':
          category = 'detection';
          actionLabel = 'PII Scan Completed';
          detail = `${log.metadata?.totalDetections ?? doc?.piiCount ?? 0} entities detected`;
          break;
        case 'PII_REVIEW_STARTED':
          category = 'detection';
          actionLabel = 'PII Review Started';
          detail = 'Human review in progress';
          break;
        case 'PII_REVIEW_COMPLETED':
          category = 'detection';
          actionLabel = 'PII Review Confirmed';
          detail = `${log.metadata?.redactCount ?? 0} to redact, ${log.metadata?.keepCount ?? 0} to keep`;
          break;
        case 'REDACTION_STARTED':
          category = 'protection';
          actionLabel = 'Redaction In Progress';
          detail = `Strategy: ${log.metadata?.redactionStrategy || 'STANDARD'}`;
          break;
        case 'REDACTION_COMPLETED':
        case 'PROTECTED_DOCUMENT_GENERATED':
          category = 'protection';
          actionLabel = 'Document Protected';
          detail = `${log.metadata?.redactedCount ?? doc?.redactedCount ?? 0} entities redacted`;
          break;
        case 'PROTECTED_DOCUMENT_DOWNLOADED':
          category = 'protection';
          actionLabel = 'Protected File Downloaded';
          detail = log.metadata?.protectedFileName || 'Sanitized file';
          break;
        case 'REDACTION_FAILED':
          category = 'protection';
          actionLabel = 'Redaction Failed';
          detail = log.metadata?.errorMessage || 'Error';
          break;
      }

      return {
        id: log._id,
        action: actionLabel,
        status: log.status,
        category,
        documentId: log.documentId,
        documentName: docName,
        detail,
        timestamp: formatRelativeTime(log.timestamp),
        rawTimestamp: log.timestamp,
      };
    });
  }
}
