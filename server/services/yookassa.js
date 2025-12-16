import dotenv from 'dotenv';

dotenv.config();

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
  console.error('YooKassa credentials not configured');
}

export class YooKassaService {
  constructor() {
    this.apiUrl = 'https://api.yookassa.ru/v3';
    this.shopId = YOOKASSA_SHOP_ID;
    this.secretKey = YOOKASSA_SECRET_KEY;
  }

  getAuthHeader() {
    const credentials = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createPayment({ amount, description, returnUrl, metadata, idempotencyKey }) {
    if (!this.shopId || !this.secretKey) {
      throw new Error('YooKassa not configured');
    }

    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB'
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      description,
      metadata
    };

    const response = await fetch(`${this.apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YooKassa API error:', errorText);
      throw new Error('Failed to create payment in YooKassa');
    }

    return await response.json();
  }

  async getPayment(paymentId) {
    if (!this.shopId || !this.secretKey) {
      throw new Error('YooKassa not configured');
    }

    const response = await fetch(`${this.apiUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get payment from YooKassa');
    }

    return await response.json();
  }

  verifyWebhookSignature(req) {
    return true;
  }
}

export const yookassaService = new YooKassaService();
