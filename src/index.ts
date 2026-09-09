//
import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage, type CloudflareStorageOptions } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";
import { DashboardHTML } from "./dashboard";

const subjects = createSubjects({ user: object({ id: string() }) });

// INI DO PENGGANTI D1
export class AUTH_DO {
  constructor(private state: DurableObjectState) {}
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (request.method === "POST") {
      const { email } = await request.json() as any;
      let user = await this.state.storage.get(`user:${email}`) as any;
      if (!user) {
        user = { id: `user_${crypto.randomUUID()}`, email, createdAt: Date.now() };
        await this.state.storage.put(`user:${email}`, user);
        await this.state.storage.put(`profile:${user.id}`, { id: user.id, email, messages: [{ from: "system", text: `Room created for ${email}` }] });
      }
      return Response.json(user);
    }
    return Response.json(null);
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/dashboard") {
      const userId = url.searchParams.get("user_id") || "user_123";
      const email = url.searchParams.get("email") || "user@example.com";
      return new Response(DashboardHTML(userId, email), { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname === "/logout") {
      const r = Response.redirect("/"); r.headers.set("Set-Cookie", "session=; Max-Age=0; path=/"); return r;
    }
    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", url.origin + "/dashboard");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize"; return Response.redirect(url.toString());
    }
    if (url.pathname === "/callback") {
      return Response.json({ message: "OAuth flow complete!", params: Object.fromEntries(url.searchParams.entries()) });
    }
    return issuer({
      storage: CloudflareStorage({ namespace: env.AUTH_KV as CloudflareStorageOptions["namespace"] }),
      subjects,
      providers: { password: PasswordProvider(PasswordUI({ sendCode: async (email, code) => console.log(`Code ${code} to ${email}`), copy: { input_code: "Code (check Worker logs)" } })) },
      theme: {
        title: "READTalk Messenger", primary: "#FF0000",
        favicon: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/favicon.ico",
        logo: { dark: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png", light: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png" },
      },
      success: async (ctx, value) => {
        const userId = await getOrCreateUser(env, value.email);
        const baseUrl = "https://global.readtalk.workers.dev";
        return Response.redirect(`${baseUrl}/dashboard?user_id=${userId}&email=${encodeURIComponent(value.email)}`, 302);
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

// INI YANG TADINYA PAKAI D1, SEKARANG PAKAI AUTH_DO
async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const dbId = env.AUTH_DO.idFromName("global-user-db");
  const stub = env.AUTH_DO.get(dbId);
  const res = await stub.fetch(new Request("https://do/", { method: "POST", body: JSON.stringify({ email }) }));
  const user = await res.json() as { id: string };
  console.log(`Found or created user ${user.id} with email ${email} via AUTH_DO`);
  return user.id;
}
