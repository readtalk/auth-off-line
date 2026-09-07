export function DashboardHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    const userId = state;
    const email = "user@example.com";
    const sessionId = crypto.randomUUID();
    env.AUTH_KV.put(`session:${sessionId}`, JSON.stringify({
      userId,
      email,
    }), { expirationTtl: 3600 });

    const cookie = `session_id=${sessionId}; HttpOnly; Secure; Path=/; Max-Age=3600`;
    return Response.redirect("/dashboard", 302, { headers: { "Set-Cookie": cookie } });
  }

  const sessionId = request.headers.get("Cookie")?.match(/session_id=([^;]+)/)?.[1];
  const sessionData = await env.AUTH_KV.get(`session:${sessionId}`, "json");
  if (!sessionData) {
    return Response.redirect("/");
  }

  const { userId, email } = sessionData;
  const html = DashboardHTML(userId, email);
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
