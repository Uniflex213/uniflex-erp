import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Native TOTP (RFC 6238) — no npm:otplib needed ──────────────────────────

function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const chars = input.toUpperCase().replace(/[= ]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of chars) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}

async function totpGenerate(secret: string, counter: number): Promise<string> {
  const key = base32Decode(secret);
  const buf = new ArrayBuffer(8);
  new DataView(buf).setUint32(4, counter >>> 0, false);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
  const offset = sig[19] & 0x0f;
  const code = (
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff)
  ) % 1_000_000;
  return code.toString().padStart(6, "0");
}

async function totpVerify(token: string, secret: string, window = 1): Promise<boolean> {
  const T = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (await totpGenerate(secret, T + i) === token) return true;
  }
  return false;
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
    const { vendeur_code, totp_code } = await req.json();

    if (!vendeur_code || !totp_code) {
      return json({ error: "Paramètres manquants" }, 400);
    }

    if (!/^\d{6}$/.test(totp_code)) {
      return json({ error: "Code incorrect, réessayez" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up user by vendeur_code (RPC never returns totp_secret)
    const { data: rows, error: rpcError } = await adminClient.rpc(
      "get_user_by_vendeur_code",
      { code: vendeur_code.toUpperCase() }
    );

    if (rpcError || !rows || rows.length === 0) {
      return json({ error: "Code vendeur invalide" }, 401);
    }

    const { user_id, totp_enrolled } = rows[0];

    if (!totp_enrolled) {
      return json({ error: "totp_not_enrolled" }, 403);
    }

    // Fetch TOTP secret — service role only
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("totp_secret")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.totp_secret) {
      return json({ error: "Configuration TOTP manquante" }, 500);
    }

    const isValid = await totpVerify(totp_code, profile.totp_secret);
    if (!isValid) {
      return json({ error: "Code incorrect, réessayez" }, 401);
    }

    // Get user email for magic link generation
    const { data: userData, error: userError } =
      await adminClient.auth.admin.getUserById(user_id);

    if (userError || !userData?.user?.email) {
      return json({ error: "Utilisateur introuvable" }, 500);
    }

    // Generate magic link token (no email sent — just creates the token)
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("generateLink error:", linkError);
      return json({ error: "Erreur de création de session" }, 500);
    }

    // Verify the token to create a real session
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sessionData, error: verifyError } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError || !sessionData?.session) {
      console.error("verifyOtp error:", verifyError);
      return json({ error: "Erreur de création de session" }, 500);
    }

    await adminClient
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user_id);

    return json({
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in,
        token_type: sessionData.session.token_type,
      },
    });
  } catch (err) {
    console.error("totp-login error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
