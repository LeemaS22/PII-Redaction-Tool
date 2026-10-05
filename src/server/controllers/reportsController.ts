import { Request, Response } from 'express';
import { DocumentModel, DetectionModel } from '../models/Document';
import { AuditLogModel } from '../models/AuditLog';
import { auditService } from '../services/auditService';

export class ReportsController {
  public static async getSummary(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const dateRange = req.query.dateRange as string | undefined;
      const status = req.query.status as string | undefined;

      // Fetch user documents and filter in memory
      const allDocs = await DocumentModel.find(userId ? { userId } : undefined);
      const documents = allDocs.filter((d) => {
        let match = true;
        if (status && status !== 'ALL' && d.status !== status) match = false;
        if (dateRange === '7d' && new Date(d.createdAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000) match = false;
        if (dateRange === '30d' && new Date(d.createdAt).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) match = false;
        return match;
      });
      const docIds = new Set(documents.map((d) => d._id));

      // Fetch all detections for user's documents
      const allDetections = await DetectionModel.find({});
      const detections = allDetections.filter((d) => docIds.has(d.documentId));

      const allLogs = await AuditLogModel.find({});
      const recentActivity = allLogs
        .filter((l) => docIds.has(l.documentId))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      const totalDocuments = documents.length;
      const scannedDocuments = documents.filter((d) => ['SCANNED', 'REVIEWED', 'REDACTED'].includes(d.status)).length;
      const reviewedDocuments = documents.filter((d) => d.reviewStatus === 'COMPLETED').length;
      const redactedDocuments = documents.filter((d) => d.redactionStatus === 'COMPLETED').length;
      const failedDocuments = documents.filter((d) => d.status === 'FAILED').length;

      const totalPII = detections.length;
      const totalRedacted = detections.filter((d) => d.decision === 'REDACT').length;
      const totalKept = detections.filter((d) => d.decision === 'KEEP').length;
      const totalPending = detections.filter((d) => d.decision === 'PENDING').length;

      // PII Breakdown
      const groupMap = new Map<string, number>();
      for (const det of detections) {
        const type = (det.type || 'UNKNOWN').toUpperCase();
        groupMap.set(type, (groupMap.get(type) || 0) + 1);
      }
      const piiBreakdown = Array.from(groupMap.entries()).map(([type, count]) => ({ type, count }));

      return res.json({
        success: true,
        summary: {
          totalDocuments,
          scannedDocuments,
          reviewedDocuments,
          redactedDocuments,
          failedDocuments,
          totalPII,
          totalRedacted,
          totalKept,
          totalPending,
        },
        piiBreakdown,
        recentActivity,
      });
    } catch (err: any) {
      console.error('Reports getSummary error:', err);
      return res.status(500).json({ success: false, error: 'Failed to generate report summary.' });
    }
  }

  public static async exportCsv(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { dateRange } = req.query;

      // Fetch user documents
      const allDocs = await DocumentModel.find(userId ? { userId } : undefined);
      const documents = allDocs.filter((d) => {
        let match = true;
        if (dateRange === '7d' && new Date(d.createdAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000) match = false;
        if (dateRange === '30d' && new Date(d.createdAt).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) match = false;
        return match;
      });
      const docIds = new Set(documents.map((d) => d._id));

      const allDetections = await DetectionModel.find({});
      const detections = allDetections.filter((d) => docIds.has(d.documentId));

      let csv = `RedactX Compliance & Audit Report\n`;
      csv += `Generated At,${new Date().toISOString()}\n`;
      csv += `User ID,${userId || 'ANONYMOUS'}\n`;
      csv += `Date Range,${dateRange || 'ALL'}\n\n`;

      // Summary section
      csv += `SUMMARY STATISTICS\n`;
      csv += `Total Documents,Total PII Detected,Total Redacted,Total Kept\n`;
      const totalDocs = documents.length;
      const totalPii = detections.length;
      const totalRedacted = detections.filter((d) => d.decision === 'REDACT').length;
      const totalKept = detections.filter((d) => d.decision === 'KEEP').length;
      csv += `${totalDocs},${totalPii},${totalRedacted},${totalKept}\n\n`;

      // Global PII Breakdown
      csv += `GLOBAL PII BREAKDOWN\n`;
      csv += `PII Type,Total Count,Redacted,Kept\n`;
      const globalTypeMap = new Map<string, { total: number; redacted: number; kept: number }>();
      for (const det of detections) {
        const type = (det.type || 'UNKNOWN').toUpperCase();
        if (!globalTypeMap.has(type)) {
          globalTypeMap.set(type, { total: 0, redacted: 0, kept: 0 });
        }
        const entry = globalTypeMap.get(type)!;
        entry.total++;
        if (det.decision === 'REDACT') entry.redacted++;
        if (det.decision === 'KEEP') entry.kept++;
      }
      for (const [type, stats] of globalTypeMap.entries()) {
        csv += `"${type}",${stats.total},${stats.redacted},${stats.kept}\n`;
      }
      csv += `\n`;

      // File-by-file details
      csv += `FILE-BY-FILE DETAILS & PII BREAKDOWN\n`;
      csv += `Filename,File Type,File Size,Status,Review Status,Redaction Status,Strategy,Total Detections,Redacted Count,Kept Count,PII Type Breakdown\n`;

      for (const doc of documents) {
        const docDets = detections.filter((d) => String(d.documentId) === String(doc._id));
        const docRedacted = docDets.filter((d) => d.decision === 'REDACT').length;
        const docKept = docDets.filter((d) => d.decision === 'KEEP').length;

        const fileTypeBreakdownMap = new Map<string, { total: number; redacted: number }>();
        for (const det of docDets) {
          const t = (det.type || 'UNKNOWN').toUpperCase();
          if (!fileTypeBreakdownMap.has(t)) {
            fileTypeBreakdownMap.set(t, { total: 0, redacted: 0 });
          }
          const entry = fileTypeBreakdownMap.get(t)!;
          entry.total++;
          if (det.decision === 'REDACT') entry.redacted++;
        }

        const breakdownStr = Array.from(fileTypeBreakdownMap.entries())
          .map(([t, s]) => `${t}: ${s.total} (Redacted: ${s.redacted})`)
          .join(' | ');

        const safeFilename = `"${(doc.originalName || doc.filename || 'document').replace(/"/g, '""')}"`;
        const fileType = doc.fileType || 'PDF';
        const fileSize = doc.sizeFormatted || '0 B';
        const status = doc.status || 'UPLOADED';
        const reviewStatus = doc.reviewStatus || 'PENDING';
        const redactionStatus = doc.redactionStatus || 'NOT_STARTED';
        const strategy = doc.redactionStrategy || 'STANDARD';

        csv += `${safeFilename},${fileType},${fileSize},${status},${reviewStatus},${redactionStatus},${strategy},${docDets.length},${docRedacted},${docKept},"${breakdownStr}"\n`;
      }

      await auditService.log({
        documentId: 'SYSTEM',
        action: 'REPORT_EXPORTED',
        status: 'SUCCESS',
        metadata: {
          reportType: 'DETAILED_FILE_CSV',
          dateRange: dateRange || 'ALL',
          userId,
        },
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="redactx-detailed-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    } catch (err: any) {
      console.error('Export error:', err);
      return res.status(500).json({ success: false, error: 'Failed to export report.' });
    }
  }
}
