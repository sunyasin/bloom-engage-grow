import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export interface CreateSubscriptionRequest {
  communityId: string;
  subscriptionTierId: string;
  returnUrl?: string;
}

export interface CreateSubscriptionResponse {
  confirmationUrl: string;
  transactionId: string;
  paymentId: string;
}

export interface Membership {
  id: string;
  user_id: string;
  community_id: string;
  subscription_tier_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  renewal_period: string | null;
  external_subscription_id: string | null;
  isExpired: boolean;
  isActive: boolean;
  subscription_tier?: any;
  community?: any;
}

export interface GetMembershipsResponse {
  memberships: Membership[];
}

export interface CreatePortalPaymentRequest {
  portalSubscriptionId: string;
  returnUrl?: string;
}

export interface CreatePortalPaymentResponse {
  confirmationUrl?: string;
  transactionId?: string;
  paymentId?: string;
  success?: boolean;
  isFree?: boolean;
  message?: string;
}

export const paymentsApi = {
  async createSubscription(data: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    const token = await getAuthToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/api/payments/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create subscription');
    }

    return await response.json();
  },

  async getMemberships(communityId?: string): Promise<GetMembershipsResponse> {
    const token = await getAuthToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = new URL(`${API_BASE_URL}/api/payments/memberships`);
    if (communityId) {
      url.searchParams.append('communityId', communityId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch memberships');
    }

    return await response.json();
  },

  async createPortalPayment(data: CreatePortalPaymentRequest): Promise<CreatePortalPaymentResponse> {
    const token = await getAuthToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-portal-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create portal payment');
    }

    return await response.json();
  }
};
