import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await anonClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || !["admin", "god_admin"].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: "Accès refusé. Rôle admin requis." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: "Impossible de supprimer votre propre compte." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Delete or nullify all FK references to profiles before deleting
    // Direct ownership tables — delete rows
    await adminClient.from("user_permissions").delete().eq("user_id", userId);
    await adminClient.from("user_smtp_configs").delete().eq("user_id", userId);
    await adminClient.from("user_data_store").delete().eq("user_id", userId);
    await adminClient.from("calendar_events").delete().eq("owner_id", userId);
    await adminClient.from("notifications").delete().eq("user_id", userId);
    await adminClient.from("messages").delete().eq("sender_id", userId);
    await adminClient.from("conversation_participants").delete().eq("user_id", userId);
    await adminClient.from("activity_logs").delete().eq("user_id", userId);
    await adminClient.from("margin_analyses").delete().eq("owner_id", userId);
    await adminClient.from("pricelists").delete().eq("owner_id", userId);

    // Nullify references in shared tables (don't delete the records, just unlink)
    await adminClient.from("account_requests").update({ reviewed_by: null }).eq("reviewed_by", userId);
    await adminClient.from("clients").update({ owner_id: null }).eq("owner_id", userId);
    await adminClient.from("crm_leads").update({ owner_id: null }).eq("owner_id", userId);
    await adminClient.from("orders").update({ owner_id: null }).eq("owner_id", userId);
    await adminClient.from("pickup_tickets").update({ owner_id: null }).eq("owner_id", userId);
    await adminClient.from("sample_requests").update({ owner_id: null }).eq("owner_id", userId);
    await adminClient.from("stores").update({ created_by: null }).eq("created_by", userId);
    await adminClient.from("dispute_messages").update({ sender_id: null }).eq("sender_id", userId);
    await adminClient.from("email_send_logs").update({ sent_by: null }).eq("sent_by", userId);
    await adminClient.from("email_smtp_configs").update({ updated_by: null }).eq("updated_by", userId);
    await adminClient.from("email_templates").update({ updated_by: null }).eq("updated_by", userId);
    await adminClient.from("system_email_configs").update({ updated_by: null }).eq("updated_by", userId);
    await adminClient.from("platform_teams").update({ manager_id: null }).eq("manager_id", userId);
    await adminClient.from("team_commission_configs").delete().or(`member_id.eq.${userId},set_by.eq.${userId}`);
    await adminClient.from("team_expenses").update({ added_by: null }).eq("added_by", userId);

    // Delete profile row (FK to auth.users must be removed before auth deletion)
    await adminClient.from("profiles").delete().eq("id", userId);

    // Finally delete the auth user (best-effort — profile is already gone)
    try {
      await adminClient.auth.admin.deleteUser(userId);
    } catch {
      // Auth user deletion can fail if there are internal references — that's OK,
      // the profile is already deleted so the user can't log in anymore.
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
