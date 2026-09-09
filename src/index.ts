import { issuer } from "@openauthjs/openauth";
import type { Storage } from "@openauthjs/openauth/storage";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";
import { DashboardHTML } from "./dashboard";

const subjects = createSubjects({
  user: object({ id: string() }),
});

// --- DO CLASS ---
export class AuthStorage {
  constructor(private state: DurableObjectState) {}
  async fetch(request: Request) {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") || "";
    const prefix = url.searchParams.get("prefix") || "";

    if (url.pathname === "/get") {
      const val = await this.state.storage.get(key);
      return Response.json(val?? null);
    }
    if (url.pathname === "/set") {
      const { key: k, value } = await request.json() as any;
      await this.state.storage.put(k, value);
      return Response.json({ ok: true });
    }
    if (url.pathname === "/remove") {
      await this.state.storage.delete(key);
      return Response.json({ ok: true });
    }
    if (url.pathname === "/scan") {
      const map = await this.state.storage.list({ prefix });
      return Response.json([...map.keys()]);
    }
    return new Response("not found", { status: 404 });
  }
}

// --- ADAPTER DO -> Storage ---
function DOStorage(ns: DurableObjectNamespace): Storage {
  const stub = () => ns.get(ns.idFromName("openauth-global"));
  return {
    get: async (key: string) => {
      const res = await stub().fetch(`https://do/get?key=${encodeURIComponent(key)}`);
      return (await res.json()) as any;
    },
    set: async (key: string, value: any, expiry?: any) => {
      // expiry di-ignore di DO, tapi bisa ditambah logic kalau mau
      await stub().fetch(`https://do/set`, {
        method: "POST",
        body: JSON.stringify({ key, value }),
      });
    },
    remove: async (key: string) => {
      await stub().fetch(`https://do/remove?key=${encodeURIComponent(key)}`);
    },
    scan: async (prefix: string) => {
      const res = await stub().fetch(`https://do/scan?prefix=${encodeURIComponent(prefix)}`);
      return (await res.json()) as string[];
    },
  };
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/dashboard") {
      const userId = url.searchParams.get("user_id") || "user_123";
      const email = url.searchParams.get("email") || "user@example.com";
      const html = DashboardHTML(userId, email);
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname === "/logout") {
      const response = Response.redirect("/");
      response.headers.set("Set-Cookie", "session=; Max-Age=0; path=/");
      return response;
    }
    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", url.origin + "/dashboard");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString());
    }
    if (url.pathname === "/callback") {
      return Response.json({
        message: "OAuth flow complete!",
        params: Object.fromEntries(url.searchParams.entries()),
      });
    }

    return issuer({
      storage: DOStorage(env.AUTH_DO),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => {
              console.log(`Sending code ${code} to ${email}`);
            },
            copy: { input_code: "Code (check Worker logs)" },
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
        const baseUrl = "https://global.readtalk.workers.dev";
        return Response.redirect(
          `${baseUrl}/dashboard?user_id=${userId}&email=${encodeURIComponent(value.email)}`,
          302
        );
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `INSERT INTO user (email) VALUES (?) ON CONFLICT (email) DO UPDATE SET email = email RETURNING id;`
  )
   .bind(email)
   .first<{ id: string }>();
  if (!result) throw new Error(`Unable to process user: ${email}`);
  console.log(`Found or created user ${result.id} with email ${email}`);
  return result.id;
}
