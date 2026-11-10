# Huddle
A free, simple hub for church life group coaches and leaders: new leader onboarding, coach assignments, follow-up tracking, and group messaging in one place.

This version is a **demo**: it runs on made-up sample people and keeps changes in the browser. Use the person switcher (top right) to see the app as staff, a senior coach, or a coach.

## What's in it
- **Interviews:** My Interviews list, a setup checklist that shows whose turn it is, nudge log, the interview form, and staff review (Rock checkbox, decision, coach assignment).
- **Coaching:** My Leaders with gentle check-in reminders, the 90-day plan for new leaders, topics, private notes, check-in history.
- **Staff and senior coaches:** Needs attention, monthly digest, future coaches, roster and coach changes.
- **Messages:** templates, staff pushes with send-by dates, personalized email from the coach's own Gmail, tap-through texts.
- **Spaces:** links to Google Chat spaces by role.

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
- `src/data/types.ts` mirrors the tabs in the "Life Group Leadership – App Data" Google Sheet.
- `src/data/store.ts` is the demo storage. The next step replaces it with a Google Apps Script "back office" that checks who signed in and reads/writes the sheet, so coaches never get direct access to it.
