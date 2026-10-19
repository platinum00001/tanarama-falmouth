# tanarama-falmouth
Static copy of https://tanaramafalmouth.grok.me (Tanorama Falmouth, 365 Main St, Falmouth MA).
Files are the built site output (HTML + hashed JS/CSS + images). Serve the repo root as-is.

## Editing (Decap CMS)
Go to `/admin` on the live site, log in with GitHub, edit Main page text, Hours, Services, or Contact info, and Publish.
Each save commits to `main`; the host rebuilds (`node scripts/build.mjs` -> `dist/`).
`content/baseline.json` holds the original text and must not be edited. Hours in the Google structured data and
text not listed in the CMS are unchanged.

## Editor logins
Decap needs an auth backend. Option A (Vercel/other): GitHub OAuth App + a free OAuth proxy; set `base_url` in `admin/config.yml`.
Option B (Netlify): enable Identity + Git Gateway and change backend to `git-gateway`.
Editors need GitHub accounts with write access to this repo (Option A).
