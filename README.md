# Huddle
A free, simple hub for church life group coaches and leaders: new leader onboarding, coach assignments, follow-up tracking, and group messaging in one place.

Until `src/config.ts` is filled in, the app is a **demo**: it runs on made-up sample people and keeps changes in the browser. Use the person switcher (top right) to see the app as staff, a senior coach, or a coach.

Once it's set up (see **[SETUP.md](SETUP.md)**), people sign in with Google and work from the real sheet through the Apps Script back office in `apps-script/`. Add `?demo` to the address to see the demo again.

## What's in it
- **Interviews:** My Interviews list, a setup checklist that shows whose turn it is, nudge log, the interview form, and staff review (Rock checkbox, decision, coach assignment).
- **Coaching:** My Leaders with gentle check-in reminders, the 90-day plan for new leaders, topics, private notes, check-in history.
- **Staff and senior coaches:** Needs attention, monthly digest, future coaches, roster and coach changes.
- **Messages:** templates, staff pushes with send-by dates, personalized email from the coach's own Gmail, tap-through texts.
- **Spaces and announcements:** the Discord channels each person can see, and a read-only announcements feed on the home screen with a link to each post in Discord.

## Run it locally
```
npm install
npm run dev
```

## Publish on GitHub Pages (free)
1. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Every push to `master` builds and publishes the site (see `.github/workflows/deploy.yml`).

## How it's built
- Vite + React + TypeScript. React loads from cdnjs, so the bundle only holds this app's code.
- `src/data/types.ts` mirrors the tabs in the "Life Group Leadership – App Data (Starter)" Google Sheet.
- `src/data/store.ts` holds the data: in the demo it lives in the browser; in the real app it loads from the back office and sends each change back.
- `apps-script/Code.gs` is the back office. It checks each Google sign-in, filters the sheet down to what that person may see, saves changes, reads Discord channels for the feed, and posts to Discord through webhooks.
