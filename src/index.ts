import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage, type CloudflareStorageOptions } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";
import { DashboardHTML } from "./dashboard";

const subjects = createSubjects({ user: object({ id: string() }) });

// DO TAMBAHAN - GAK NYENTUH KV
export class AUTH_DO {
  constructor(private state: DurableObjectState) {}
  async fetch(request: Request) {
    if (request.method === "POST") {
      const { userId, email, profile } = await request.json() as any;
      const existing = await this.state.storage.get("profile") as any;
      if (!existing) {
        // PESAN PERTAMA = PROFILE ROOM
        await this.state.storage.put("profile", { userId, email, ...profile });
        await this.state.storage.put("messages", [
          { from: "system", text: `Room created for ${email}`, at: Date.now() }
        ]);
      }
      return Response.json({ ok: true });
    }
    const profile = await this.state.storage.get("profile");
    const messages = await this.state.storage.get("messages");
    return Response.json({ profile, messages });
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/dashboard") {
      const userId = url.searchParams.get("user_id") || "user_123";
      const email = url.searchParams.get("email") || "user@example.com";
      return new Response(DashboardHTML(userId, email), {
        headers: { "Content-Type": "text/html" },
      });
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

    // OPENAUTH TETAP PAKAI KV - SAMA PERSIS KAYA PUNYA LU
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
      // DISINI STATE JADI PROFILE ROOM
      success: async (ctx, value) => {
        const userId = await getOrCreateUser(env, value.email);
        
        // TAMBAHAN DOANG: bikin profile room + pesan pertama, gak ganggu redirect
        try {
          const roomId = env.AUTH_DO.idFromName(userId);
          const room = env.AUTH_DO.get(roomId);
          ctx.waitUntil(
            room.fetch(new Request("https://do/", {
              method: "POST",
              body: JSON.stringify({ userId, email: value.email, profile: { id: userId, email: value.email } })
            }))
          );
        } catch {}

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
