export function DashboardHTML(userId: string, email: string) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>READTalk Messenger</title>
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
            <h3>Form Username?</h3>
            <div class="info"><span class="label">Username: @username</span> <span id="username">${username}</span></div>
            <div class="info"><span class="label">Key ID:</span> <span id="userId">${userId}</span></div>
            <div class="info"><span class="label">Email:</span> <span id="email">${email}</span></div>
            <button onclick="logout()" class="logout-btn">Logout</button>
          </div>
        </div>
        <script>
          (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('user_id');
            const email = urlParams.get('email');

            if (userId && email) {
              localStorage.setItem('user_id', userId);
              localStorage.setItem('email', email);
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }

            const savedUserId = localStorage.getItem('user_id');
            const savedEmail = localStorage.getItem('email');
            if (savedUserId && savedEmail) {
              document.getElementById('userId').textContent = savedUserId;
              document.getElementById('email').textContent = savedEmail;
              document.getElementById('loading').style.display = 'none';
              document.getElementById('dashboard').style.display = 'block';
            } else {
              document.getElementById('loading').textContent = 'No session found. Please login to https://global.readtalk.workers.dev';
            }
          })();

          function logout() {
            localStorage.removeItem('user_id');
            localStorage.removeItem('email');
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `;
}
