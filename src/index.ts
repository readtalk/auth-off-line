import { issuer } from "@openauthjs/openauth";
import {
	CloudflareStorage,
	type CloudflareStorageOptions,
} from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";
import { DashboardHTML } from "./dashboard";

const subjects = createSubjects({
	user: object({
		id: string(),
	}),
});

export class username implements DurableObject {
	constructor(private state: DurableObjectState, private env: Env) {}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const userId = url.searchParams.get("user_id");
		const email = url.searchParams.get("email");

		if (request.method === "POST" && url.pathname === "/profile") {
			const body = await request.json() as { displayName?: string; username?: string };
			const { displayName, username } = body;

			if (!userId) {
				return new Response("Missing user_id", { status: 400 });
			}

			await this.state.storage.put("profile", {
				userId,
				email,
				displayName: displayName || "",
				username: username || "",
			});

			return Response.json({ success: true, userId });
		}

		if (url.pathname === "/profile" && userId) {
			const profile = await this.state.storage.get("profile");
			if (!profile) {
				return new Response("Profile not found", { status: 404 });
			}
			return Response.json(profile);
		}

		return new Response("username DO", { status: 200 });
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/dashboard") {
			const userId = url.searchParams.get("user_id") || "user_123";
			const email = url.searchParams.get("email") || "user@example.com";
			const html = DashboardHTML(userId, email);
			return new Response(html, {
				headers: { "Content-Type": "text/html" },
			});
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
			storage: CloudflareStorage({
				namespace: env.AUTH_KV as CloudflareStorageOptions["namespace"],
			}),
			subjects,
			providers: {
				password: PasswordProvider(
					PasswordUI({
						sendCode: async (email, code) => {
							console.log(`Sending code ${code} to ${email}`);
						},
						copy: {
							input_code: "Code (check Worker logs)",
						},
					}),
				),
			},
			theme: {
				title: "READTalk Messenger",
				primary: "#FF0000",
				favicon: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/favicon.ico",
				logo: {
					dark: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
					light:
						"https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
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
		`
		INSERT INTO user (email)
		VALUES (?)
		ON CONFLICT (email) DO UPDATE SET email = email
		RETURNING id;
		`,
	)
		.bind(email)
		.first<{ id: string }>();
	if (!result) {
		throw new Error(`Unable to process user: ${email}`);
	}
	console.log(`Found or created user ${result.id} with email ${email}`);
	return result.id;
}
