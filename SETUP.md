# Turning on the real Huddle

The app runs as a demo until two settings in `src/config.ts` are filled in. This guide gets you there. Plan on about an hour, in four parts. Each part makes a value you'll paste somewhere later, so keep a scratch note open.

| You'll collect | Where it goes |
|---|---|
| Discord server ID | Apps Script property `DISCORD_GUILD_ID` |
| Discord channel IDs | Sheet → Spaces → Channel ID |
| Discord webhook URL | Sheet → Spaces → Webhook URL |
| Discord bot token | Cloudflare relay secret `BOT_TOKEN` (never in the sheet or the code) |
| Relay address and password | Apps Script properties `DISCORD_RELAY_URL` and `DISCORD_RELAY_KEY` |
| Google client ID | Apps Script property `GOOGLE_CLIENT_ID` and `src/config.ts` |
| Apps Script web app URL | `src/config.ts` |

The data sheet is **Life Group Leadership – App Data (Starter)**. Keep it private to you (and later Mariners staff). The app never gives coaches direct access to it.

---

## 1. Discord server

**Create the server.** In Discord, click **+** → **Create My Own** → **For a club or community**. Name it "Mariners Young Adults".

**Turn on Developer Mode** so you can copy IDs: User Settings → Advanced → **Developer Mode** on.

**Roles** (Server Settings → Roles). Create: `Staff`, `Sr Coach`, `Coach`, `Leader`, `20s/30s`, `College`, `Group B`, `Group B Lead`, `Huddle B1` … `Huddle B8`.

**Categories and channels.** Make these to start. Channel names must match the Spaces tab in the sheet.

```
YOUNG ADULTS        #announcements  #staff 🔒  #general  #welcome
20s/30s             #2030s-announcements  #2030s-sr-coaches 🔒  #2030s-coaches 🔒  #2030s-general
20s/30s – GROUP B 🔒 #group-b  #huddle-b1 … #huddle-b8
```

**Permissions.** For each 🔒 channel or category: Edit → Permissions → turn on **Private**, then add only the roles that should see it:

- `#staff`: Staff
- `#2030s-sr-coaches`: Staff, Sr Coach
- `#2030s-coaches`: Staff, Sr Coach, Coach
- **20s/30s – Group B** category: Staff, Group B Lead. Then for `#group-b`, also add `Group B`; for `#huddle-b1`, also add `Huddle B1`, and so on.

For both announcements channels: let everyone view, but under @everyone turn **Send Messages off** and **Add Reactions** and **Send Messages in Threads on**. Give `Staff` Send Messages.

Check your work with Server Settings → Roles → (a role) → **View Server As Role**.

**Server default notifications**: Server name → Notification Settings → **Only @mentions**.

**Copy IDs into the sheet.** Right-click the server icon → **Copy Server ID** and save it for part 3. For channel IDs, the easy way: once part 3 is done, run **fillChannelIds** in the Apps Script editor and it fills in Spaces → **Channel ID** for every channel whose name matches. (By hand: right-click a channel → **Copy Channel ID**.)

**Webhook for automatic posts.** On `#2030s-announcements`: Edit Channel → Integrations → Webhooks → New Webhook → name it "Huddle" → **Copy Webhook URL**. Paste it into Spaces → **Webhook URL** on the "20s/30s Announcements" row (the one with Huddle Posts Here = TRUE). New coach assignments are announced there, and staff can post announcements from Huddle's Messages tab.

**Bot that reads announcements** for the home-screen feed:

1. Go to <https://discord.com/developers/applications> → **New Application** → name it "Huddle".
2. **Bot** in the left menu → **Reset Token** → copy it to your scratch note. Treat it like a password.
3. On the same page, turn on **Message Content Intent** and save.
4. **OAuth2** → **URL Generator** → tick **bot** → under permissions tick **View Channels** and **Read Message History** → open the generated link → add it to your server.
5. In Discord, give the bot's role access to every private channel whose posts should appear in the app (rows with Show in App Feed = TRUE).

**Relay, so the app can show announcements.** Discord turns away requests that come from Google Apps Script, so the back office can't read channels itself. It asks a small relay instead, and the relay asks Discord. The relay runs free on Cloudflare, only reads (it can't post), and holds the bot token. The code is `discord-relay/worker.js`.

1. Sign up at <https://dash.cloudflare.com> (free plan, no card needed).
2. **Workers & Pages → Create → Create Worker** (pick "Hello World" if it asks for a starting point). Name it `huddle-discord-relay` and click **Deploy**.
3. Click **Edit code**, replace everything with the contents of `discord-relay/worker.js`, and click **Deploy**.
4. Back on the Worker's page: **Settings → Variables and Secrets → Add**. Add two, each with type **Secret**:
   - `BOT_TOKEN`: the bot token from the step above
   - `RELAY_KEY`: a long random password (a password manager can make one). You'll paste the same value into Apps Script in part 3.
