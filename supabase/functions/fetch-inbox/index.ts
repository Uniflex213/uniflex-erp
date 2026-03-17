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

async function readUntilTag(
  conn: Deno.TlsConn,
  buf: Uint8Array,
  tag: string,
  timeout = 15000
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
  cmd: string,
  timeout = 15000
): Promise<string[]> {
  await conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
  return readUntilTag(conn, buf, tag, timeout);
}

function parseEnvelope(envStr: string): {
  date: string | null;
  subject: string;
  from: { name: string; address: string }[];
  to: { name: string; address: string }[];
} {
  const result = {
    date: null as string | null,
    subject: "(Sans objet)",
    from: [] as { name: string; address: string }[],
    to: [] as { name: string; address: string }[],
  };

  const quotedStrings: string[] = [];
  let temp = envStr.replace(/"((?:[^"\\]|\\.)*)"/g, (_, p1) => {
    quotedStrings.push(p1.replace(/\\(.)/g, "$1"));
    return `\x00${quotedStrings.length - 1}\x00`;
  });

  function getQuoted(s: string): string {
    const m = s.match(/\x00(\d+)\x00/);
    return m ? quotedStrings[parseInt(m[1], 10)] || "" : s.replace(/^NIL$/i, "");
  }

  const topLevel: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of temp) {
    if (char === "(") {
      if (depth > 0) current += char;
      depth++;
    } else if (char === ")") {
      depth--;
      if (depth === 0) {
        topLevel.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    } else if (depth > 0) {
      current += char;
    } else if (char !== " " && char !== "\t") {
      current += char;
    } else if (current) {
      topLevel.push(current.trim());
      current = "";
    }
  }
  if (current) topLevel.push(current.trim());

  if (topLevel.length >= 1) {
    const dateStr = getQuoted(topLevel[0]);
    if (dateStr) {
      try {
        result.date = new Date(dateStr).toISOString();
      } catch {
        result.date = null;
      }
    }
  }

  if (topLevel.length >= 2) {
    let subj = getQuoted(topLevel[1]);
    if (subj) {
      subj = subj.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, text) => {
        try {
          if (enc.toUpperCase() === "B") {
            return atob(text);
          } else {
            return text.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (__, hex: string) =>
              String.fromCharCode(parseInt(hex, 16))
            );
          }
        } catch {
          return text;
        }
      });
      result.subject = subj;
    }
  }

  function parseAddressList(s: string): { name: string; address: string }[] {
    if (!s || s.toUpperCase() === "NIL") return [];
    const addrs: { name: string; address: string }[] = [];
    const addrParts: string[] = [];
    let d = 0;
    let cur = "";
    for (const c of s) {
      if (c === "(") {
        if (d > 0) cur += c;
        d++;
      } else if (c === ")") {
        d--;
        if (d === 0) {
          addrParts.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      } else if (d > 0) {
        cur += c;
      }
    }
    for (const ap of addrParts) {
      const tokens = ap.split(/\s+/);
      const name = getQuoted(tokens[0] || "");
      const mailbox = getQuoted(tokens[2] || "");
      const host = getQuoted(tokens[3] || "");
      const addr = mailbox && host ? `${mailbox}@${host}` : mailbox || "";
      addrs.push({ name: name || addr, address: addr });
    }
    return addrs;
  }

  if (topLevel.length >= 3) result.from = parseAddressList(topLevel[2]);
  if (topLevel.length >= 6) result.to = parseAddressList(topLevel[5]);

  return result;
}

function decodeQuotedPrintable(str: string, charset = "utf-8"): string {
  const cleaned = str.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "=" && i + 2 < cleaned.length) {
      const hex = cleaned.substring(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(cleaned.charCodeAt(i));
  }
  try {
    return new TextDecoder(charset).decode(new Uint8Array(bytes));
  } catch {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }
}

