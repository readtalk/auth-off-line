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
					.form-group { margin-bottom: 15px; }
					.form-group label { display: block; font-weight: 600; margin-bottom: 5px; }
					.form-group input[type="text"],
					.form-group input[type="url"] {
						width: 100%;
						padding: 8px 12px;
						border: 1px solid #ddd;
						border-radius: 6px;
						box-sizing: border-box;
					}
					.save-btn {
						background: #000000;
						color: white;
						border: none;
						padding: 10px 24px;
						border-radius: 8px;
						font-size: 1rem;
						cursor: pointer;
					}
					.save-btn:hover { background: #2f2f2f; }
					.status { margin-top: 10px; font-weight: 500; }
				</style>
			</head>
			<body>
				<div id="loading">Loading...</div>
				<div id="dashboard" style="display:none;">
					<div class="card">
						<h1>READTalk Profile</h1>
						<div class="info"><span class="label">User ID:</span> <span id="userId">${userId}</span></div>
						<div class="info"><span class="label">Email:</span> <span id="email">${email}</span></div>

						<hr />

						<div class="form-group">
							<label for="displayName">Display Name</label>
							<input type="text" id="displayName" placeholder="Your display name" />
						</div>
						<div class="form-group">
							<label for="avatarUrl">Avatar URL</label>
							<input type="url" id="avatarUrl" placeholder="https://example.com/avatar.jpg" />
						</div>

						<button class="save-btn" id="saveProfileBtn">Save Profile</button>
						<div id="saveStatus" class="status"></div>

						<hr />

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

					document.addEventListener('DOMContentLoaded', function() {
						const saveBtn = document.getElementById('saveProfileBtn');
						const statusDiv = document.getElementById('saveStatus');

						if (saveBtn) {
							saveBtn.addEventListener('click', async function() {
								const userId = localStorage.getItem('user_id');
								const displayName = document.getElementById('displayName').value.trim();
								const avatarUrl = document.getElementById('avatarUrl').value.trim();

								if (!userId) {
									statusDiv.textContent = 'Error: User ID not found.';
									statusDiv.style.color = 'red';
									return;
								}

								statusDiv.textContent = 'Saving...';
								statusDiv.style.color = 'black';

								try {
									const response = await fetch('/profile', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({ display_name: displayName || null, avatar_url: avatarUrl || null })
									});

									const data = await response.json();

									if (response.ok && data.success) {
										statusDiv.textContent = 'Profile saved successfully!';
										statusDiv.style.color = 'green';
									} else {
										statusDiv.textContent = 'Error: ' + (data.message || 'Failed to save profile.');
										statusDiv.style.color = 'red';
									}
								} catch (error) {
									statusDiv.textContent = 'Error: ' + error.message;
									statusDiv.style.color = 'red';
								}
							});
						}
					});
				</script>
			</body>
		</html>
	`;
}
