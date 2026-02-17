// api/auth/callback.js
// Handles Google OAuth callback, exchanges code for tokens, sets cookie

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/?error=' + encodeURIComponent(error));
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      return res.status(400).json({ error: tokens.error_description || tokens.error });
    }

    // Store tokens in a secure httpOnly cookie (base64 encoded)
    const payload = Buffer.from(JSON.stringify({
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    Date.now() + tokens.expires_in * 1000
    })).toString('base64');

    res.setHeader('Set-Cookie', [
      `gauth=${payload}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
    ]);

    res.redirect('/?auth=success');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
