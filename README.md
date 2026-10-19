# tanarama-falmouth
Static copy of https://tanaramafalmouth.grok.me (Tanorama Falmouth, 365 Main St, Falmouth MA).
Files are the built site output (HTML + hashed JS/CSS + images). `node scripts/build.mjs` produces `dist/`.

Live (GitHub Pages): https://platinum00001.github.io/tanarama-falmouth/

## How the site is built and published
Every commit to `main` runs `.github/workflows/pages.yml`, which runs
`BASE_PATH=/tanarama-falmouth node scripts/build.mjs` and publishes `dist/` to GitHub Pages (about 1–2 minutes).
Repo **Settings → Pages → Source** must be set to **GitHub Actions** (one-time).

`scripts/build.mjs`:
- swaps the original text and photos (`content/baseline.json`) for the edited ones (`content/*.json`);
- `BASE_PATH` (optional, default empty) rewrites asset paths, the router base, and links so the site works
  under a sub-folder such as `/tanarama-falmouth/`. Leave it unset for root hosting (Vercel / custom domain);
- writes `404.html` (sends old/unknown links to the right page or home) and `.nojekyll`.

## Editing content directly on github.com (works today, no extra login needed)
Anyone with write access to this repo can edit right on GitHub:
1. Open the repo on github.com and go to the `content/` folder.
2. Click the file you want, then the pencil icon (**Edit this file**):
   - `home.json` – main headline, sub-headline, small line above the headline
   - `hours.json` – opening hours and the note under them
   - `services.json` – the four service descriptions
   - `contact.json` – phone, tap-to-call number, email, street address
   - `photos.json` – which photo file is used for each photo spot (see below)
3. Change only the text **between the quotes** on the right side. Keep the quotes, colons, and commas.
4. Click **Commit changes…** → **Commit changes**. The site rebuilds automatically; check the **Actions** tab
   (green tick = live) and refresh the site after 1–2 minutes.

To change a photo on github.com: open the `images/` folder → **Add file → Upload files**, upload the new photo
(e.g. `summer-hero.jpg`, no spaces), commit, then edit `content/photos.json` and change e.g.
`"photo_hero": "/images/hero.jpg"` to `"photo_hero": "/images/summer-hero.jpg"`. Each photo spot replaces that
picture everywhere it is shown on the site.

Do **not** edit `content/baseline.json` – it holds the original text/photos the build searches for.
If something breaks, open the Actions tab, or use the file's **History** to restore the previous version.

## Friendly edit page (Decap CMS at /admin)
https://platinum00001.github.io/tanarama-falmouth/admin/ – forms for Main page text, Hours, Services,
Contact info, and **Photos** (with previews; "Choose different image" uploads a new photo from a computer or
phone into `images/`). Each Publish commits to `main` and the site rebuilds automatically.

## Editor logins
The edit page logs in with GitHub through a small helper on Vercel (`tanarama-oauth` project, deployed at
https://tanarama-oauth.vercel.app; already set as `base_url` in `admin/config.yml`). To switch it on (one-time):
1. GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**:
   Homepage URL `https://platinum00001.github.io/tanarama-falmouth/`,
   Authorization callback URL `https://tanarama-oauth.vercel.app/api/callback`. Generate a client secret.
2. Vercel → project `tanarama-oauth` → Settings → Environment Variables: add `OAUTH_CLIENT_ID` and
   `OAUTH_CLIENT_SECRET`, then redeploy.
3. Give each editor a GitHub account with write access (repo → Settings → Collaborators).
Until then, use the github.com editing steps above.

## Known limits of the static copy
Features that needed the original app's server (sign-in / "My visits", the booking request form's server
submit) do not work on static hosting; the browser may log a harmless 404 for `/api/auth/get-session`.