5. Copy the Worker's address (`https://huddle-discord-relay.<your-name>.workers.dev`). Opening it in a browser should say "Huddle relay is running."

Posting to Discord (welcomes, staff announcements) doesn't use the relay. That goes through channel webhooks, which Discord accepts from Google.

---

## 2. Google sign-in client

1. Go to <https://console.cloud.google.com> → project picker → **New Project** → "Huddle".
2. **APIs & Services → OAuth consent screen** (also called Google Auth Platform → Branding). Choose **External**, app name "Huddle", your email as support and developer contact. No extra scopes are needed. Under **Audience**, click **Publish app** so anyone with a Google account can sign in. Huddle only asks for name and email, so Google doesn't need to review it.
3. **Credentials** (or Clients) → **Create credentials → OAuth client ID** → **Web application**.
   - Authorized JavaScript origins: `https://skylerstearns.github.io` and `http://localhost:5173`
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`).

---

## 3. Apps Script back office

1. Go to <https://script.new>. Name the project "Huddle back office".
2. Replace the contents of `Code.gs` with `apps-script/Code.gs` from this repo.
3. Project Settings (gear) → tick **Show "appsscript.json" manifest file** → open it in the editor and replace it with `apps-script/appsscript.json`.
4. Project Settings → **Script Properties** → add:
   - `DATA_SHEET_ID`: `1Pq3nsm8mGt2kTSlAEfbED2bHbYur1m48z-IuEFD-y78`
   - `GOOGLE_CLIENT_ID`: from part 2
   - `DISCORD_GUILD_ID`: the server ID from part 1
   - `DISCORD_RELAY_URL`: the relay's address from part 1
   - `DISCORD_RELAY_KEY`: the same password you saved as `RELAY_KEY` on the relay
5. In the editor, pick **checkSetup** in the function menu and click **Run**. Approve the permissions (it's your own script). Open the log: every property should say "set", every tab should list its rows with no missing columns, and every Discord channel should say "bot can read it". The last line should say the announcements' text is coming through. If it says the text is blank, turn on **Message Content Intent** for the bot (part 1).
6. **Deploy → New deployment** → type **Web app** → Execute as **Me** → Who has access **Anyone** → Deploy. Copy the **Web app URL** (ends in `/exec`).

"Anyone" only means the URL accepts requests. The script turns away anyone without a valid Huddle sign-in, and only returns what that person is allowed to see.

**After changing Code.gs later:** Deploy → **Manage deployments** → pencil icon → Version: **New version** → Deploy. The URL stays the same.

---

## 4. Point the app at it

In `src/config.ts`, set:

```ts
export const API_URL = 'https://script.google.com/macros/s/…/exec';
export const GOOGLE_CLIENT_ID = '….apps.googleusercontent.com';
```

Commit and push to `master`. GitHub Pages rebuilds in a minute or two.

**Test it:** open the site, sign in with your Google account, and you should land on Group B. Add `?demo` to the address any time to see the sample-data demo instead.

---

## Who sees what

- **Staff:** everyone and everything, including staff notes.
- **Senior coaches:** their coaches and those coaches' leaders, with contact info; their own ministry's interviews; their group channel and their coaches' huddle channels.
- **Coaches:** their own leaders and their senior coach, with contact info; interviews they're running; their huddle and their senior coach's group channel.
- **Coach notes:** only the coach who wrote them.
- **Leaders:** use Discord. Huddle tells them it's for coaches for now.
- Other people's names show up where the app needs them (an interviewer's name, say), but their email and phone don't.

## Adding people

Add a row to **People** (Sign-in Email is the Google account they sign in with, if it's different from their contact email). For a leader, add an **Assignments** row pointing to their coach. For a coach, set **Senior Coach**. For a new huddle, add a **Spaces** row with Kind = Huddle and For Person = the coach.

## Auto posts to Discord

Huddle posts a welcome in Discord when someone new shows up in the sheet. The **Auto Posts** tab has a row for each event, with where it posts, an on/off switch and the wording. **Auto Post Log** records each post so nothing posts twice.

| Event | When | Default channel |
|---|---|---|
| New coach | A Coach with a Senior Coach is added | Group channel |
| New senior coach | A Senior Coach is added | Senior coaches channel |
| New leader | A leader gets their first coach (Assignments) | Group channel |
| Leader moved | A leader's coach changes (old assignment ended, new one added) | Group channel |

"Posts To" can be **Group channel**, **Huddle channel** or **Senior coaches channel**. Whichever you pick needs a webhook on that channel's Spaces row.

1. Give each group channel (`#group-b`, etc.) a webhook and paste it into that group's Spaces row (Kind = Group) under Webhook URL. The senior coaches channel already has one.
2. In Apps Script, paste the latest Code.gs and appsscript.json, then run **setupAutoPosts**. It marks everyone already in the sheet as posted and starts a check every 15 minutes. Run it again whenever you add a new event row.
3. Optional: run **sendTestAutoPosts** to see one test post per event.
