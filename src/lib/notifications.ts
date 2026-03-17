import { supabase } from "../supabaseClient";

export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  message?: string,
  referenceType?: string,
  referenceId?: string
) {
  const { error } = await supabase.rpc("notify_user", {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message ?? null,
    p_ref_type: referenceType ?? null,
    p_ref_id: referenceId ?? null,
  });
  if (error) console.error("Failed to send notification:", error.message);
}
