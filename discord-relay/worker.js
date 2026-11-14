/**
 * Huddle Discord relay (Cloudflare Worker).
 *
 * Discord turns away requests that come from Google Apps Script, so the back office can't read
 * announcement channels itself. It asks this relay instead, and the relay asks Discord.
 *
 * The relay only reads. It allows the few lookups Huddle needs (listed below), and only when the
 * request carries the shared RELAY_KEY. Posting to Discord still goes straight from the back
 * office through channel webhooks, which Discord does accept from Google.
 *
 * Secrets (Worker > Settings > Variables and Secrets):
 *   BOT_TOKEN  the Discord bot token
 *   RELAY_KEY  a long random password, also saved in Apps Script as DISCORD_RELAY_KEY
 */
const ALLOWED = [
  /^\/channels\/\d+\/messages(\?limit=\d{1,3})?$/, // a channel's latest posts (announcements feed)
  /^\/channels\/\d+$/,                             // can the bot see this channel? (checkSetup)
  /^\/guilds\/\d+\/channels$/,                     // channel list (fillChannelIds)
  /^\/guilds\/\d+\/roles$/,                        // role names, so "@Coaches" reads properly in the feed
];
const MAX_PATHS = 25;
const UA = 'DiscordBot (https://github.com/SkylerStearns/huddle, 1.0)';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Huddle relay is running.');
    if (!env.BOT_TOKEN || !env.RELAY_KEY) return json({ error: 'The relay is missing its BOT_TOKEN or RELAY_KEY secret.' }, 500);
    if (!sameText(request.headers.get('X-Relay-Key') || '', env.RELAY_KEY)) return json({ error: 'Not allowed.' }, 401);

    let req;
    try { req = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
    const paths = req && Array.isArray(req.paths) ? req.paths : null;
    if (!paths || !paths.length || paths.length > MAX_PATHS) return json({ error: 'Bad request.' }, 400);
    if (!paths.every(p => typeof p === 'string' && ALLOWED.some(r => r.test(p)))) {
      return json({ error: 'That Discord request isn’t allowed.' }, 400);
    }

    // Ask Discord for everything at once; one slow or failed lookup doesn't sink the others.
    const results = await Promise.all(paths.map(async path => {
      try {
        const res = await fetch('https://discord.com/api/v10' + path, {
          headers: { Authorization: 'Bot ' + env.BOT_TOKEN, 'User-Agent': UA },
        });
        let body = null;
        try { body = await res.json(); } catch { /* not JSON, leave it empty */ }
        return { status: res.status, body };
      } catch {
        return { status: 502, body: null };
      }
    }));
    return json({ results }, 200);
  },
};

// Compares the whole string every time, so the reply time doesn't hint at how much of a guess was right.
function sameText(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
