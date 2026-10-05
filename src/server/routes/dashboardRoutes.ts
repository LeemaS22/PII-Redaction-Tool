import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';

const router = Router();

// Dashboard overview stats: GET /api/dashboard/stats
router.get('/stats', DashboardController.getStats);

// PII category breakdown: GET /api/dashboard/pii-breakdown
router.get('/pii-breakdown', DashboardController.getPiiBreakdown);

// Document status breakdown: GET /api/dashboard/document-status
router.get('/document-status', DashboardController.getDocumentStatusBreakdown);

// Recent documents: GET /api/dashboard/recent-documents
router.get('/recent-documents', DashboardController.getRecentDocuments);

// Recent activity audit feed: GET /api/dashboard/recent-activity
router.get('/recent-activity', DashboardController.getRecentActivity);

export default router;
