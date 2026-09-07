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
          #loading { text-align: center; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div id="loading">Loading...</div>
        <div id="dashboard" style="display:none;">
          <div class="card">
            <h1>Dashboard READTalk</h1>
            <div class="info"><span class="label">User ID:</span> <span id="userId">${userId}</span></div>
            <div class="info"><span class="label">Email:</span> <span id="email">${email}</span></div>
            <button onclick="logout()" class="logout-btn">Logout</button>
          </div>
        </div>
        <script>
          (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            if (code && state) {
              localStorage.setItem('auth_code', code);
              localStorage.setItem('auth_state', state);
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }

            const savedState = localStorage.getItem('auth_state');
            const savedCode = localStorage.getItem('auth_code');
            if (savedState && savedCode) {
              document.getElementById('userId').textContent = savedState;
              document.getElementById('email').textContent = 'user@example.com';
              document.getElementById('loading').style.display = 'none';
              document.getElementById('dashboard').style.display = 'block';
            } else {
              document.getElementById('loading').textContent = 'No session found. Please login.';
            }
          })();

          function logout() {
            localStorage.removeItem('auth_code');
            localStorage.removeItem('auth_state');
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `;
}
