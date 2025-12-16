import express from 'express';
import {
  createSubscription,
  handleYooKassaWebhook,
  getMemberships
} from '../controllers/paymentsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-subscription', authenticate, createSubscription);

router.post('/webhook/yookassa', handleYooKassaWebhook);

router.get('/memberships', authenticate, getMemberships);

export default router;
