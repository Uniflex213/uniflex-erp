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

    const {
      firstName,
      lastName,
      email,
      password,
      username,
      phone,
      jobTitle,
      role,
      teamId,
      permissions,
      requestId,
    } = await req.json();

    if (!firstName || !lastName || !email || !password || !role) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      const msg = createError?.message || "Erreur lors de la création du compte.";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      email,
      full_name: `${firstName} ${lastName}`.trim(),
      username: username || null,
      phone: phone || null,
      job_title: jobTitle || null,
      role,
      team_id: teamId || null,
      is_active: true,
      is_suspended: false,
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Erreur profil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (permissions && permissions.length > 0) {
      const rows = permissions.map((key: string) => ({
        user_id: userId,
        permission_key: key,
        granted: true,
      }));
      await adminClient.from("user_permissions").insert(rows);
    }

    if (requestId) {
      await adminClient
        .from("account_requests")
        .update({ status: "approved", reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
        .eq("id", requestId);
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
