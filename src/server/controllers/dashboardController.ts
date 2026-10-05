import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';

export class DashboardController {
  public static async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const stats = await DashboardService.getStats(userId);
      return res.json({
        success: true,
        data: stats,
      });
    } catch (err: any) {
      console.error('Dashboard getStats error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error calculating dashboard statistics.',
      });
    }
  }

  public static async getPiiBreakdown(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const breakdown = await DashboardService.getPiiBreakdown(userId);
      return res.json({
        success: true,
        data: breakdown,
      });
    } catch (err: any) {
      console.error('Dashboard getPiiBreakdown error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error calculating PII breakdown.',
      });
    }
  }

  public static async getDocumentStatusBreakdown(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const breakdown = await DashboardService.getDocumentStatusBreakdown(userId);
      return res.json({
        success: true,
        data: breakdown,
      });
    } catch (err: any) {
      console.error('Dashboard getDocumentStatusBreakdown error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error calculating document status breakdown.',
      });
    }
  }

  public static async getRecentDocuments(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;
      const recent = await DashboardService.getRecentDocuments(userId, limit);
      return res.json({
        success: true,
        data: recent,
      });
    } catch (err: any) {
      console.error('Dashboard getRecentDocuments error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error fetching recent documents.',
      });
    }
  }

  public static async getRecentActivity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const activity = await DashboardService.getRecentActivity(userId, limit);
      return res.json({
        success: true,
        data: activity,
      });
    } catch (err: any) {
      console.error('Dashboard getRecentActivity error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error fetching recent activity.',
      });
    }
  }
}
