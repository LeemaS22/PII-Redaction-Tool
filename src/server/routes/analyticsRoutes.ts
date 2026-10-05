import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();

router.get('/pii-exposure', AnalyticsController.getPIIExposureAnalytics);

export default router;
