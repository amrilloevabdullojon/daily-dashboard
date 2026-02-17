// api/auth/me.js
// Returns current user info if authenticated

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    cookies[k.trim()] = decodeURIComponent(v.join('='));
  });
  return cookies;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.gauth) {
    return res.json({ authenticated: false });
  }

  let tokenData;
  try {
    tokenData = JSON.parse(Buffer.from(cookies.gauth, 'base64').toString('utf-8'));
  } catch {
    return res.json({ authenticated: false });
  }

  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    if (user.error) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      name:    user.name,
      email:   user.email,
      picture: user.picture
    });
  } catch {
    res.json({ authenticated: false });
  }
}
