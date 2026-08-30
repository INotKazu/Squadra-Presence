# Encrypted cloud link

Squadra Presence v0.7 uses a small Cloudflare Worker and D1 database as an encrypted device vault. The PC and Android app encrypt/decrypt locally with AES-GCM. Cloudflare stores a vault identifier, an authentication verifier, ciphertext, a revision number, and an update time; it never receives the private link code or readable app data.

The vault is a device-link feature, not a conventional email/password account system. The private code is both the pairing secret and the only recovery key.

## One-time Cloudflare setup

Cloudflare's current setup flow requires a free Cloudflare account and Node.js. The official references are the [Workers CLI guide](https://developers.cloudflare.com/workers/get-started/guide/) and [D1 getting-started guide](https://developers.cloudflare.com/d1/get-started/).

Open PowerShell in this repository and run:

```powershell
cd cloud-worker
npm install
npx wrangler login
npm run db:create
npm run db:remote
npm run deploy
```

What those commands do:

1. Install the pinned Worker development tools.
2. Open Cloudflare's authorization page.
3. Create `squadra-cloud-vault` and add its `DB` binding plus database ID to `wrangler.toml`.
4. create the encrypted-vault table in the remote D1 database.
5. Deploy the API and print a URL similar to `https://squadra-cloud-vault.your-subdomain.workers.dev`.

Open the printed URL with `/health` appended. A successful deployment returns JSON containing `"ok":true`.

The D1 database ID written to `wrangler.toml` is a resource identifier, not a password. Cloudflare account access is still required to administer or deploy the Worker.

## Preconfigure test and release builds

The Worker URL is public and is safe to store as a GitHub Actions variable:

1. Open the GitHub repository.
2. Go to **Settings → Secrets and variables → Actions → Variables**.
3. Create a repository variable named `CLOUD_SYNC_URL`.
4. Set it to the root `https://...workers.dev` URL, without `/health` or a trailing slash.

The Android beta and Windows test workflows map this to `VITE_CLOUD_SYNC_URL`. If the variable is absent, cloud linking still works; the URL can be pasted into Settings on each device.

For a locally built signed Windows release, create an ignored `.env.production.local` file in the repository root:

```dotenv
VITE_CLOUD_SYNC_URL=https://squadra-cloud-vault.your-subdomain.workers.dev
```

Then use the normal release script.

## Pair the PC and Android companion

1. On the device containing the data to keep, open **Settings → Encrypted cloud link**.
2. Select **Generate new code**.
3. Save the private code in a password manager, then select **Upload this device**.
4. On the other device, enter the same Worker URL and private code.
5. Select **Link existing code**, then **Download cloud copy**.
6. After making changes, use **Sync now** on either device.

`Sync now` uploads when only local data changed, downloads when only the cloud changed, and does nothing when both copies match. If both sides changed since their last common revision, the app stops and asks which copy to keep. **Upload this device** intentionally replaces the cloud copy; **Download cloud copy** intentionally replaces the portable data on that device.

## Data boundary

Cloud sync includes:

- Public tracker ID and portable tracker/display preferences
- Selected fighter, manual rank, and per-fighter Helpers
- Star Collection level and reward-note overrides
- Saved builds and Kazuma's Pick overrides
- Rank-gain samples and every saved season journal
- Startup animation and chime preferences
- Background-music toggle and volume preference

It deliberately excludes:

- Discord Rich Presence state
- Game-process hints and process detection
- Windows login/tray behavior
- OBS overlay state
- Desktop updater and skipped-version state
- The cloud link code itself

This keeps Android from importing desktop-only behavior and prevents an exported local backup from accidentally copying the cloud credential.

## Security and recovery

- Treat the private link code like a password. Anyone who gets it can download and decrypt that vault.
- The code is stored only on linked devices. It is transformed into separate vault, authorization, and AES-256 key material before requests are sent.
- Cloudflare cannot decrypt or recover a forgotten code. Generate a new vault if every linked device and the saved code are lost.
- Requests use optimistic revisions, so concurrent writes fail instead of silently replacing a newer copy.
- The Worker accepts only its compact encrypted envelope and caps each vault below D1's 2 MB row limit.
- Keep ordinary JSON backups as a separate recovery option before choosing an explicit overwrite.

## Capacity and upgrades

The free Workers plan currently allows 100,000 requests per day. D1 Free includes 5 million rows read per day, 100,000 rows written per day, 5 GB total account storage, and a 500 MB maximum per free database. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

With deliberate sync instead of constant polling, the practical first target is about 3,000–5,000 daily active users, with higher totals possible when each user syncs lightly. One 500 MB database holds roughly 5,000–10,000 typical 50–100 KB encrypted vaults. At that point, upgrade to Workers Paid and/or shard vaults by the first bytes of their vault ID. The client link-code format does not need to change.

Workers Paid currently starts at $5 USD per month, includes 10 million Worker requests per month, and raises the D1 per-database cap to 10 GB. Configure Cloudflare usage notifications before public distribution.

## Maintenance

Worker-only changes do not require a new APK or Windows build as long as the API remains compatible. From `cloud-worker`, run:

```powershell
npm install
npm run typecheck
npm run deploy
```

Schema changes should be additive and applied with `npm run db:remote` before deploying code that requires them.
