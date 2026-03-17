import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailPayload {
  smtp_config_key: string;
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  template_key: string;
  reference_type?: string;
  reference_id?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendWithFallback(
  smtpConfig: { smtp_host: string; smtp_port: number; smtp_secure: boolean; from_email: string; from_name: string; smtp_password: string },
  mailOptions: Record<string, unknown>
) {
  const attempts = [
    { port: smtpConfig.smtp_port, secure: smtpConfig.smtp_secure },
    { port: 587, secure: false },
    { port: 465, secure: true },
  ];

  const seen = new Set<string>();
  let lastError: Error | null = null;

  for (const attempt of attempts) {
    const key = `${attempt.port}-${attempt.secure}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.smtp_host,
        port: attempt.port,
        secure: attempt.secure,
        auth: { user: smtpConfig.from_email, pass: smtpConfig.smtp_password },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
      });
      await transporter.sendMail(mailOptions);
      return { success: true, port: attempt.port, secure: attempt.secure };
    } catch (e: unknown) {
      lastError = e as Error;
    }
  }

  throw lastError ?? new Error("Échec SMTP");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonRes({ error: "Non autorisé" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return jsonRes({ error: "Non autorisé" }, 401);
    }

    const payload: SendEmailPayload = await req.json();
    const { smtp_config_key, to, cc = [], subject, html, text, template_key, reference_type, reference_id, attachments = [] } = payload;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    let smtpConfig: {
      smtp_host: string; smtp_port: number; smtp_secure: boolean;
      from_email: string; from_name: string; smtp_password: string;
    } | null = null;

    if (smtp_config_key === "user_personal") {
      const { data } = await serviceClient
        .from("user_smtp_configs")
        .select("smtp_host, smtp_port, smtp_secure, from_email, from_name, smtp_password")
        .eq("user_id", user.id)
        .maybeSingle();
      smtpConfig = data;
      if (!smtpConfig?.from_email) {
        return jsonRes({ error: "Aucune boîte mail personnelle configurée. Allez dans Paramètres > Email pour configurer votre adresse." }, 400);
      }
    } else {
      const { data } = await serviceClient
        .from("email_smtp_configs")
        .select("smtp_host, smtp_port, smtp_secure, from_email, from_name, smtp_password")
        .eq("config_key", smtp_config_key)
        .eq("is_active", true)
        .maybeSingle();
      smtpConfig = data;
      if (!smtpConfig?.from_email) {
        return jsonRes({ error: `Configuration email '${smtp_config_key}' non configurée. Contactez l'administrateur.` }, 400);
      }
    }

    let success = false;
    let errorMessage: string | undefined;

    try {
      const mailOptions: Record<string, unknown> = {
        from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
        to: to.join(", "),
        subject,
        html,
      };
      if (text) mailOptions.text = text;
      if (cc.length > 0) mailOptions.cc = cc.join(", ");
      if (attachments.length > 0) {
        mailOptions.attachments = attachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
          contentType: a.contentType,
        }));
      }

      const result = await sendWithFallback(smtpConfig, mailOptions);
      success = true;

      if (smtp_config_key === "user_personal" && (result.port !== smtpConfig.smtp_port || result.secure !== smtpConfig.smtp_secure)) {
        await serviceClient
          .from("user_smtp_configs")
          .update({ smtp_port: result.port, smtp_secure: result.secure })
          .eq("user_id", user.id);
      }
    } catch (e: unknown) {
      errorMessage = (e as Error).message ?? "Erreur SMTP inconnue";
    }

    await serviceClient.from("email_send_logs").insert({
      sent_by: user.id,
      smtp_config_key,
      from_email: smtpConfig.from_email,
      to_addresses: to,
      cc_addresses: cc,
      subject,
      template_key,
      reference_type: reference_type ?? null,
      reference_id: reference_id ?? null,
      has_attachment: attachments.length > 0,
      attachment_name: attachments[0]?.filename ?? null,
      success,
      error_message: errorMessage ?? null,
      module: smtp_config_key,
      reference_ids: reference_id ? [reference_id] : [],
    });

    if (success) {
      const sourceMap: Record<string, string> = {
        compose: "compose",
        order_confirmation_client: "order_confirmation",
        pricelist_client: "pricelist",
        sample_notification: "sample_notification",
        pickup_ticket_client: "pickup_ticket",
        sci_invoice: "sci_invoice",
      };
      const pseudoUid = -(Date.now() + Math.floor(Math.random() * 1000));
      await serviceClient.from("email_messages").insert({
        user_id: user.id,
        uid: pseudoUid,
        mailbox: "Sent",
        subject,
        from_address: smtpConfig.from_email,
        from_name: smtpConfig.from_name,
        to_addresses: to.map((t: string) => ({ name: "", address: t })),
        cc_addresses: (cc ?? []).map((c: string) => ({ name: "", address: c })),
        received_at: new Date().toISOString(),
        is_read: true,
        is_starred: false,
        is_deleted: false,
        has_attachments: (attachments ?? []).length > 0,
        fetched_at: new Date().toISOString(),
        body_html: html,
        body_text: text || null,
        source: sourceMap[template_key] || "compose",
      }).then(({ error: insErr }) => {
        if (insErr) console.error("[send-email] email_messages insert error:", insErr.message);
      });

      return jsonRes({ success: true });
    } else {
      return jsonRes({ success: false, error: errorMessage }, 500);
    }
  } catch (err: unknown) {
    return jsonRes({ success: false, error: (err as Error).message ?? "Erreur serveur" }, 500);
  }
});
