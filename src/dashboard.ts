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
