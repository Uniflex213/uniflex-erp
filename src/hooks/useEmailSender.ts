import { useState } from "react";
import { supabase } from "../supabaseClient";

export interface SendEmailOptions {
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
    base64Content: string;
    mimeType: string;
  }>;
}

export function useEmailSender() {
  const [sending, setSending] = useState(false);

  const sendEmail = async (options: SendEmailOptions): Promise<{ success: boolean; error?: string }> => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: "Non authentifié" };

      const payload = {
        smtp_config_key: options.smtp_config_key,
        to: options.to,
        cc: options.cc ?? [],
        subject: options.subject,
        html: options.html,
        text: options.text,
        template_key: options.template_key,
        reference_type: options.reference_type,
        reference_id: options.reference_id,
        attachments: (options.attachments ?? []).map(a => ({
          filename: a.filename,
          content: a.base64Content,
          contentType: a.mimeType,
        })),
      };

      const { data, error } = await supabase.functions.invoke("send-email", { body: payload });
      if (error) {
        let msg = error.message;
        const ctx = (error as any).context;
        try {
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } else if (ctx && typeof ctx === "object" && ctx.error) {
            msg = ctx.error;
          } else if (typeof ctx === "string") {
            msg = ctx;
          }
        } catch {
          if (ctx && typeof ctx === "object" && ctx.error) {
            msg = ctx.error;
          }
        }
        return { success: false, error: msg };
      }
      if (!data?.success) return { success: false, error: data?.error ?? "Erreur inconnue" };
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    } finally {
      setSending(false);
    }
  };

  return { sendEmail, sending };
}
