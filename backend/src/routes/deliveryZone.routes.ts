import { Router } from 'express';
import { listActiveZones } from '../controllers/deliveryZone.controller';

const router = Router();

router.get('/active', listActiveZones);

export default router;

