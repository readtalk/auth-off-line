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

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/dashboard") {
			const sessionId = request.headers.get("Cookie")?.match(/session_id=([^;]+)/)?.[1];
			if (!sessionId) {
				return Response.redirect("/");
			}

			const sessionData = await env.AUTH_KV.get(`session:${sessionId}`, "json");
			if (!sessionData) {
				return Response.redirect("/");
			}

			const { userId, email } = sessionData;
			const html = DashboardHTML(userId, email);
			return new Response(html, {
				headers: { "Content-Type": "text/html" },
			});
		}

		if (url.pathname === "/logout") {
			const sessionId = request.headers.get("Cookie")?.match(/session_id=([^;]+)/)?.[1];
			if (sessionId) {
				await env.AUTH_KV.delete(`session:${sessionId}`);
			}
			const response = Response.redirect("/");
			response.headers.set("Set-Cookie", "session_id=; Max-Age=0; path=/");
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
				title: "Authentication",
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
				const sessionId = crypto.randomUUID();
				await env.AUTH_KV.put(`session:${sessionId}`, JSON.stringify({
					userId,
					email: value.email,
				}), { expirationTtl: 3600 });

				ctx.cookie.set("session_id", sessionId, {
					httpOnly: true,
					secure: true,
					path: "/",
					maxAge: 3600,
				});

				return ctx.subject("user", { id: userId });
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
