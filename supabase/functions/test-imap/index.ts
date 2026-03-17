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

const decoder = new TextDecoder();
const encoder = new TextEncoder();

async function readLine(
  conn: Deno.TlsConn,
  buf: Uint8Array,
  timeout = 10000
): Promise<string> {
  let accumulated = "";
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const n = await conn.read(buf);
    if (n === null) break;
    accumulated += decoder.decode(buf.subarray(0, n));
    if (accumulated.includes("\r\n")) break;
  }
  return accumulated.trim();
}

async function readAll(
  conn: Deno.TlsConn,
  buf: Uint8Array,
  tag: string,
  timeout = 10000
): Promise<string[]> {
  const lines: string[] = [];
  let partial = "";
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const n = await conn.read(buf);
    if (n === null) break;
    partial += decoder.decode(buf.subarray(0, n));
    const parts = partial.split("\r\n");
    partial = parts.pop() || "";
    for (const line of parts) {
      lines.push(line);
      if (line.startsWith(tag + " ")) return lines;
    }
  }
  if (partial) lines.push(partial);
  return lines;
}

async function sendCmd(
  conn: Deno.TlsConn,
  buf: Uint8Array,
  tag: string,
  cmd: string
): Promise<string[]> {
  await conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
  return readAll(conn, buf, tag);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const steps: string[] = [];

  try {
    steps.push("1-auth");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorise" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: "Non autorise" }, 401);
    steps.push("2-auth-ok");

    const payload = await req.json().catch(() => ({}));
    const { from_email, smtp_password } = payload as {
      from_email?: string;
      smtp_password?: string;
    };
    if (!from_email || !smtp_password) {
      return json({ error: "Email et mot de passe requis." }, 400);
    }
    steps.push("3-payload-ok");

    steps.push("4-tls-connect");
    const conn = await Deno.connectTls({
      hostname: "imap.hostinger.com",
      port: 993,
    });
    steps.push("5-tls-connected");

    const buf = new Uint8Array(8192);

    steps.push("6-read-greeting");
    const greeting = await readLine(conn, buf);
    if (!greeting.includes("OK")) {
      conn.close();
      return json(
        { success: false, error: "Serveur IMAP indisponible", details: greeting, steps },
        400
      );
    }
    steps.push("7-greeting-ok");

    steps.push("8-login");
    const escapedPass = `"${smtp_password.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const loginResp = await sendCmd(conn, buf, "A1", `LOGIN "${from_email}" ${escapedPass}`);
    const loginStatus = loginResp.find((l) => l.startsWith("A1 "));
    if (!loginStatus || !loginStatus.includes("OK")) {
      conn.close();
      return json(
        {
          success: false,
          error: "Identifiants IMAP invalides",
          details: loginStatus || loginResp.join(" | "),
          steps,
        },
        400
      );
    }
    steps.push("9-login-ok");

    steps.push("10-select-inbox");
    const selectResp = await sendCmd(conn, buf, "A2", "SELECT INBOX");
    let inboxCount = 0;
    for (const line of selectResp) {
      const m = line.match(/\*\s+(\d+)\s+EXISTS/i);
      if (m) inboxCount = parseInt(m[1], 10);
    }
    steps.push("11-inbox-ok:" + inboxCount);

    steps.push("12-list-folders");
    const listResp = await sendCmd(conn, buf, "A3", 'LIST "" "*"');
    const folders: string[] = [];
    for (const line of listResp) {
      const m = line.match(/\*\s+LIST\s+\([^)]*\)\s+"[^"]*"\s+"?([^"\r\n]+)"?/);
      if (m) folders.push(m[1]);
    }
    steps.push("13-folders:" + folders.length);

    steps.push("14-logout");
    await sendCmd(conn, buf, "A4", "LOGOUT");
    conn.close();
    steps.push("15-done");

    return json({
      success: true,
      message: "Connexion IMAP reussie",
      details: {
        inbox_count: inboxCount,
        folders_count: folders.length,
        folders: folders.slice(0, 20),
      },
      steps,
    });
  } catch (err: unknown) {
    const errMsg = (err as Error).message ?? String(err);
    console.error("test-imap error:", errMsg);
    return json(
      {
        success: false,
        error: "Echec IMAP",
        details: errMsg,
        steps,
      },
      400
    );
  }
});
