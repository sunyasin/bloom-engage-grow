import { prisma } from '../config/database.js';
import { yookassaService } from '../services/yookassa.js';
import dotenv from 'dotenv';

dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const createSubscription = async (req, res) => {
  try {
    const { communityId, subscriptionTierId, returnUrl } = req.body;
    const userId = req.user.id;

    if (!communityId || !subscriptionTierId) {
      return res.status(400).json({
        error: 'Missing required fields: communityId, subscriptionTierId'
      });
    }

    const tier = await prisma.subscription_tiers.findUnique({
      where: { id: subscriptionTierId }
    });

    if (!tier) {
      return res.status(404).json({ error: 'Subscription tier not found' });
    }

    if (!tier.is_active) {
      return res.status(400).json({ error: 'Subscription tier is not active' });
    }

    const community = await prisma.communities.findUnique({
      where: { id: communityId }
    });

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const transactionId = crypto.randomUUID();
    const idempotencyKey = `${userId}-${communityId}-${subscriptionTierId}-${Date.now()}`;
    const amount = Number(tier.price_monthly) || 0;

    const transaction = await prisma.transactions.create({
      data: {
        id: transactionId,
        user_id: userId,
        community_id: communityId,
        subscription_tier_id: subscriptionTierId,
        amount: amount,
        currency: 'RUB',
        status: 'pending',
        provider: 'yookassa',
        idempotency_key: idempotencyKey,
        description: `Подписка на сообщество ${community.name} / план ${tier.name}`
      }
    });

    const paymentResult = await yookassaService.createPayment({
      amount,
      description: `Подписка на сообщество ${community.name} / план ${tier.name}`,
      returnUrl: returnUrl || `${FRONTEND_URL}/payment/callback?transactionId=${transactionId}`,
      metadata: {
        userId,
        communityId,
        subscriptionTierId,
        transactionId
      },
      idempotencyKey
    });

    await prisma.transactions.update({
      where: { id: transactionId },
      data: { provider_payment_id: paymentResult.id }
    });

    return res.json({
      confirmationUrl: paymentResult.confirmation.confirmation_url,
      transactionId,
      paymentId: paymentResult.id
    });

  } catch (error) {
    console.error('Error creating subscription payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleYooKassaWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    if (!webhookData || !webhookData.object) {
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    const payment = webhookData.object;
    const paymentId = payment.id;
    const paymentStatus = payment.status;

    const transaction = await prisma.transactions.findFirst({
      where: { provider_payment_id: paymentId }
    });

    if (!transaction) {
      console.error('Transaction not found for payment:', paymentId);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (paymentStatus === 'succeeded') {
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: { status: 'succeeded' }
      });

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const existingMembership = await prisma.memberships.findFirst({
        where: {
          user_id: transaction.user_id,
          community_id: transaction.community_id
        }
      });

      if (existingMembership) {
        await prisma.memberships.update({
          where: { id: existingMembership.id },
          data: {
            subscription_tier_id: transaction.subscription_tier_id,
            status: 'active',
            started_at: new Date(),
            expires_at: expiresAt,
            renewal_period: 'monthly',
            external_subscription_id: paymentId,
            updated_at: new Date()
          }
        });
      } else {
        await prisma.memberships.create({
          data: {
            user_id: transaction.user_id,
            community_id: transaction.community_id,
            subscription_tier_id: transaction.subscription_tier_id,
            status: 'active',
            started_at: new Date(),
            expires_at: expiresAt,
            renewal_period: 'monthly',
            external_subscription_id: paymentId
          }
        });
      }

      console.log(`Payment succeeded and membership created for transaction ${transaction.id}`);
    } else if (paymentStatus === 'canceled') {
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: { status: 'canceled' }
      });

      console.log(`Payment canceled for transaction ${transaction.id}`);
    } else if (paymentStatus === 'waiting_for_capture') {
      console.log(`Payment waiting for capture for transaction ${transaction.id}`);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error handling YooKassa webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMemberships = async (req, res) => {
  try {
    const userId = req.user.id;
    const { communityId } = req.query;

    const where = {
      user_id: userId
    };

    if (communityId) {
      where.community_id = communityId;
    }

    const memberships = await prisma.memberships.findMany({
      where,
      include: {
        subscription_tier: true,
        community: true
      }
    });

    const enrichedMemberships = memberships.map(membership => {
      const now = new Date();
      const expiresAt = membership.expires_at ? new Date(membership.expires_at) : null;

      return {
        ...membership,
        isExpired: expiresAt ? expiresAt < now : false,
        isActive: membership.status === 'active' && (!expiresAt || expiresAt >= now)
      };
    });

    return res.json({ memberships: enrichedMemberships });

  } catch (error) {
    console.error('Error getting memberships:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserCommunityMembership = async (userId, communityId) => {
  try {
    const membership = await prisma.memberships.findFirst({
      where: {
        user_id: userId,
        community_id: communityId,
        status: 'active'
      },
      include: {
        subscription_tier: true
      }
    });

    if (!membership) {
      return null;
    }

    const now = new Date();
    const expiresAt = membership.expires_at ? new Date(membership.expires_at) : null;

    if (expiresAt && expiresAt < now) {
      await prisma.memberships.update({
        where: { id: membership.id },
        data: { status: 'expired' }
      });

      return null;
    }

    return membership;

  } catch (error) {
    console.error('Error getting user community membership:', error);
    return null;
  }
};
