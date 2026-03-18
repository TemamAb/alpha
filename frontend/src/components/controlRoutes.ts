import { Router } from 'express';
import {
  setCapitalVelocity,
  setReinvestmentRate,
  toggleStrategy,
  emergencyStop,
  saveMatrixConfiguration,
} from '../controllers/controlController';

const router = Router();

// Corresponds to /api/v1/controls/velocity
router.post('/controls/velocity', setCapitalVelocity);

// Corresponds to /api/v1/controls/reinvest
router.post('/controls/reinvest', setReinvestmentRate);

// Corresponds to /api/v1/strategies/:strategyId/toggle
router.post('/strategies/:strategyId/toggle', toggleStrategy);

// Corresponds to /api/v1/system/emergency-stop
router.post('/system/emergency-stop', emergencyStop);

// Corresponds to /api/v1/matrix/configuration
router.post('/matrix/configuration', saveMatrixConfiguration);

export default router;