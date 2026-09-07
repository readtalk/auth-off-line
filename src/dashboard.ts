export async function DashboardHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    const userId = state;
    const email = "user@example.com";
    const sessionId = crypto.randomUUID();
    await env.AUTH_KV.put(`session:${sessionId}`, JSON.stringify({
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

export function DashboardHTML(userId: string, email: string) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Dashboard - READTalk</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 0 20px;
            background: #f0f2f5;
            color: #111b21;
          }
          .card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          h1 { margin-top: 0; color: #ff0000; }
          .info { margin: 16px 0; }
          .label { font-weight: 600; color: #667781; }
          .logout-btn {
            background: #ff0000;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 20px;
          }
          .logout-btn:hover { background: #e60000; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Dashboard READTalk</h1>
          <div class="info"><span class="label">User ID:</span> ${userId}</div>
          <div class="info"><span class="label">Email:</span> ${email}</div>
          <form action="/logout" method="post">
            <button type="submit" class="logout-btn">Logout</button>
          </form>
        </div>
      </body>
    </html>
  `;
}
