# Backend setup

The site is backed by an Express API with MongoDB (Atlas) for all data — content,
contact-form submissions, and the admin login — plus Cloudinary for image hosting and
Nodemailer/Gmail for contact-form email notifications.

## 1. Install dependencies

```
npm install
```

## 2. Create a free MongoDB Atlas cluster

1. Sign up at https://www.mongodb.com/cloud/atlas/register (free tier, no card required).
2. Create a new free (M0) cluster — any cloud provider/region is fine.
3. Under **Database Access**, create a database user (username + password).
4. Under **Network Access**, add an IP entry allowing `0.0.0.0/0` (allow from anywhere) —
   fine for a small personal project; tighten later if you deploy somewhere with a fixed IP.
5. Click **Connect** on your cluster → **Drivers** → copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Paste it into `.env` as `MONGODB_URI`, replacing `<username>`/`<password>` with the
   database user you created, and add a database name before the `?`, e.g.:
   `mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/stepup?retryWrites=true&w=majority`

## 3. Create a free Cloudinary account

1. Sign up at https://cloudinary.com/users/register/free (free tier).
2. Your **Dashboard** shows a "Cloud name", "API Key", and "API Secret" right at the top.
3. Copy those three into `.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`.

## 4. Get a Gmail App Password (for contact-form emails)

Nodemailer needs an **App Password**, not your normal Gmail login password:

1. Turn on 2-Step Verification on the Google account you want to send from:
   https://myaccount.google.com/security
2. Go to https://myaccount.google.com/apppasswords and create an app password
   (any name works, e.g. "MindOra Contact Form").
3. Copy the 16-character password it gives you into `.env` as `GMAIL_APP_PASSWORD`.

## 5. Set your admin login

Edit `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` to whatever you want to log into
the `/admin` panel with. The seed script below uses them to create your admin account.
Changing them in `.env` later does **not** change your login by itself. To change the
password (or create the account without re-seeding), update `.env` and run:

```
npm run admin:password
```

## 6. Check `.env`

By the end of steps 2-5, `.env` should have real values (not placeholders) for:
`MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
`SESSION_SECRET` is already filled in for you. `.env` is gitignored, so none of this gets
committed. `.env.example` documents the same variables without real values.

If MongoDB fails to connect on Windows with an SRV/DNS lookup error, add
`DNS_SERVERS=8.8.8.8,1.1.1.1` to `.env`.

## 7. Seed the database (one time)

This copies the site's current content into MongoDB and creates your admin login:

```
npm run seed
```

Safe to re-run later — it won't touch your admin account if one already exists, but it
**will** reset all page content back to these defaults, so only re-run it if you actually
want that (e.g. to start over).

## 8. Run it

```
npm run dev
```

This starts the Vite dev server (frontend) and the Express API together. The frontend
calls the API under `/api/*`, which Vite proxies to `http://localhost:3001` in dev.

- Public content API: `GET /api/content/:page` (`home`, `td`, `surgalt`, `zuwluguu`)
- Admin panel: http://localhost:5173/admin.html — log in with `ADMIN_USERNAME`/`ADMIN_PASSWORD`
- Contact form submissions land in the `contactsubmissions` MongoDB collection.

Static files that are served as-is (images, fonts, the page scripts in `js/`) live in
`public/` and are referenced with root paths like `/assets/images/hero1.jpg`.

## 9. Production

```
npm run build
npm start
```

`npm run build` writes the site to `dist/`, and `npm start` runs the Express server, which
serves both `dist/` and the `/api` routes from one origin (http://localhost:3001 by default).
On a host, also set `NODE_ENV=production` (HTTPS-only session cookies) and, if the host puts
a proxy in front of the app (most do), `TRUST_PROXY=1`.
