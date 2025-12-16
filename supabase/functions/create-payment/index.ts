import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreatePaymentRequest {
  communityId: string;
  subscriptionTierId: string;
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

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract JWT token and decode to get user ID
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

    // Decode JWT payload
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

    // Parse request body
    const body: CreatePaymentRequest = await req.json();
    const { communityId, subscriptionTierId, returnUrl } = body;

    if (!communityId || !subscriptionTierId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: communityId, subscriptionTierId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get environment variables
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

    // Fetch subscription tier
    const tierResponse = await fetch(
      `${supabaseUrl}/rest/v1/subscription_tiers?id=eq.${subscriptionTierId}`,
      {
        method: "GET",
        headers: {
          "apikey": supabaseServiceRoleKey,
          "Authorization": `Bearer ${supabaseServiceRoleKey}`,
        },
      }
    );

    if (!tierResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription tier" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tiers = await tierResponse.json();
    if (!tiers || tiers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Subscription tier not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tier = tiers[0];

    if (!tier.is_active) {
      return new Response(
        JSON.stringify({ error: "Subscription tier is not active" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch community
    const communityResponse = await fetch(
      `${supabaseUrl}/rest/v1/communities?id=eq.${communityId}`,
      {
        method: "GET",
        headers: {
          "apikey": supabaseServiceRoleKey,
          "Authorization": `Bearer ${supabaseServiceRoleKey}`,
        },
      }
    );

    if (!communityResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch community" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const communities = await communityResponse.json();
    if (!communities || communities.length === 0) {
      return new Response(
        JSON.stringify({ error: "Community not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const community = communities[0];

    // Create transaction record
    const transactionId = crypto.randomUUID();
    const idempotencyKey = `${userId}-${communityId}-${subscriptionTierId}-${Date.now()}`;
    const amount = tier.price_monthly || 0;

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
          community_id: communityId,
          subscription_tier_id: subscriptionTierId,
          amount: amount,
          currency: "RUB",
          status: "pending",
          provider: "yookassa",
          idempotency_key: idempotencyKey,
          description: `Подписка на сообщество ${community.name} / план ${tier.name}`,
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

    // Create payment in YooKassa
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
      description: `Подписка на сообщество ${community.name} / план ${tier.name}`,
      metadata: {
        userId: userId,
        communityId: communityId,
        subscriptionTierId: subscriptionTierId,
        transactionId: transactionId,
      },
    };

    // Create payment via YooKassa API
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
      
      // Update transaction status to failed
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

    // Update transaction with payment ID
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

    // Return confirmation URL
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
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
