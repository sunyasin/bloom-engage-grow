import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, trbt-signature",
};

interface TributePayload {
  name: string;
  created_at: string;
  sent_at: string;
  payload: {
    product_id: number;
    amount: number;
    currency: string;
    user_id: number;
    telegram_user_id: number;
  };
}

async function verifySignature(body: string, signature: string, apiKey: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  return computedSignature === signature;
}

function parseTierId(name: string): number | null {
  // Format: XXX_community-name where XXX are digits
  const match = name.match(/^(\d+)_/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("trbt-signature");
    const apiKey = Deno.env.get("TRIBUTE_API_KEY");

    if (!apiKey) {
      console.error("TRIBUTE_API_KEY not configured");
      return new Response(null, { status: 401, headers: corsHeaders });
    }

    const bodyText = await req.text();

    if (!signature) {
      console.error("Missing trbt-signature header");
      return new Response(null, { status: 401, headers: corsHeaders });
    }

    const isValid = await verifySignature(bodyText, signature, apiKey);
    if (!isValid) {
      console.error("Invalid signature");
      return new Response(null, { status: 401, headers: corsHeaders });
    }

    let webhookData: TributePayload;
    try {
      webhookData = JSON.parse(bodyText);
    } catch {
      console.error("Invalid JSON payload");
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    // Validate required fields
    if (!webhookData.name || !webhookData.payload || !webhookData.payload.telegram_user_id) {
      console.error("Missing required fields in payload");
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const telegramUserId = webhookData.payload.telegram_user_id;

    // Find user by telegram_user_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (profileError || !profile) {
      console.error("User not found for telegram_user_id:", telegramUserId);
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    const userId = profile.id;

    // Parse tier_id from name (format: XXX_community-name)
    const tierId = parseTierId(webhookData.name);
    if (!tierId) {
      console.error("Could not parse tier_id from name:", webhookData.name);
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    // Find subscription tier by tier_id
    const { data: tier, error: tierError } = await supabase
      .from("subscription_tiers")
      .select("id, community_id, name")
      .eq("tier_id", tierId)
      .single();

    if (tierError || !tier) {
      console.error("Subscription tier not found for tier_id:", tierId);
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    // Get community info
    const { data: community } = await supabase
      .from("communities")
      .select("name")
      .eq("id", tier.community_id)
      .single();

    // Create transaction record with full payload
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        community_id: tier.community_id,
        subscription_tier_id: tier.id,
        amount: webhookData.payload.amount,
        currency: webhookData.payload.currency.toUpperCase(),
        status: "succeeded",
        provider: "tribute",
        provider_payment_id: `tribute_${webhookData.payload.product_id}_${webhookData.payload.user_id}`,
        description: `Оплата через Tribute: ${community?.name || "Сообщество"} / ${tier.name}`,
        metadata: webhookData, // Store full payload
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Error creating transaction:", transactionError);
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    // Calculate expiration date (1 month from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Check for existing membership
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("community_id", tier.community_id)
      .single();

    if (existingMembership) {
      // Update existing membership
      const { error: updateError } = await supabase
        .from("memberships")
        .update({
          subscription_tier_id: tier.id,
          status: "active",
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          renewal_period: "monthly",
          external_subscription_id: `tribute_${webhookData.payload.product_id}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMembership.id);

      if (updateError) {
        console.error("Error updating membership:", updateError);
      }
    } else {
      // Create new membership
      const { error: insertError } = await supabase
        .from("memberships")
        .insert({
          user_id: userId,
          community_id: tier.community_id,
          subscription_tier_id: tier.id,
          status: "active",
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          renewal_period: "monthly",
          external_subscription_id: `tribute_${webhookData.payload.product_id}`,
        });

      if (insertError) {
        console.error("Error creating membership:", insertError);
      }
    }

    console.log(`Payment processed successfully for telegram_user_id: ${telegramUserId}, tier_id: ${tierId}`);

    return new Response(null, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(null, { status: 400, headers: corsHeaders });
  }
});
