const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreatePortalPaymentRequest {
  portalSubscriptionId: string;
  returnUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenMatch = authHeader.match(/Bearer\s+(.+)/);
    if (!tokenMatch) {
      return new Response(JSON.stringify({ error: "Invalid authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = tokenMatch[1];
    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: "Invalid token format" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    const userId = payload.sub;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreatePortalPaymentRequest = await req.json();
    const { portalSubscriptionId, returnUrl } = body;

    if (!portalSubscriptionId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: portalSubscriptionId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const yookassaShopId = Deno.env.get("YOOKASSA_SHOP_ID");
    const yookassaSecretKey = Deno.env.get("YOOKASSA_SECRET_KEY");
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!yookassaShopId || !yookassaSecretKey) {
      console.error("YooKassa credentials not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const subscriptionResponse = await fetch(
      `${supabaseUrl}/rest/v1/portal_subscriptions?id=eq.${portalSubscriptionId}`,
      {
        method: "GET",
        headers: {
          "apikey": supabaseServiceRoleKey,
          "Authorization": `Bearer ${supabaseServiceRoleKey}`,
        },
      }
    );

    if (!subscriptionResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch portal subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const subscriptions = await subscriptionResponse.json();
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Portal subscription not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const subscription = subscriptions[0];

    if (!subscription.is_active) {
      return new Response(
        JSON.stringify({ error: "Portal subscription is not active" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (subscription.price === 0) {
      const updateProfileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": supabaseServiceRoleKey,
            "Authorization": `Bearer ${supabaseServiceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            portal_subscription_id: portalSubscriptionId,
          }),
        }
      );

      if (!updateProfileResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to activate free subscription" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          isFree: true,
          message: "Free subscription activated",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transactionId = crypto.randomUUID();
    const idempotencyKey = `portal-${userId}-${portalSubscriptionId}-${Date.now()}`;
    const amount = subscription.price || 0;

    const createTransactionResponse = await fetch(
      `${supabaseUrl}/rest/v1/transactions`,
      {
        method: "POST",
        headers: {
          "apikey": supabaseServiceRoleKey,
          "Authorization": `Bearer ${supabaseServiceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          id: transactionId,
          user_id: userId,
          amount: amount,
          currency: "RUB",
          status: "pending",
          provider: "yookassa",
          idempotency_key: idempotencyKey,
          description: `Портальная подписка: ${subscription.name}`,
          metadata: {
            type: "portal_subscription",
            portal_subscription_id: portalSubscriptionId,
          },
        }),
      }
    );

    if (!createTransactionResponse.ok) {
      const errorText = await createTransactionResponse.text();
      console.error("Failed to create transaction:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create transaction" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transaction = (await createTransactionResponse.json())[0];

    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: returnUrl || `${frontendUrl}/payment/callback?transactionId=${transactionId}`,
      },
      description: `Портальная подписка: ${subscription.name}`,
      metadata: {
        userId: userId,
        portalSubscriptionId: portalSubscriptionId,
        transactionId: transactionId,
        type: "portal_subscription",
      },
    };

    const authString = btoa(`${yookassaShopId}:${yookassaSecretKey}`);
    const yookassaResponse = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json",
        "Idempotence-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!yookassaResponse.ok) {
      const errorText = await yookassaResponse.text();
      console.error("YooKassa API error:", errorText);

      await fetch(
        `${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": supabaseServiceRoleKey,
            "Authorization": `Bearer ${supabaseServiceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "failed" }),
        }
      );

      return new Response(
        JSON.stringify({ error: "Failed to create payment in YooKassa" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paymentResult = await yookassaResponse.json();
    console.log("YooKassa payment created:", paymentResult);

    await fetch(
      `${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": supabaseServiceRoleKey,
          "Authorization": `Bearer ${supabaseServiceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider_payment_id: paymentResult.id,
        }),
      }
    );

    return new Response(
      JSON.stringify({
        confirmationUrl: paymentResult.confirmation.confirmation_url,
        transactionId: transactionId,
        paymentId: paymentResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating portal payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});