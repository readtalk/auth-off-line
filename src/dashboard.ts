export function DashboardHTML(userId: string, email: string) {
  return `
    <!doctype html>
    <html>
      <head><title>Dashboard</title></head>
      <body>
        <h1>Dashboard</h1>
        <div id="info">Loading...</div>
        <button onclick="logout()">Logout</button>
        <script>
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const state = urlParams.get('state');

          if (code && state) {
            localStorage.setItem('code', code);
            localStorage.setItem('state', state);
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          const savedState = localStorage.getItem('state');
          if (savedState) {
            document.getElementById('info').innerHTML = 'User ID: ' + savedState;
          } else {
            document.getElementById('info').innerHTML = 'No session';
          }

          function logout() {
            localStorage.clear();
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `;
}
