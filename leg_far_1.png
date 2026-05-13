/* ════════════════════════════════════════════════════════════
   api/discord-token.js  —  Vercel Edge Function
   ────────────────────────────────────────────────────────────
   Handles the server-side part of Discord OAuth:
   1. Exchanges the auth code for a Discord access token
   2. Fetches the user's guild member info + roles
   3. Checks for Captain / Pirate role
   4. Mints a Firebase custom token
   5. Returns { customToken, hasRole, discordId, username }

   ENVIRONMENT VARIABLES (set in Vercel dashboard):
     DISCORD_CLIENT_ID      — from Discord Developer Portal
     DISCORD_CLIENT_SECRET  — from Discord Developer Portal (SECRET — never in client code)
     DISCORD_BOT_TOKEN      — bot token for role lookup (SECRET)
     DISCORD_GUILD_ID       — your server ID
     FIREBASE_SERVICE_ACCOUNT — full Firebase service account JSON (stringify it)

   HOW TO SET IN VERCEL:
     vercel.com → your project → Settings → Environment Variables
     Add each key above. They'll be available as process.env.KEY_NAME
   ════════════════════════════════════════════════════════════ */

// Firebase Admin — loaded server-side only (safe)
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/* ── Init Firebase Admin (once) ── */
function getAdminAuth() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

/* ── Allowed Discord roles ── */
const ALLOWED_ROLES = [
  "962202155341742120",  // Captain
  "911659311120400384",  // Pirate
];

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { code, redirectUri } = body;
  if (!code || !redirectUri) {
    return json({ error: "Missing code or redirectUri" }, 400);
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
    if (tokenData.error) throw new Error(`Discord token error: ${tokenData.error}`);

    const accessToken = tokenData.access_token;

    /* ── Step 2: Get Discord user info ── */
    const userRes  = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const discordUser = await userRes.json();
    const discordId   = discordUser.id;
    const username    = discordUser.username;

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

    /* ── Step 4: Mint Firebase custom token ── */
    // uid format matches the pattern in app.js: discord_{id}@othersea.app
    const firebaseUid  = `discord_${discordId}`;
    const adminAuth    = getAdminAuth();
    const customToken  = await adminAuth.createCustomToken(firebaseUid, {
      discordId,
      username,
      hasRole,
    });

    return json({ customToken, hasRole, discordId, username });

  } catch (err) {
    console.error("[discord-token]", err);
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const config = { runtime: "edge" };
