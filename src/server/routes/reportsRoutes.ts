import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';

const router = Router();

router.get('/summary', ReportsController.getSummary);
router.get('/export', ReportsController.exportCsv);

export default router;
