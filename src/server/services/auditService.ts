import { AuditLogModel, AuditAction, AuditStatus, IAuditLog } from '../models/AuditLog';

export interface CreateAuditLogParams {
  documentId: string;
  action: AuditAction;
  status?: AuditStatus;
  metadata?: Record<string, any>;
}

export class AuditService {
  public static async log({
    documentId,
    action,
    status = 'SUCCESS',
    metadata = {},
  }: CreateAuditLogParams): Promise<IAuditLog> {
    try {
      // Ensure no raw sensitive values are leaked in metadata
      const sanitizedMeta: Record<string, any> = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (
          !['email', 'phone', 'aadhaar', 'cardNumber', 'bankAccount', 'passport', 'dob'].includes(
            key.toLowerCase()
          )
        ) {
          sanitizedMeta[key] = value;
        }
      }

      return await AuditLogModel.create({
        documentId,
        action,
        status,
        timestamp: new Date(),
        metadata: sanitizedMeta,
      });
    } catch (err) {
      console.warn('Failed to record audit log:', err);
      // Fallback object to avoid breaking request flow
      return {
        _id: 'temp',
        documentId,
        action,
        status,
        timestamp: new Date(),
        metadata,
      };
    }
  }

  public static async getHistory(documentId: string): Promise<IAuditLog[]> {
    return await AuditLogModel.find({ documentId });
  }
}

export const auditService = AuditService;
