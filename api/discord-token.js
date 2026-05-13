/* ════════════════════════════════════════════════════════════
   api/discord-token.js  —  Vercel Serverless Function (Node.js)
   ────────────────────────────────────────────────────────────
   Runs in Node.js runtime (not Edge) so firebase-admin works.

   ENVIRONMENT VARIABLES (set in Vercel dashboard):
     DISCORD_CLIENT_ID       — Discord app client ID
     DISCORD_CLIENT_SECRET   — Discord app client secret  ⚠️ secret
     DISCORD_BOT_TOKEN       — Bot token for role lookup   ⚠️ secret
     DISCORD_GUILD_ID        — Your server ID
     FIREBASE_SERVICE_ACCOUNT — Full service account JSON as a string ⚠️ secret
                                 (copy the entire JSON file contents as one value)
   ════════════════════════════════════════════════════════════ */

const admin = require("firebase-admin");

/* ── Allowed Discord role IDs ── */
const ALLOWED_ROLES = [
  "962202155341742120",  // Captain
  "911659311120400384",  // Pirate
];

/* ── Init Firebase Admin once (survives warm lambda reuse) ── */
function getAdminAuth() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.auth();
}

/* ── Main handler ── */
module.exports = async function handler(req, res) {
  // CORS headers (needed if called from browser)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { code, redirectUri } = req.body ?? {};
  if (!code || !redirectUri) {
    return res.status(400).json({ error: "Missing code or redirectUri" });
  }

  try {
    /* ── Step 1: Exchange code for Discord access token ── */
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type:    "authorization_code",
        code,
        redirect_uri:  redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.status(400).json({ error: `Discord: ${tokenData.error_description ?? tokenData.error}` });
    }

    const accessToken = tokenData.access_token;

    /* ── Step 2: Get Discord user ── */
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const discordUser = await userRes.json();
    const discordId   = discordUser.id;
    const username    = discordUser.username;

    if (!discordId) {
      return res.status(400).json({ error: "Could not fetch Discord user" });
    }

    /* ── Step 3: Check guild membership + roles via bot token ── */
    const memberRes = await fetch(
      `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    );

    let hasRole = false;
    if (memberRes.ok) {
      const member = await memberRes.json();
      hasRole = (member.roles ?? []).some((r) => ALLOWED_ROLES.includes(r));
    }
    // If 404 — user isn't in the server at all, hasRole stays false

    /* ── Step 4: Mint Firebase custom token ── */
    // uid = "discord_{discordId}" — deterministic, same pattern as Potos!
    const firebaseUid = `discord_${discordId}`;
    const adminAuth   = getAdminAuth();
    const customToken = await adminAuth.createCustomToken(firebaseUid, {
      discordId,
      username,
    });

    return res.status(200).json({ customToken, hasRole, discordId, username });

  } catch (err) {
    console.error("[discord-token] Error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};
