import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

interface EmailPayload {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  module: string;
  referenceIds?: string[];
  attachments?: EmailAttachment[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await anonClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Profil introuvable" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: EmailPayload = await req.json();
    const { to, cc = [], subject, html, text, module, referenceIds = [], attachments = [] } = payload;

    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const senderEmail = Deno.env.get("SENDER_EMAIL") ?? "factures@uniflexdistribution.com";
    const senderName = Deno.env.get("SENDER_NAME") ?? "Uniflex Distribution Inc.";

    const resendBody: Record<string, unknown> = {
      from: `${senderName} <${senderEmail}>`,
      to,
      subject,
      html,
    };

    if (text) resendBody.text = text;
    if (cc.length > 0) resendBody.cc = cc;
    if (attachments.length > 0) resendBody.attachments = attachments;

    let success = false;
    let resendMessageId: string | undefined;
    let errorMessage: string | undefined;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    const resendData = await resendRes.json();

    if (resendRes.ok) {
      success = true;
      resendMessageId = resendData.id;
    } else {
      errorMessage = resendData.message ?? "Erreur Resend inconnue";
    }

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("email_send_logs").insert({
      sent_by: user.id,
      to_addresses: to,
      cc_addresses: cc,
      subject,
      module,
      reference_ids: referenceIds,
      has_attachment: attachments.length > 0,
      attachment_name: attachments[0]?.filename ?? null,
      success,
      error_message: errorMessage ?? null,
      resend_message_id: resendMessageId ?? null,
    });

    if (success) {
      const pseudoUid = -(Date.now() + Math.floor(Math.random() * 1000));
      await serviceClient.from("email_messages").insert({
        user_id: user.id,
        uid: pseudoUid,
        mailbox: "Sent",
        subject,
        from_address: senderEmail,
        from_name: senderName,
        to_addresses: to.map((t: string) => ({ name: "", address: t })),
        cc_addresses: (cc ?? []).map((c: string) => ({ name: "", address: c })),
        received_at: new Date().toISOString(),
        is_read: true,
        is_starred: false,
        is_deleted: false,
        has_attachments: attachments.length > 0,
        fetched_at: new Date().toISOString(),
        body_html: html,
        body_text: text || null,
        source: "sci_invoice",
      }).then(({ error: insErr }) => {
        if (insErr) console.error("[send-invoice-email] email_messages insert error:", insErr.message);
      });

      return new Response(
        JSON.stringify({ success: true, messageId: resendMessageId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur interne";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
