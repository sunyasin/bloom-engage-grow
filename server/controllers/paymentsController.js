import { supabaseAdmin } from '../config/supabase.js';
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

    const { data: tier, error: tierError } = await supabaseAdmin
      .from('subscription_tiers')
      .select('*')
      .eq('id', subscriptionTierId)
      .single();

    if (tierError || !tier) {
      return res.status(404).json({ error: 'Subscription tier not found' });
    }

    if (!tier.is_active) {
      return res.status(400).json({ error: 'Subscription tier is not active' });
    }

    const { data: community, error: communityError } = await supabaseAdmin
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .single();

    if (communityError || !community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const transactionId = crypto.randomUUID();
    const idempotencyKey = `${userId}-${communityId}-${subscriptionTierId}-${Date.now()}`;
    const amount = tier.price_monthly || 0;

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
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
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Failed to create transaction:', transactionError);
      return res.status(500).json({ error: 'Failed to create transaction' });
    }

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

    await supabaseAdmin
      .from('transactions')
      .update({ provider_payment_id: paymentResult.id })
      .eq('id', transactionId);

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

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('provider_payment_id', paymentId)
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction not found for payment:', paymentId);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (paymentStatus === 'succeeded') {
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'succeeded' })
        .eq('id', transaction.id);

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { data: existingMembership } = await supabaseAdmin
        .from('memberships')
        .select('*')
        .eq('user_id', transaction.user_id)
        .eq('community_id', transaction.community_id)
        .single();

      if (existingMembership) {
        await supabaseAdmin
          .from('memberships')
          .update({
            subscription_tier_id: transaction.subscription_tier_id,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            renewal_period: 'monthly',
            external_subscription_id: paymentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMembership.id);
      } else {
        await supabaseAdmin
          .from('memberships')
          .insert({
            user_id: transaction.user_id,
            community_id: transaction.community_id,
            subscription_tier_id: transaction.subscription_tier_id,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            renewal_period: 'monthly',
            external_subscription_id: paymentId
          });
      }

      console.log(`Payment succeeded and membership created for transaction ${transaction.id}`);
    } else if (paymentStatus === 'canceled') {
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'canceled' })
        .eq('id', transaction.id);

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

    let query = supabaseAdmin
      .from('memberships')
      .select(`
        *,
        subscription_tier:subscription_tiers(*),
        community:communities(*)
      `)
      .eq('user_id', userId);

    if (communityId) {
      query = query.eq('community_id', communityId);
    }

    const { data: memberships, error } = await query;

    if (error) {
      console.error('Error fetching memberships:', error);
      return res.status(500).json({ error: 'Failed to fetch memberships' });
    }

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
    const { data: membership, error } = await supabaseAdmin
      .from('memberships')
      .select(`
        *,
        subscription_tier:subscription_tiers(*)
      `)
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .eq('status', 'active')
      .single();

    if (error || !membership) {
      return null;
    }

    const now = new Date();
    const expiresAt = membership.expires_at ? new Date(membership.expires_at) : null;

    if (expiresAt && expiresAt < now) {
      await supabaseAdmin
        .from('memberships')
        .update({ status: 'expired' })
        .eq('id', membership.id);

      return null;
    }

    return membership;

  } catch (error) {
    console.error('Error getting user community membership:', error);
    return null;
  }
};
