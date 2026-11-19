# Deployment guide: going live

A step-by-step guide to put your site on the internet with **MongoDB Atlas** (database) and **Render** (hosting). The same app also runs on any host that can run Node 20+; the steps and the environment variables are the same.

> **Read this first: free vs paid.** On Render's free plan the server goes to sleep after about 15 minutes without traffic, and there is no persistent disk (files are lost on every redeploy). For a business site that holds client files and sends reminders, use a **paid, always-on instance with a persistent disk**. The free plan is fine for a private test. Check Render's current pricing page for which plan includes disks.

---

## 0. What you need
- A GitHub account (private repository)
- A MongoDB Atlas account
- A Render account
- A domain name (about ₹800–1,500/year from any registrar)
- An email sending service (SMTP) and ideally a business email like `hello@yourdomain.com`
- 60–90 minutes

## 1. Put the code on GitHub
```bash
cd Portfolio_Anshu
git init && git add . && git commit -m "Initial commit"
# create an EMPTY private repo on github.com, then:
git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
git push -u origin main
```
Before pushing, confirm `git status` shows **no** `.env`, `node_modules`, `uploads` or `backups` files (the `.gitignore` already excludes them). Never commit secrets.

## 2. Create the database (MongoDB Atlas)
1. Create a **free (M0) cluster**. It has 512 MB of storage, which is plenty to start, but **no automated backups** (see step 9).
2. **Database Access** → add a database user with a long random password. Give it "read and write to any database" (or only your database).
3. **Network Access** → Atlas only accepts connections from IPs you allow. Hosts like Render use changing IP addresses, so the practical option is to allow `0.0.0.0/0` ("from anywhere"). That is safe **only because** your database password is long and random, so never reuse it. (Paid Atlas tiers offer private networking.)
4. **Connect → Drivers** → copy the connection string and put your database name in it:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/anshu_freelance?retryWrites=true&w=majority`
   If the password contains symbols like `@` or `/`, URL-encode them.

## 3. Set up email (SMTP)
Without email, invitations, invoices, reminders and new-enquiry alerts are only written to the server log and **nobody receives them**.
- Choose any SMTP provider (your domain's email host, or a transactional-email service). You need: host, port (usually 587), username, password.
- Use a sender address on **your own domain** and add the SPF/DKIM DNS records your provider gives you, or messages land in spam.
- Variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM="Anshu Sharma <hello@yourdomain.com>"`, and `OWNER_EMAIL` (where alerts and the daily summary go).

## 4. Create the Render service
**Option A: Blueprint (fastest).** In Render: *New → Blueprint* → pick your repo. It reads `render.yaml`. Fill in the prompted values (below).
**Option B: manual.** *New → Web Service* → your repo → Runtime **Node** →
- Build command: `npm run setup && npm run build`
- Start command: `npm start`
- Health check path: `/api/ready`
- Add a **Disk** mounted at `/var/data` (1 GB is enough to start)

