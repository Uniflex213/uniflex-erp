import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !callerUser) return json({ error: "Non autorisé" }, 401);

    const { totp_code, target_user_id } = await req.json();

    if (!totp_code || !/^\d{6}$/.test(totp_code)) {
      return json({ error: "Code invalide" }, 400);
    }

    let targetUserId = callerUser.id;
    if (target_user_id && target_user_id !== callerUser.id) {
      const { data: callerProfile } = await adminClient
        .from("profiles").select("role").eq("id", callerUser.id).single();
      if (!callerProfile || !["admin", "god_admin"].includes(callerProfile.role)) {
        return json({ error: "Accès refusé" }, 403);
      }
      targetUserId = target_user_id;
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles").select("totp_secret").eq("id", targetUserId).single();

    if (profileError || !profile?.totp_secret) {
      return json({ error: "Aucun secret TOTP trouvé. Recommencez l'inscription." }, 400);
    }

    const isValid = await totpVerify(totp_code, profile.totp_secret);
    if (!isValid) {
      return json({ error: "Code incorrect. Réessayez avec Google Authenticator." }, 400);
    }

    const { error: updateError } = await adminClient
      .from("profiles").update({ totp_enrolled: true }).eq("id", targetUserId);

    if (updateError) return json({ error: "Erreur de mise à jour" }, 500);

    return json({ success: true });
  } catch (err) {
    console.error("totp-verify-enrollment error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
