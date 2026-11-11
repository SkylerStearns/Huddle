/**
 * Huddle Discord relay (Cloudflare Worker).
 *
 * Discord blocks requests coming from Google's servers, so the Apps Script back office
 * sends its Discord requests here instead, and this passes them on. It only allows the
 * few requests Huddle needs, and only when the request carries the shared RELAY_KEY.
 *
 * Secrets (Worker > Settings > Variables and Secrets):
 *   BOT_TOKEN  the Discord bot token
 *   RELAY_KEY  a long random password, also saved in Apps Script as DISCORD_RELAY_KEY
 */
const ALLOWED_GET = [
  /^\/channels\/\d+\/messages(\?limit=\d+)?$/, // read a channel's latest posts (announcements feed)
  /^\/channels\/\d+$/,                          // check the bot can see a channel
  /^\/guilds\/\d+\/channels$/,                 // list channels (fillChannelIds)
];
const WEBHOOK = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const UA = 'DiscordBot (https://skylerstearns.github.io/huddle, 1.0)';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Huddle relay is running.');
    if (request.headers.get('X-Relay-Key') !== env.RELAY_KEY) return json({ error: 'Not allowed.' }, 401);
    let req;
    try { req = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }

    if (req.webhook) {
      // Post a message through a channel webhook
      if (!WEBHOOK.test(req.webhook)) return json({ error: 'Not a Discord webhook URL.' }, 400);
      const res = await fetch(req.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
        body: JSON.stringify({ content: String(req.content || '').slice(0, 1900), allowed_mentions: { parse: ['roles'] } }),
      });
      return json({ status: res.status }, 200);
    }

    if (!ALLOWED_GET.some(r => r.test(req.path || ''))) return json({ error: 'That Discord request isn’t allowed.' }, 400);
    const res = await fetch('https://discord.com/api/v10' + req.path, {
      headers: { Authorization: 'Bot ' + env.BOT_TOKEN, 'User-Agent': UA },
    });
    return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  },
};

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