### Environment variables
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `MONGODB_URI` | your Atlas connection string (step 2) |
| `JWT_SECRET` | 32+ random characters (Render can generate; or `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `DATA_ENCRYPTION_KEY` | a different 32+ character random value (encrypts 2FA secrets) |
| `CRON_SECRET` | 24+ random characters (used in step 7) |
| `PUBLIC_URL` and `CLIENT_ORIGIN` | your site URL with https, e.g. `https://yourdomain.com` (use the Render URL until your domain works) |
| `TRUST_PROXY` | `1` |
| `UPLOAD_DIR` | `/var/data/uploads` (must be on the disk) |
| `TZ` | `Asia/Kolkata` (so the "9 am" reminders mean 9 am IST) |
| `OWNER_EMAIL`, `SMTP_*`, `MAIL_FROM` | from step 3 |

On the first boot, read the logs. The server prints **`[startup warning]`** lines for anything risky (no email, no HTTPS, disk not persistent…). It refuses to start if `JWT_SECRET` is a placeholder. Aim for zero warnings.

## 5. Create your admin account
In Render open the service → **Shell**:
```bash
ADMIN_EMAIL=you@yourdomain.com ADMIN_PASSWORD='a-long-passphrase-12+' npm run seed
```
This creates your admin login and the starter content (it never overwrites anything you have edited). Then sign in at `https://yourdomain.com/login` and **immediately** turn on two-factor sign-in (Account → Two-factor sign-in) and save the recovery codes somewhere safe.

## 6. Custom domain and HTTPS
1. Render → your service → **Settings → Custom Domains** → add `yourdomain.com` and `www.yourdomain.com`.
2. At your registrar add the DNS records Render shows you (follow Render's screen exactly). HTTPS certificates are issued automatically once DNS resolves (can take from minutes to a few hours).
3. Set `PUBLIC_URL` and `CLIENT_ORIGIN` to `https://yourdomain.com` and redeploy. **Sign-in will not work over plain http** (cookies are `Secure` in production).

## 7. Make reminders and monitoring reliable
Your server sends reminders once a day. If the host ever sleeps, schedule an outside "poke":
1. Create a free account on a cron/uptime service (for example cron-job.org or UptimeRobot).
2. Add a **daily POST** at ~09:30 IST to `https://yourdomain.com/api/cron/daily` with the header `x-cron-secret: <your CRON_SECRET>`. Extra calls are harmless: each reminder is sent only once.
3. Add an uptime monitor on `https://yourdomain.com/api/ready` (alerts you by email if the site or database is down).

## 8. Launch checklist
- [ ] `[startup warning]` lines in the log: none left
- [ ] Admin → Overview → **Launch checklist** all ticked (business name/address, bank details, privacy contact…)
- [ ] Two-factor sign-in is on for your admin account
- [ ] Privacy Policy and Terms reviewed by a lawyer
- [ ] Send yourself a test enquiry from the contact form; confirm the alert and the auto-reply arrive
- [ ] Invite a test client, set a password, create a project, upload a file, post a message
- [ ] Create and send a test invoice; open it in the portal; use *Print / save as PDF*
- [ ] Admin → Overview → **Run now** for reminders (and check the email arrives)
- [ ] Paste your link into WhatsApp and LinkedIn to check the preview image and title
- [ ] Add real testimonials, case-study details, WhatsApp number and a booking link
- [ ] Submit `https://yourdomain.com/sitemap.xml` in Google Search Console
- [ ] Take your first backup (step 9) and test a restore on a spare database

## 9. Backups (do not skip)
Atlas's free tier has **no automated backups**. If the database is lost, so are your clients, invoices and contracts.
- Install MongoDB Database Tools on any computer or small server, then run: `MONGODB_URI="..." npm run backup`
  (creates a dated database archive and a copy of the uploads folder, keeps 14 days locally).
- Schedule it (cron on a server, or weekly on your laptop) and **copy the backups somewhere else** (cloud drive). A backup on the same machine as the live site is not a backup.
- Restore: `mongorestore --uri="$MONGODB_URI" --gzip --archive=db.archive.gz --drop`
- Uploaded client files live on the Render disk. Download that folder regularly too, or move uploads to cloud storage (a good next step).
- Consider a paid Atlas tier with built-in backups once real client work depends on it.

## 10. Updating and rolling back
- Push to GitHub: with `autoDeploy` Render rebuilds and releases automatically. Test locally first (`npm run build` and `npm run test:api`).
- If a release misbehaves, redeploy an earlier commit from the Deploys tab.
- Monthly: run `npm audit --omit=dev` in `frontend/` and in `backend/`, and update anything flagged.

## 11. Troubleshooting
| Symptom | Likely cause and fix |
|---|---|
| Server won't start: "JWT_SECRET looks like a placeholder" | Set a real random `JWT_SECRET` |
| "Could not connect to MongoDB" | Wrong connection string, special characters in the password not URL-encoded, or Atlas Network Access doesn't allow the host (step 2.3) |
| You can't sign in on the live site | `PUBLIC_URL` is not `https://…`, or you're on plain http |
| Real visitors get "Too many attempts" | `TRUST_PROXY` is not `1`, so everyone shares one IP |
| Uploaded files disappear after a deploy | `UPLOAD_DIR` is not on the persistent disk |
| Emails never arrive | SMTP not set (log shows `[mail:console]`), wrong credentials, or the sender domain lacks SPF/DKIM |
| Reminders didn't go out | Email not configured, reminders off in Site settings, or the host was asleep (set up step 7) |
| 2FA codes are "not valid" | The phone's clock is off. Turn on automatic time. Or use a recovery code |
| Everyone's 2FA stopped working | `DATA_ENCRYPTION_KEY` (or `JWT_SECRET` if the key was never set) was changed. Restore it; otherwise each person must re-enrol |
| Locked out (forgot password, or lost your phone and recovery codes) | In the Render **Shell** run `npm run recover -- you@yourdomain.com --reset-2fa`. It prints a one-time link to set a new password, turns off 2FA and signs out every old session. Then sign in and re-enrol 2FA |

## Sources used for this guide
- Render documentation on free-instance spin-down and persistent disks (render.com/docs) and Render's Blueprint spec
- MongoDB Atlas "Free Cluster Limits" (mongodb.com/docs/atlas/reference/free-shared-limitations)
Platform plans, limits and screens change; where this guide says "check", confirm in the provider's dashboard.
