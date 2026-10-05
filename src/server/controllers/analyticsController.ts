import { Request, Response } from 'express';
import { DetectionModel, DocumentModel } from '../models/Document';

export class AnalyticsController {
  public static async getPIIExposureAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userDocs = await DocumentModel.find(userId ? { userId } : undefined);
      const docIds = new Set(userDocs.map((d) => d._id));

      const allDetections = await DetectionModel.find({});
      const userDetections = allDetections.filter((d) => docIds.has(d.documentId));

      const exposureMap = new Map<string, number>();
      for (const det of userDetections) {
        const type = (det.type || 'UNKNOWN').toUpperCase();
        exposureMap.set(type, (exposureMap.get(type) || 0) + 1);
      }

      const analytics = Array.from(exposureMap.entries())
        .map(([type, count]) => ({
          type,
          count,
          riskScore: count > 10 ? 'HIGH' : count > 5 ? 'MEDIUM' : 'LOW',
        }))
        .sort((a, b) => b.count - a.count);

      return res.json({ success: true, data: analytics });
    } catch (err: any) {
      console.error('Analytics error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch analytics.' });
    }
  }
}
