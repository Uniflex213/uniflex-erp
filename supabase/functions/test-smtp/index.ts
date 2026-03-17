import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TestPayload {
  config_type?: "user_personal" | "system";
  config_key?: string;
  to_email?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  from_email?: string;
  from_name?: string;
  smtp_password?: string;
}

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function tryConnect(host: string, port: number, secure: boolean, email: string, password: string) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: email, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });
  await transporter.verify();
  return { host, port, secure };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonRes({ success: false, error: "Non autorisé" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return jsonRes({ success: false, error: "Non autorisé" }, 401);
    }

    const payload: TestPayload = await req.json();
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Auto-detect config_type from config_key if not provided
    if (!payload.config_type && payload.config_key) {
      payload.config_type = "system";
    } else if (!payload.config_type) {
      payload.config_type = "user_personal";
    }

    let smtpConfig: {
      smtp_host: string; smtp_port: number; smtp_secure: boolean;
      from_email: string; from_name: string; smtp_password: string;
    } | null = null;

    if (payload.config_type === "user_personal") {
      if (payload.from_email && payload.smtp_password) {
        smtpConfig = {
          smtp_host: payload.smtp_host ?? "smtp.hostinger.com",
          smtp_port: payload.smtp_port ?? 465,
          smtp_secure: payload.smtp_secure ?? true,
          from_email: payload.from_email,
          from_name: payload.from_name ?? "",
          smtp_password: payload.smtp_password,
        };
      } else {
        const { data } = await serviceClient
          .from("user_smtp_configs")
          .select("smtp_host, smtp_port, smtp_secure, from_email, from_name, smtp_password")
          .eq("user_id", user.id)
          .maybeSingle();
        smtpConfig = data;
      }
    } else if (payload.config_type === "system" && payload.config_key) {
      if (payload.from_email && payload.smtp_password) {
        smtpConfig = {
          smtp_host: payload.smtp_host ?? "smtp.hostinger.com",
          smtp_port: payload.smtp_port ?? 465,
          smtp_secure: payload.smtp_secure ?? true,
          from_email: payload.from_email,
          from_name: payload.from_name ?? "Uniflex Distribution",
          smtp_password: payload.smtp_password,
        };
      } else {
        const { data } = await serviceClient
          .from("email_smtp_configs")
          .select("smtp_host, smtp_port, smtp_secure, from_email, from_name, smtp_password")
          .eq("config_key", payload.config_key)
          .maybeSingle();
        smtpConfig = data;
      }
    }

    if (!smtpConfig?.from_email || !smtpConfig?.smtp_password) {
      return jsonRes({ success: false, error: "Configuration SMTP incomplète. Remplissez l'adresse et le mot de passe." }, 400);
    }

    const host = smtpConfig.smtp_host;
    const email = smtpConfig.from_email;
    const password = smtpConfig.smtp_password;

    const attempts = [
      { port: smtpConfig.smtp_port, secure: smtpConfig.smtp_secure },
      { port: 587, secure: false },
      { port: 465, secure: true },
    ];

    const seen = new Set<string>();
    const errors: string[] = [];

    for (const attempt of attempts) {
      const key = `${attempt.port}-${attempt.secure}`;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const result = await tryConnect(host, attempt.port, attempt.secure, email, password);
        if (payload.config_type === "user_personal") {
          await serviceClient
            .from("user_smtp_configs")
            .update({
              is_verified: true,
              verified_at: new Date().toISOString(),
              smtp_port: result.port,
              smtp_secure: result.secure,
            })
            .eq("user_id", user.id);
        }

        // Send actual test email if to_email is provided
        if (payload.to_email) {
          const transporter = nodemailer.createTransport({
            host, port: result.port, secure: result.secure,
            auth: { user: email, pass: password },
          });
          const configLabel = payload.config_key ? `[${payload.config_key}]` : "";
          await transporter.sendMail({
            from: `"${smtpConfig!.from_name || "Uniflex ERP"}" <${email}>`,
            to: payload.to_email,
            subject: `Test SMTP Uniflex ${configLabel} — Connexion réussie`,
            html: `<div style="font-family:sans-serif;max-width:480px;margin:20px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
              <h2 style="color:#09090b;margin:0 0 8px;">Test SMTP réussi</h2>
              <p style="color:#636366;font-size:14px;line-height:1.5;">La configuration SMTP <strong>${configLabel || "personnelle"}</strong> fonctionne correctement.</p>
              <div style="background:#f4f4f5;border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#636366;">
                <div><strong>Serveur :</strong> ${host}:${result.port} (${result.secure ? "SSL" : "TLS"})</div>
                <div><strong>Expéditeur :</strong> ${email}</div>
                <div><strong>Date :</strong> ${new Date().toLocaleString("fr-CA")}</div>
              </div>
              <p style="color:#8a8a8e;font-size:11px;">Cet email a été envoyé depuis Uniflex ERP pour vérifier la configuration SMTP.</p>
            </div>`,
          });
          return jsonRes({ success: true, message: `Connexion réussie et email de test envoyé à ${payload.to_email} (port ${result.port}).` });
        }

        return jsonRes({ success: true, message: `Connexion SMTP réussie (port ${result.port}).` });
      } catch (e: unknown) {
        errors.push(`Port ${attempt.port}: ${(e as Error).message}`);
      }
    }

    let friendly = "Impossible de se connecter au serveur SMTP.";
    const allErrors = errors.join(" | ");
    if (allErrors.includes("Invalid login") || allErrors.includes("Authentication") || allErrors.includes("535")) {
      friendly = "Authentification refusée. Vérifiez votre adresse email et mot de passe.";
    } else if (allErrors.includes("ECONNREFUSED") || allErrors.includes("connect")) {
      friendly = "Connexion refusée par le serveur SMTP.";
    } else if (allErrors.includes("timeout") || allErrors.includes("Timeout")) {
      friendly = "Délai dépassé. Le serveur SMTP ne répond pas.";
    }

    return jsonRes({ success: false, error: friendly, details: allErrors });
  } catch (err: unknown) {
    return jsonRes({ success: false, error: (err as Error).message ?? "Erreur serveur" }, 500);
  }
});
