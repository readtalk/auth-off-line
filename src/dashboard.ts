export function DashboardHTML(email: string, userId: string) {
	return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Profile</title>
        <link rel="stylesheet" type="text/css" href="https://static.integrations.cloudflare.com/styles.css">
      </head>
      <body>
        <header>
          <h1>Welcome, ${email}!</h1>
        </header>
        <main>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Email:</strong> ${email}</p>
          <form action="/logout" method="POST">
            <button type="submit">Logout</button>
          </form>
        </main>
      </body>
    </html>
  `;
}