function decodeBase64(str: string, charset = "utf-8"): string {
  try {
    const clean = str.replace(/\s/g, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    try {
      return new TextDecoder(charset).decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  } catch {
    return str;
  }
}

function extractCharset(headerBlock: string): string {
  const m = headerBlock.match(/charset="?([^"\s;\r\n]+)"?/i);
  return m ? m[1].toLowerCase() : "utf-8";
}

function unfoldHeaders(raw: string): string {
  return raw.replace(/\r?\n[ \t]+/g, " ");
}

function splitHeaderBody(raw: string): { headers: string; body: string } | null {
  let idx = raw.indexOf("\r\n\r\n");
  if (idx !== -1) return { headers: raw.substring(0, idx), body: raw.substring(idx + 4) };
  idx = raw.indexOf("\n\n");
  if (idx !== -1) return { headers: raw.substring(0, idx), body: raw.substring(idx + 2) };
  return null;
}

function parseMultipartBody(body: string, boundary: string): { html: string; text: string } {
  let html = "";
  let text = "";
  const delimiter = "--" + boundary;
  const parts = body.split(delimiter);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed === "--" || trimmed.startsWith("--")) continue;
    let partContent = part;
    if (partContent.startsWith("\r\n")) partContent = partContent.substring(2);
    else if (partContent.startsWith("\n")) partContent = partContent.substring(1);
    const sub = parseMimePart(partContent);
    if (sub.html && !html) html = sub.html;
    if (sub.text && !text) text = sub.text;
  }
  return { html, text };
}

function parseMimePart(raw: string): { html: string; text: string } {
  const split = splitHeaderBody(raw);
  if (!split) return { html: "", text: "" };
  return parseMimeSection(split.headers, split.body);
}

function parseMimeSection(headers: string, body: string): { html: string; text: string } {
  let html = "";
  let text = "";

  const unfolded = unfoldHeaders(headers);
  const unfoldedLower = unfolded.toLowerCase();

  const ctMatch = unfoldedLower.match(/content-type:\s*([^;\r\n]+)/);
  const contentType = ctMatch ? ctMatch[1].trim() : "text/plain";
  const charset = extractCharset(unfolded);

  const teMatch = unfoldedLower.match(/content-transfer-encoding:\s*([^\r\n]+)/);
  const transferEnc = teMatch ? teMatch[1].trim() : "";

  console.error(`[mime] ct="${contentType}" te="${transferEnc}" hLen=${headers.length} bLen=${body.length}`);

  if (contentType.includes("multipart/")) {
    const boundaryMatch = unfolded.match(/boundary="?([^"\r\n;]+)"?/i);
    console.error(`[mime] boundary=${boundaryMatch ? boundaryMatch[1] : "NOT_FOUND"}`);
    if (boundaryMatch) {
      const result = parseMultipartBody(body, boundaryMatch[1].trim());
      html = result.html;
      text = result.text;
    }
  } else {
    let decoded = body;
    if (transferEnc === "quoted-printable") {
      decoded = decodeQuotedPrintable(body, charset);
    } else if (transferEnc === "base64") {
      decoded = decodeBase64(body, charset);
    }

    if (contentType.includes("text/html")) {
      html = decoded;
    } else if (contentType.includes("text/plain")) {
      text = decoded;
    }
  }

  return { html, text };
}

function extractBodyFromSource(source: string): { html: string; text: string } {
  console.error(`[extract] source starts with: ${JSON.stringify(source.substring(0, 200))}`);

  const result = parseMimePart(source);
  if (result.html || result.text) return result;

  if (source.length > 0) {
    const boundaryLineMatch = source.match(/\r?\n(--[A-Za-z0-9_=.+-]{10,})\r?\n/);
    if (boundaryLineMatch) {
      console.error(`[extract] fallback boundary detected: ${boundaryLineMatch[1]}`);
      const boundary = boundaryLineMatch[1].substring(2);
      const multiResult = parseMultipartBody(source, boundary);
      if (multiResult.html || multiResult.text) return multiResult;
    }

    const split = splitHeaderBody(source);
    if (split) {
      const bodyRaw = split.body.trim();
      if (bodyRaw.length > 0) {
        const headerBlock = split.headers.toLowerCase();
        if (headerBlock.includes("text/html")) {
          return { html: bodyRaw.substring(0, 100000), text: "" };
        }
        return { html: "", text: bodyRaw.substring(0, 100000) };
      }
    }
    return { html: "", text: source.substring(0, 50000) };
  }
  return result;
}

