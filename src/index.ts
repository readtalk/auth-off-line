import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";
import { DashboardHTML } from "./dashboard";

const subjects = createSubjects({
  user: object({ id: string() }),
});

// ========== DURABLE OBJECT BUAT CHAT ==========
export class ChatRoom {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request) {
    const url = new URL(request.url);
    
    if (url.pathname === "/history") {
      const messages = await this.state.storage.get("messages") as any[] || [];
      return Response.json(messages);
    }

    if (request.method === "POST") {
      const msg = await request.json() as any;
      let messages = await this.state.storage.get("messages") as any[] || [];
      messages.push({ ...msg, timestamp: Date.now() });
      await this.state.storage.put("messages", messages);
      return Response.json({ ok: true });
    }

    return new Response("ChatRoom DO Active");
  }
}
// ==============================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // ROUTE CHAT KE DO
    if (url.pathname.startsWith("/api/chat")) {
      const id = env.CHAT_ROOM.idFromName("global-chat");
      const stub = env.CHAT_ROOM.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === "/dashboard") {
      const userId = url.searchParams.get("user_id") || "user_123";
      const email = url.searchParams.get("email") || "user@example.com";
      return new Response(DashboardHTML(userId, email), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/logout") {
      const res = Response.redirect(`${url.origin}/`, 302);
      res.headers.set("Set-Cookie", "session=; Max-Age=0; path=/");
      return res;
    }

    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", `${url.origin}/dashboard`);
      url.searchParams.set("client_id", "readtalk-web");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString(), 302);
    }

    // AUTH PAKAI KV (TETAP)
    return issuer({
      storage: CloudflareStorage({ namespace: env.AUTH_KV }),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => {
              console.log(`Code ${code} for ${email}`);
            },
            copy: { input_code: "Code (check logs)" },
          })
        ),
      },
      theme: {
        title: "READTalk Messenger",
        primary: "#FF0000",
        favicon: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/favicon.ico",
        logo: {
          dark: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
          light: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
        },
      },
      success: async (ctx, value) => {
        const userId = await getOrCreateUser(env, value.email);
        return ctx.subject("user", { id: userId });
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=excluded.email RETURNING id;`
  ).bind(email).first<{ id: string }>();
  if (!result) throw new Error(`Unable to process user: ${email}`);
  return result.id;
}
