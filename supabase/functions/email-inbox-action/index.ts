import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const encoder = new TextEncoder();

async function readResponse(
  conn: Deno.TlsConn,
  timeout = 10000
): Promise<string> {
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(32768);
  let result = "";
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const n = await conn.read(buffer);
      if (n === null) break;
      result += decoder.decode(buffer.subarray(0, n));
      if (
        result.includes("\r\n") &&
        (result.includes("OK") ||
          result.includes("NO") ||
          result.includes("BAD"))
      ) {
        break;
      }
    } catch {
      break;
    }
  }
  return result;
}

async function sendCommand(
  conn: Deno.TlsConn,
  tag: string,
  command: string
): Promise<string> {
  await conn.write(encoder.encode(`${tag} ${command}\r\n`));
  return await readResponse(conn);
}

function isTrashMailbox(name: string): boolean {
  return /^(inbox\.)?trash$/i.test(name);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });

  let conn: Deno.TlsConn | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: "Non autorisé" }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: smtpConfig } = await serviceClient
      .from("user_smtp_configs")
      .select("from_email, smtp_password")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!smtpConfig?.from_email || !smtpConfig?.smtp_password) {
      return json({ error: "Configuration email non trouvée." }, 400);
    }

    const { action, uid, mailbox = "INBOX", uids, destination } =
      (await req.json()) as {
        action: string;
        uid?: number;
        uids?: number[];
        mailbox?: string;
        destination?: string;
      };

    const targetUids = uids ?? (uid != null ? [uid] : []);
    if (targetUids.length === 0) return json({ error: "UID(s) requis" }, 400);

    conn = await Deno.connectTls({
      hostname: "imap.hostinger.com",
      port: 993,
    });

    await readResponse(conn);

    let tagNum = 0;
    const nextTag = () => `A${++tagNum}`;

    const escapedPass = smtpConfig.smtp_password
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    const loginResp = await sendCommand(
      conn,
      nextTag(),
      `LOGIN "${smtpConfig.from_email}" "${escapedPass}"`
    );
    if (!loginResp.includes("OK")) {
      conn.close();
      return json({ error: "Authentification IMAP échouée" }, 400);
    }

    const selectResp = await sendCommand(
      conn,
      nextTag(),
      `SELECT "${mailbox}"`
    );
    if (!selectResp.includes("OK")) {
      await sendCommand(conn, nextTag(), "LOGOUT");
      conn.close();
      return json({ error: "Impossible de sélectionner le dossier" }, 400);
    }

    const uidSet = targetUids.join(",");
    let success = false;

    if (action === "mark_read") {
      const resp = await sendCommand(
        conn,
        nextTag(),
        `UID STORE ${uidSet} +FLAGS (\\Seen)`
      );
      success = resp.includes("OK");
      if (success) {
        await serviceClient
          .from("email_messages")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .in("uid", targetUids)
          .eq("mailbox", mailbox);
      }
    } else if (action === "mark_unread") {
      const resp = await sendCommand(
        conn,
        nextTag(),
        `UID STORE ${uidSet} -FLAGS (\\Seen)`
      );
      success = resp.includes("OK");
      if (success) {
        await serviceClient
          .from("email_messages")
          .update({ is_read: false })
          .eq("user_id", user.id)
          .in("uid", targetUids)
          .eq("mailbox", mailbox);
      }
    } else if (action === "star") {
      const resp = await sendCommand(
        conn,
        nextTag(),
        `UID STORE ${uidSet} +FLAGS (\\Flagged)`
      );
      success = resp.includes("OK");
      if (success) {
        await serviceClient
          .from("email_messages")
          .update({ is_starred: true })
          .eq("user_id", user.id)
          .in("uid", targetUids)
          .eq("mailbox", mailbox);
      }
    } else if (action === "unstar") {
      const resp = await sendCommand(
        conn,
        nextTag(),
        `UID STORE ${uidSet} -FLAGS (\\Flagged)`
      );
      success = resp.includes("OK");
      if (success) {
        await serviceClient
          .from("email_messages")
          .update({ is_starred: false })
          .eq("user_id", user.id)
          .in("uid", targetUids)
          .eq("mailbox", mailbox);
      }
    } else if (action === "delete") {
      if (isTrashMailbox(mailbox)) {
        const resp = await sendCommand(
          conn,
          nextTag(),
          `UID STORE ${uidSet} +FLAGS (\\Deleted)`
        );
        await sendCommand(conn, nextTag(), "EXPUNGE");
        success = resp.includes("OK");
        if (success) {
          await serviceClient
            .from("email_messages")
            .update({ is_deleted: true })
            .eq("user_id", user.id)
            .in("uid", targetUids)
            .eq("mailbox", mailbox);
        }
      } else {
        const trashCandidates = ["INBOX.Trash", "Trash"];
        let copied = false;

        for (const trashFolder of trashCandidates) {
          const resp = await sendCommand(
            conn,
            nextTag(),
            `UID COPY ${uidSet} "${trashFolder}"`
          );
          if (resp.includes("OK")) {
            copied = true;
            console.error(
              `[delete] Copied to "${trashFolder}" successfully`
            );
            break;
          }
          console.error(
            `[delete] COPY to "${trashFolder}" failed, trying next...`
          );
        }

        if (copied) {
          await sendCommand(
            conn,
            nextTag(),
            `UID STORE ${uidSet} +FLAGS (\\Deleted)`
          );
          await sendCommand(conn, nextTag(), "EXPUNGE");
          success = true;
        } else {
          await sendCommand(
            conn,
            nextTag(),
            `UID STORE ${uidSet} +FLAGS (\\Deleted)`
          );
          await sendCommand(conn, nextTag(), "EXPUNGE");
          success = true;
          console.error(
            "[delete] No trash folder found, permanently deleted"
          );
        }

        if (success) {
          await serviceClient
            .from("email_messages")
            .update({ is_deleted: true })
            .eq("user_id", user.id)
            .in("uid", targetUids)
            .eq("mailbox", mailbox);
        }
      }
    } else if (action === "move" && destination) {
      const resp = await sendCommand(
        conn,
        nextTag(),
        `UID COPY ${uidSet} "${destination}"`
      );
      if (resp.includes("OK")) {
        await sendCommand(
          conn,
          nextTag(),
          `UID STORE ${uidSet} +FLAGS (\\Deleted)`
        );
        await sendCommand(conn, nextTag(), "EXPUNGE");
        success = true;
        await serviceClient
          .from("email_messages")
          .update({ is_deleted: true })
          .eq("user_id", user.id)
          .in("uid", targetUids)
          .eq("mailbox", mailbox);
      }
    } else {
      await sendCommand(conn, nextTag(), "LOGOUT");
      conn.close();
      return json({ error: `Action inconnue: ${action}` }, 400);
    }

    await sendCommand(conn, nextTag(), "LOGOUT");
    conn.close();

    return json({ success });
  } catch (err: unknown) {
    if (conn) {
      try {
        conn.close();
      } catch {}
    }
    return json({ error: (err as Error).message ?? "Erreur serveur" }, 500);
  }
});