interface EmailRecord {
  user_id: string;
  uid: number;
  mailbox: string;
  subject: string;
  from_address: string;
  from_name: string;
  to_addresses: { name: string; address: string }[];
  cc_addresses: { name: string; address: string }[];
  received_at: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  has_attachments: boolean;
  fetched_at: string;
  body_html?: string | null;
  body_text?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let conn: Deno.TlsConn | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorise" }, 401);

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
    if (authErr || !user) return json({ error: "Non autorise" }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: smtpConfig } = await serviceClient
      .from("user_smtp_configs")
      .select("from_email, smtp_password")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!smtpConfig?.from_email || !smtpConfig?.smtp_password) {
      return json(
        { error: "Configuration email non trouvee. Allez dans Parametres > Email." },
        400
      );
    }

    const payload = await req.json().catch(() => ({}));
    const {
      action = "list",
      mailbox = "INBOX",
      uid,
      force_refresh = false,
      folder_name,
    } = payload as {
      action?: string;
      mailbox?: string;
      uid?: number;
      force_refresh?: boolean;
      folder_name?: string;
    };

    conn = await Deno.connectTls({ hostname: "imap.hostinger.com", port: 993 });
    const buf = new Uint8Array(16384);
    let tagNum = 0;
    const nextTag = () => `A${++tagNum}`;

    const greeting = await readLine(conn, buf);
    if (!greeting.includes("OK")) {
      conn.close();
      return json({ error: "Serveur IMAP indisponible" }, 500);
    }

    const escapedPass = `"${smtpConfig.smtp_password.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const loginResp = await sendCmd(conn, buf, nextTag(), `LOGIN "${smtpConfig.from_email}" ${escapedPass}`);
    const loginStatus = loginResp.find((l) => l.startsWith(`A${tagNum} `));
    if (!loginStatus || !loginStatus.includes("OK")) {
      conn.close();
      return json({ error: "Authentification IMAP refusee" }, 400);
    }

    if (action === "list_folders") {
      const listResp = await sendCmd(conn, buf, nextTag(), 'LIST "" "*"');
      const folders: string[] = [];
      for (const line of listResp) {
        const m = line.match(/\*\s+LIST\s+\([^)]*\)\s+"[^"]*"\s+"?([^"\r\n]+)"?/);
        if (m) folders.push(m[1]);
      }
      await sendCmd(conn, buf, nextTag(), "LOGOUT");
      conn.close();
      return json({ folders });
    }

    if (action === "create_folder" && folder_name) {
      const safeName = folder_name.replace(/"/g, "");
      const imapName = safeName.match(/^INBOX\./i) ? safeName : `INBOX.${safeName}`;

      const createResp = await sendCmd(conn, buf, nextTag(), `CREATE "${imapName}"`);
      const createTag = `A${tagNum}`;
      const createStatus = createResp.find((l) => l.startsWith(createTag + " "));
      console.error(`[create_folder] tag=${createTag} name="${imapName}" resp=${JSON.stringify(createResp)}`);

      if (!createStatus?.includes("OK")) {
        const subResp = await sendCmd(conn, buf, nextTag(), "SUBSCRIBE \"" + imapName + "\"");
        console.error(`[create_folder] subscribe resp=${JSON.stringify(subResp)}`);

        const retryResp = await sendCmd(conn, buf, nextTag(), `CREATE "${safeName}"`);
        const retryTag = `A${tagNum}`;
        const retryStatus = retryResp.find((l) => l.startsWith(retryTag + " "));
        console.error(`[create_folder] retry without prefix tag=${retryTag} name="${safeName}" resp=${JSON.stringify(retryResp)}`);

        if (retryStatus?.includes("OK")) {
          await sendCmd(conn, buf, nextTag(), "SUBSCRIBE \"" + safeName + "\"");
          await sendCmd(conn, buf, nextTag(), "LOGOUT");
          conn.close();
          return json({ success: true, folder: safeName });
        }

        await sendCmd(conn, buf, nextTag(), "LOGOUT");
        conn.close();
        const detail = createStatus || createResp.join(" | ");
        return json({ error: `Impossible de creer le dossier: ${detail}` }, 400);
      }

      await sendCmd(conn, buf, nextTag(), "SUBSCRIBE \"" + imapName + "\"");
      await sendCmd(conn, buf, nextTag(), "LOGOUT");
      conn.close();
      return json({ success: true, folder: imapName });
    }

    if (uid != null) {
      const { data: cached } = await serviceClient
        .from("email_messages")
        .select("*")
        .eq("user_id", user.id)
        .eq("uid", uid)
        .eq("mailbox", mailbox)
        .maybeSingle();

      if (cached?.body_html || cached?.body_text) {
        await sendCmd(conn, buf, nextTag(), "LOGOUT");
        conn.close();
        return json({ email: cached });
      }

      const selectResp = await sendCmd(conn, buf, nextTag(), `SELECT "${mailbox}"`);
      const selStatus = selectResp.find((l) => l.startsWith(`A${tagNum} `));
      if (!selStatus?.includes("OK")) {
        await sendCmd(conn, buf, nextTag(), "LOGOUT");
        conn.close();
        return json({ error: "Impossible de selectionner le dossier" }, 400);
      }

      const fetchTag = nextTag();
      await conn.write(encoder.encode(`${fetchTag} UID FETCH ${uid} (BODY[])\r\n`));

      const bodyBuf = new Uint8Array(65536);
      const streamDec = new TextDecoder("utf-8", { fatal: false });
      let rawSource = "";
      let partial = "";
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        const n = await conn.read(bodyBuf);
        if (n === null) break;
        partial += streamDec.decode(bodyBuf.subarray(0, n), { stream: true });
        if (partial.includes(`${fetchTag} OK`) || partial.includes(`${fetchTag} NO`) || partial.includes(`${fetchTag} BAD`)) {
          break;
        }
      }
      partial += streamDec.decode();

      const bodyMatch = partial.match(/BODY\[\]\s*\{(\d+)\}/i);
      if (bodyMatch && bodyMatch.index != null) {
        const afterBrace = partial.indexOf("\r\n", bodyMatch.index + bodyMatch[0].length);
        if (afterBrace !== -1) {
          const dataStart = afterBrace + 2;
          rawSource = partial.substring(dataStart);
          const tagEnd = rawSource.indexOf(`\r\n${fetchTag} `);
          if (tagEnd !== -1) rawSource = rawSource.substring(0, tagEnd);
          if (rawSource.endsWith("\r\n)")) rawSource = rawSource.slice(0, -3);
          else if (rawSource.endsWith("\n)")) rawSource = rawSource.slice(0, -2);
          else if (rawSource.endsWith(")")) rawSource = rawSource.slice(0, -1);
        }
      }

      console.error(`[fetch-inbox] uid=${uid} partial=${partial.length} raw=${rawSource.length}`);

      const { html, text } = extractBodyFromSource(rawSource);

      console.error(`[fetch-inbox] uid=${uid} html=${html.length} text=${text.length}`);

      if (cached) {
        await serviceClient
          .from("email_messages")
          .update({
            body_html: html || null,
            body_text: text || null,
            fetched_at: new Date().toISOString(),
          })
          .eq("id", cached.id);
      }

      await sendCmd(conn, buf, nextTag(), "LOGOUT");
      conn.close();

      return json({
        email: cached
          ? { ...cached, body_html: html || null, body_text: text || null }
          : { uid, mailbox, body_html: html || null, body_text: text || null },
      });
    }

    const mailboxVariants = [mailbox];
    const mlower = mailbox.toLowerCase();
    const shortName = mlower.replace(/^inbox\./, "");
    if (shortName !== mlower) {
      mailboxVariants.push(shortName.charAt(0).toUpperCase() + shortName.slice(1));
    }
    if (!mlower.startsWith("inbox.") && mlower !== "inbox") {
      mailboxVariants.push(`INBOX.${mailbox}`);
    }

    if (!force_refresh) {
      const { data: cached, count } = await serviceClient
        .from("email_messages")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .in("mailbox", mailboxVariants)
        .eq("is_deleted", false)
        .order("received_at", { ascending: false })
        .limit(50);

      if (cached && (count ?? 0) > 0) {
        const cacheAge = cached[0]?.fetched_at
          ? (Date.now() - new Date(cached[0].fetched_at).getTime()) / 1000 / 60
          : 999;
        if (cacheAge < 2) {
          await sendCmd(conn, buf, nextTag(), "LOGOUT");
          conn.close();
          return json({ emails: cached, from_cache: true });
        }
      }
    }

    const selectResp = await sendCmd(conn, buf, nextTag(), `SELECT "${mailbox}"`);
    let total = 0;
    for (const line of selectResp) {
      const m = line.match(/\*\s+(\d+)\s+EXISTS/i);
      if (m) total = parseInt(m[1], 10);
    }

    if (total === 0) {
      await sendCmd(conn, buf, nextTag(), "LOGOUT");
      conn.close();
      return json({ emails: [], from_cache: false });
    }

    const start = Math.max(1, total - 49);
    const range = `${start}:${total}`;

    const fetchTag = nextTag();
    await conn.write(encoder.encode(`${fetchTag} FETCH ${range} (UID FLAGS ENVELOPE)\r\n`));

    let fetchBuffer = "";
    const fetchDeadline = Date.now() + 20000;
    while (Date.now() < fetchDeadline) {
      const n = await conn.read(buf);
      if (n === null) break;
      fetchBuffer += decoder.decode(buf.subarray(0, n));
      if (
        fetchBuffer.includes(`${fetchTag} OK`) ||
        fetchBuffer.includes(`${fetchTag} NO`) ||
        fetchBuffer.includes(`${fetchTag} BAD`)
      ) {
        break;
      }
    }

    const emails: EmailRecord[] = [];
    const lines = fetchBuffer.split("\r\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith("* ") || !line.includes("FETCH")) continue;

      let fullLine = line;
      while (i + 1 < lines.length && !lines[i + 1].startsWith("* ") && !lines[i + 1].startsWith(fetchTag)) {
        i++;
        fullLine += "\r\n" + lines[i];
      }

      const uidMatch = fullLine.match(/UID\s+(\d+)/i);
      const uid = uidMatch ? parseInt(uidMatch[1], 10) : 0;
      if (!uid) continue;

      const flagsMatch = fullLine.match(/FLAGS\s*\(([^)]*)\)/i);
      const flags = flagsMatch ? flagsMatch[1].toLowerCase() : "";
      const isRead = flags.includes("\\seen");
      const isStarred = flags.includes("\\flagged");

      const envStart = fullLine.indexOf("ENVELOPE (");
      let envelope = { date: null as string | null, subject: "(Sans objet)", from: [] as { name: string; address: string }[], to: [] as { name: string; address: string }[] };
      if (envStart !== -1) {
        let depth = 0;
        let envEnd = envStart + 9;
        for (let j = envStart + 9; j < fullLine.length; j++) {
          if (fullLine[j] === "(") depth++;
          else if (fullLine[j] === ")") {
            depth--;
            if (depth === 0) {
              envEnd = j + 1;
              break;
            }
          }
        }
        const envStr = fullLine.substring(envStart + 10, envEnd - 1);
        envelope = parseEnvelope(envStr);
      }

      const fromAddr = envelope.from[0] || { name: "", address: "" };

      emails.push({
        user_id: user.id,
        uid,
        mailbox,
        subject: envelope.subject,
        from_address: fromAddr.address,
        from_name: fromAddr.name || fromAddr.address,
        to_addresses: envelope.to,
        cc_addresses: [],
        received_at: envelope.date,
        is_read: isRead,
        is_starred: isStarred,
        is_deleted: false,
        has_attachments: false,
        fetched_at: new Date().toISOString(),
      });
    }

    await sendCmd(conn, buf, nextTag(), "LOGOUT");
    conn.close();

    emails.sort((a, b) => {
      const da = a.received_at ? new Date(a.received_at).getTime() : 0;
      const db = b.received_at ? new Date(b.received_at).getTime() : 0;
      return db - da;
    });

    if (emails.length > 0) {
      await serviceClient.from("email_messages").upsert(emails, {
        onConflict: "user_id,uid,mailbox",
      });
    }

    const { data: platformSent } = await serviceClient
      .from("email_messages")
      .select("*")
      .eq("user_id", user.id)
      .in("mailbox", mailboxVariants)
      .eq("is_deleted", false)
      .neq("source", "imap")
      .order("received_at", { ascending: false })
      .limit(50);

    if (platformSent && platformSent.length > 0) {
      const existingUids = new Set(emails.map((e) => e.uid));
      for (const pe of platformSent) {
        if (!existingUids.has(pe.uid)) {
          emails.push(pe);
        }
      }
      emails.sort((a, b) => {
        const da = a.received_at ? new Date(a.received_at).getTime() : 0;
        const db = b.received_at ? new Date(b.received_at).getTime() : 0;
        return db - da;
      });
    }

    return json({ emails, from_cache: false });
  } catch (err: unknown) {
    if (conn) {
      try {
        conn.close();
      } catch {}
    }
    const msg = (err as Error).message ?? "Erreur serveur";
    console.error("IMAP Error:", msg);
    return json({ error: `Erreur: ${msg}` }, 500);
  }
});
