// ===== CHAT DO (PartyServer) - JANGAN DIUBAH =====
import { type Connection, Server, type WSMessage, routePartykitRequest } from "partyserver";
import type { ChatMessage, Message } from "../shared";

export class Chat extends Server<Env> {
  static options = { hibernate: true };
  messages = [] as ChatMessage[];

  broadcastMessage(message: Message, exclude?: string[]) {
    this.broadcast(JSON.stringify(message), exclude);
  }

  onStart() {
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, user TEXT, role TEXT, content TEXT)`
    );
    this.messages = this.ctx.storage.sql.exec(`SELECT * FROM messages`).toArray() as ChatMessage[];
  }

  onConnect(connection: Connection) {
    connection.send(JSON.stringify({ type: "all", messages: this.messages } satisfies Message));
  }

  saveMessage(message: ChatMessage) {
    const existing = this.messages.find((m) => m.id === message.id);
    if (existing) {
      this.messages = this.messages.map((m) => m.id === message.id ? message : m);
    } else {
      this.messages.push(message);
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO messages (id, user, role, content) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET content = ?`,
      message.id, message.user, message.role, message.content, message.content
    );
  }

  onMessage(connection: Connection, message: WSMessage) {
    this.broadcast(message as string);
    const parsed = JSON.parse(message as string) as Message;
    if (parsed.type === "add" || parsed.type === "update") {
      this.saveMessage(parsed);
    }
  }
}

// ===== OPENAUTH - SISTEM BAWAAN GAK DIUBAH =====
import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage, type CloudflareStorageOptions } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";
import { DashboardHTML } from "./dashboard";

const subjects = createSubjects({ user: object({ id: string() }) });

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // 1. CEK DULU: INI REQUEST CHAT (PARTYKIT) ATAU AUTH?
    // Kalau /parties /party /room = lempar ke Chat DO
    if (url.pathname.startsWith("/parties") || url.pathname.startsWith("/party")) {
      return (await routePartykitRequest(request, { ...env } as any)) || new Response("Not found", { status: 404 });
    }

    // 2. KALO BUKAN CHAT, JALANIN OA BAWAAN LU - GAK DIUBAH
    if (url.pathname === "/dashboard") {
      const userId = url.searchParams.get("user_id") || "user_123";
      const email = url.searchParams.get("email") || "user@example.com";
      return new Response(DashboardHTML(userId, email), { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname === "/logout") {
      const r = Response.redirect("/");
      r.headers.set("Set-Cookie", "session=; Max-Age=0; path=/");
      return r;
    }
    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", url.origin + "/dashboard");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString());
    }
    if (url.pathname === "/callback") {
      return Response.json({ message: "OAuth flow complete!", params: Object.fromEntries(url.searchParams.entries()) });
    }

    // OA TETAP PAKAI AUTH_KV
    return issuer({
      storage: CloudflareStorage({ namespace: env.AUTH_KV as CloudflareStorageOptions["namespace"] }),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => console.log(`Code ${code} to ${email}`),
            copy: { input_code: "Code (check logs)" },
          })
        ),
      },
      theme: {
        title: "READTalk Messenger", primary: "#FF0000",
        favicon: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/favicon.ico",
        logo: {
          dark: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
          light: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
        },
      },
      success: async (ctx, value) => {
        const userId = await getOrCreateUser(env, value.email);
        const baseUrl = "https://global.readtalk.workers.dev";
        return Response.redirect(`${baseUrl}/dashboard?user_id=${userId}&email=${encodeURIComponent(value.email)}`, 302);
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `INSERT INTO user (email) VALUES (?) ON CONFLICT (email) DO UPDATE SET email = email RETURNING id;`
  ).bind(email).first<{ id: string }>();
  if (!result) throw new Error(`Unable to process user: ${email}`);
  return result.id;
}
