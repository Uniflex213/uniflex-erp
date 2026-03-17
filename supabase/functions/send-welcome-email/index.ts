import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser } } = await callerClient.auth.getUser();
    if (!callerUser) return json({ error: "Non autorisé" }, 401);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, id")
      .eq("id", callerUser.id)
      .single();

    if (!callerProfile || !["admin", "god_admin"].includes(callerProfile.role)) {
      return json({ error: "Accès refusé" }, 403);
    }

    // Get SMTP config from system email_smtp_configs (config_key = "creation_utilisateur")
    const { data: sysConfig } = await adminClient
      .from("email_smtp_configs")
      .select("smtp_host, smtp_port, smtp_secure, smtp_password, from_name, from_email")
      .eq("config_key", "creation_utilisateur")
      .eq("is_active", true)
      .maybeSingle();

    const smtp = sysConfig?.smtp_host && sysConfig?.from_email && sysConfig?.smtp_password
      ? { ...sysConfig, smtp_username: sysConfig.from_email }
      : {
          smtp_host: Deno.env.get("SMTP_HOST"),
          smtp_port: Number(Deno.env.get("SMTP_PORT") || "465"),
          smtp_secure: true,
          smtp_username: Deno.env.get("SMTP_USERNAME"),
          smtp_password: Deno.env.get("SMTP_PASSWORD"),
          from_name: Deno.env.get("SMTP_FROM_NAME") || "Uniflex ERP",
          from_email: Deno.env.get("SMTP_FROM_EMAIL") || Deno.env.get("SMTP_USERNAME"),
        };

    if (!smtp.smtp_host || !smtp.smtp_username) {
      return json({ error: "Aucune configuration SMTP pour la création d'utilisateur. Configurez-la dans Admin > Paramètres Email > Création d'utilisateur." }, 400);
    }

    const { full_name, email, vendeur_code, role, otpauth_uri, secret } = await req.json();

    if (!email || !full_name) return json({ error: "Infos manquantes" }, 400);

    // Fetch QR code as PNG and embed inline via CID (external images blocked by most email clients)
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauth_uri)}&format=png`;
    let qrBuffer: ArrayBuffer | null = null;
    try {
      const qrRes = await fetch(qrApiUrl);
      if (qrRes.ok) qrBuffer = await qrRes.arrayBuffer();
    } catch (e) {
      console.warn("QR code fetch failed:", e);
    }

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bienvenue sur Uniflex ERP</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f4f4f5;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#09090b;padding:32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">UNIFLEX <span style="background:#0902b8;color:#fff;font-size:10px;padding:2px 8px;border-radius:4px;letter-spacing:2px;vertical-align:middle;margin-left:6px;">ERP</span></div>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:8px 0 0;">Accès à la plateforme</p>
    </div>
    <!-- Body -->
    <div style="padding:36px;">
      <h1 style="font-size:22px;font-weight:700;color:#09090b;margin:0 0 8px;">Bienvenue, ${full_name} 👋</h1>
      <p style="font-size:14px;color:#636366;margin:0 0 28px;line-height:1.6;">Votre compte Uniflex ERP a été créé. Voici tout ce dont vous avez besoin pour vous connecter.</p>

      <!-- Infos connexion -->
      <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#8a8a8e;letter-spacing:1px;margin-bottom:14px;">VOS INFORMATIONS</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="font-size:12px;color:#8a8a8e;padding-bottom:8px;width:120px;">Courriel</td><td style="font-size:14px;font-weight:600;color:#09090b;padding-bottom:8px;">${email}</td></tr>
          <tr><td style="font-size:12px;color:#8a8a8e;padding-bottom:8px;">Rôle</td><td style="font-size:14px;font-weight:600;color:#09090b;padding-bottom:8px;">${role}</td></tr>
          ${vendeur_code ? `<tr><td style="font-size:12px;color:#8a8a8e;padding-bottom:8px;">Code utilisateur</td><td style="font-size:16px;font-weight:900;color:#0902b8;font-family:monospace;letter-spacing:2px;">${vendeur_code}</td></tr>` : ""}
        </table>
      </div>

      <!-- Auth setup -->
      <div style="background:#fff;border:2px solid #0902b8;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#0902b8;margin-bottom:12px;">🔐 CONFIGURER GOOGLE AUTHENTICATOR</div>
        <p style="font-size:13px;color:#636366;margin:0 0 16px;line-height:1.6;">Vous devez scanner ce QR code avec l'application <strong>Google Authenticator</strong> pour vous connecter à la plateforme.</p>

        <div style="text-align:center;margin:20px 0;">
          ${qrBuffer ? `<img src="cid:qrcode" width="180" height="180" alt="QR Code Google Authenticator" style="border:8px solid #fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);" />` : `<p style="font-size:12px;color:#636366;">[QR code non disponible — utilisez la clé manuelle ci-dessous]</p>`}
        </div>

        <div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;margin-top:12px;">
          <div style="font-size:11px;color:#8a8a8e;margin-bottom:6px;">Clé manuelle (si vous ne pouvez pas scanner)</div>
          <div style="font-size:13px;font-weight:700;color:#09090b;font-family:monospace;letter-spacing:2px;word-break:break-all;">${secret?.match(/.{1,4}/g)?.join(" ") || secret}</div>
        </div>
      </div>

      <!-- Steps -->
      <div style="margin-bottom:28px;">
        <div style="font-size:12px;font-weight:700;color:#8a8a8e;letter-spacing:1px;margin-bottom:14px;">COMMENT SE CONNECTER</div>
        ${[
          ["1", "Installez Google Authenticator sur votre téléphone (App Store ou Google Play)"],
          ["2", `Ouvrez l'app → Appuyez sur <strong>+</strong> → Scanner un QR code → Scannez le code ci-dessus`],
          ["3", `Accédez à la plateforme et entrez votre code utilisateur : <strong style="color:#0902b8;font-family:monospace;">${vendeur_code || email}</strong>`],
          ["4", "Entrez le code à 6 chiffres affiché dans Google Authenticator"],
        ].map(([n, text]) => `
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:#0902b8;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">${n}</div>
            <p style="font-size:13px;color:#636366;margin:2px 0 0;line-height:1.5;">${text}</p>
          </div>
        `).join("")}
      </div>

      <p style="font-size:12px;color:#8a8a8e;line-height:1.6;margin:0;">Si vous avez des questions, contactez votre administrateur Uniflex. Conservez cet email — il contient votre clé d'accès unique.</p>
    </div>
    <!-- Footer -->
    <div style="background:#f4f4f5;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:11px;color:#8a8a8e;margin:0;">© 2026 Uniflex Distribution Inc. — Ce message est confidentiel.</p>
    </div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port: smtp.smtp_port || 465,
      secure: smtp.smtp_secure ?? (smtp.smtp_port === 465),
      auth: { user: smtp.smtp_username, pass: smtp.smtp_password },
    });

    const mailOptions: Record<string, unknown> = {
      from: `"${smtp.from_name || "Uniflex ERP"}" <${smtp.from_email || smtp.smtp_username}>`,
      to: email,
      subject: `Bienvenue sur Uniflex ERP — Configuration de votre accès`,
      html,
    };

    if (qrBuffer) {
      mailOptions.attachments = [{
        filename: "qrcode.png",
        content: Buffer.from(qrBuffer),
        cid: "qrcode",
        contentType: "image/png",
      }];
    }

    await transporter.sendMail(mailOptions);

    return json({ success: true });
  } catch (err) {
    console.error("send-welcome-email error:", err);
    return json({ error: "Erreur d'envoi email: " + (err as Error).message }, 500);
  }
});
