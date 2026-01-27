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
    period?: string; // once, weekly, monthly, 3months, 6month, yearly
  };
}

type RenewalPeriod = "monthly" | "yearly" | "lifetime";

function calculateExpiresAt(period: string | undefined): Date {
  const now = new Date();
  switch (period) {
    case "once":
      return new Date(now.setFullYear(now.getFullYear() + 100)); // lifetime
    case "weekly":
      return new Date(now.setDate(now.getDate() + 7));
    case "monthly":
      return new Date(now.setMonth(now.getMonth() + 1));
    case "3months":
      return new Date(now.setMonth(now.getMonth() + 3));
    case "6month":
      return new Date(now.setMonth(now.getMonth() + 6));
    case "yearly":
      return new Date(now.setFullYear(now.getFullYear() + 1));
    default:
      return new Date(now.setMonth(now.getMonth() + 1)); // default monthly
  }
}

function mapToRenewalPeriod(period: string | undefined): RenewalPeriod {
  switch (period) {
    case "once":
      return "lifetime";
    case "yearly":
      return "yearly";
    default:
      return "monthly";
  }
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

// Helper to sanitize headers for logging (remove sensitive data)
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    // Don't log full signature, just indicate it was present
    if (key.toLowerCase() === "trbt-signature") {
      result[key] = value ? "[PRESENT]" : "[MISSING]";
    } else if (key.toLowerCase() === "authorization") {
      result[key] = value ? "[PRESENT]" : "[MISSING]";
    } else {
      result[key] = value;
    }
  });
  return result;
}

// Log webhook call to database
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logWebhook(
  supabase: any,
  webhookName: string,
  req: Request,
  payload: unknown,
  responseStatus: number,
  responseBody: unknown,
  errorMessage: string | null,
  startTime: number
) {
  try {
    const processingTime = Date.now() - startTime;
    
    await supabase.from("webhook_logs").insert({
      webhook_name: webhookName,
      request_url: req.url,
      request_method: req.method,
      request_headers: sanitizeHeaders(req.headers),
      request_payload: payload,
      response_status: responseStatus,
      response_body: responseBody,
      error_message: errorMessage,
      processing_time_ms: processingTime,
    });
  } catch (logError) {
    console.error("Failed to log webhook:", logError);
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let bodyText = "";
  let webhookData: TributePayload | null = null;

  try {
    const signature = req.headers.get("trbt-signature");
    const apiKey = Deno.env.get("TRIBUTE_API_KEY");

    if (!apiKey) {
      console.error("TRIBUTE_API_KEY not configured");
      const errorMsg = "TRIBUTE_API_KEY not configured";
      await logWebhook(supabase, "tribute-webhook", req, null, 401, null, errorMsg, startTime);
      return new Response(null, { status: 401, headers: corsHeaders });
    }

    bodyText = await req.text();

    if (!signature) {
      console.error("Missing trbt-signature header");
      const errorMsg = "Missing trbt-signature header";
      await logWebhook(supabase, "tribute-webhook", req, bodyText, 401, null, errorMsg, startTime);
      return new Response(null, { status: 401, headers: corsHeaders });
    }

    const isValid = await verifySignature(bodyText, signature, apiKey);
    if (!isValid) {
      console.error("Invalid signature");
      const errorMsg = "Invalid signature";
      await logWebhook(supabase, "tribute-webhook", req, bodyText, 401, null, errorMsg, startTime);
      return new Response(null, { status: 401, headers: corsHeaders });
    }

    try {
      webhookData = JSON.parse(bodyText);
    } catch {
      console.error("Invalid JSON payload");
      const errorMsg = "Invalid JSON payload";
      await logWebhook(supabase, "tribute-webhook", req, bodyText, 400, null, errorMsg, startTime);
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    // Validate required fields
    if (!webhookData?.name || !webhookData?.payload || !webhookData?.payload.telegram_user_id) {
      console.error("Missing required fields in payload");
      const errorMsg = "Missing required fields in payload";
      await logWebhook(supabase, "tribute-webhook", req, webhookData, 400, null, errorMsg, startTime);
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    const telegramUserId = webhookData.payload.telegram_user_id;

    // Find user by telegram_user_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (profileError || !profile) {
      console.error("User not found for telegram_user_id:", telegramUserId);
      const errorMsg = `User not found for telegram_user_id: ${telegramUserId}`;
      await logWebhook(supabase, "tribute-webhook", req, webhookData, 400, null, errorMsg, startTime);
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    const userId = profile.id;

    // Parse tier_id from name (format: XXX_community-name)
    const tierId = parseTierId(webhookData.name);
    if (!tierId) {
      console.error("Could not parse tier_id from name:", webhookData.name);
      const errorMsg = `Could not parse tier_id from name: ${webhookData.name}`;
      await logWebhook(supabase, "tribute-webhook", req, webhookData, 400, null, errorMsg, startTime);
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
      const errorMsg = `Subscription tier not found for tier_id: ${tierId}`;
      await logWebhook(supabase, "tribute-webhook", req, webhookData, 400, null, errorMsg, startTime);
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
        status: "paid",
        provider: "tribute",
        provider_payment_id: `tribute_${webhookData.payload.product_id}_${webhookData.payload.user_id}`,
        description: `Оплата через Tribute: ${community?.name || "Сообщество"} / ${tier.name}`,
        metadata: webhookData, // Store full payload
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Error creating transaction:", transactionError);
      const errorMsg = `Error creating transaction: ${transactionError.message}`;
      await logWebhook(supabase, "tribute-webhook", req, webhookData, 400, null, errorMsg, startTime);
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    // Calculate expiration date based on period
    const expiresAt = calculateExpiresAt(webhookData.payload.period);
    const renewalPeriod = mapToRenewalPeriod(webhookData.payload.period);

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
          renewal_period: renewalPeriod,
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
          renewal_period: renewalPeriod,
          external_subscription_id: `tribute_${webhookData.payload.product_id}`,
        });

      if (insertError) {
        console.error("Error creating membership:", insertError);
      }
    }

    const successMessage = `Payment processed successfully for telegram_user_id: ${telegramUserId}, tier_id: ${tierId}`;
    console.log(successMessage);

    // Log successful webhook
    await logWebhook(
      supabase,
      "tribute-webhook",
      req,
      webhookData,
      200,
      { success: true, message: successMessage, transactionId: transaction?.id },
      null,
      startTime
    );

    return new Response(null, { status: 200, headers: corsHeaders });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unexpected error";
    console.error("Unexpected error:", error);
    await logWebhook(supabase, "tribute-webhook", req, webhookData || bodyText, 400, null, errorMsg, startTime);
    return new Response(null, { status: 400, headers: corsHeaders });
  }
});
