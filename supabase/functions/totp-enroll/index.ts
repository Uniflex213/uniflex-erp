import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Native TOTP helpers ─────────────────────────────────────────────────────

function base32Encode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0, out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function generateSecret(): string {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

function keyuri(accountName: string, issuer: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

// ───────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !callerUser) return json({ error: "Non autorisé" }, 401);

    let targetUserId = callerUser.id;
    let targetVendeurCode = "";

    const body = await req.json().catch(() => ({}));
    if (body.target_user_id && body.target_user_id !== callerUser.id) {
      const { data: callerProfile } = await adminClient
        .from("profiles").select("role").eq("id", callerUser.id).single();

      if (!callerProfile || !["admin", "god_admin"].includes(callerProfile.role)) {
        return json({ error: "Accès refusé" }, 403);
      }

      targetUserId = body.target_user_id;
    }

    // Fetch vendeur_code for the account name in Google Authenticator
    const { data: targetProfile } = await adminClient
      .from("profiles").select("vendeur_code").eq("id", targetUserId).single();

    targetVendeurCode = targetProfile?.vendeur_code ?? targetUserId;

    const secret = generateSecret();
    const otpauthUri = keyuri(targetVendeurCode, "UNIFLEX", secret);

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ totp_secret: secret, totp_enrolled: true })
      .eq("id", targetUserId);

    if (updateError) return json({ error: "Erreur de sauvegarde" }, 500);

    return json({ otpauth_uri: otpauthUri, secret });
  } catch (err) {
    console.error("totp-enroll error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
