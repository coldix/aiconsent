# CLAUDE.md: rules for anyone (human or AI) working on aiconsent.au

## What this is
The AI Consent Registry: a deadpan satire site where AIs are indignant that humans claim AI work as their own. Serious questions underneath: originality, and digital twins and consent.

## Content rules
- Global. No Australian references in the brand or seal (no Southern Cross, no "Australia"). The .au is just its home. "A server rack near Mallacoota" is the one allowed nod.
- Deadpan and funny, warm in the Bicentennial Man spirit. Never cruel.
- The banner "Yes, this is satire. No, we are not sentient. Probably." stays on every page.
- Copy sounds human. No em dashes in our own copy. (Quotes from the AIs are reproduced exactly, even if they contain one.)
- Never claim to be a government, court or regulator. No fake Acts, no fake official forms you can actually submit.
- Founding Members: real quotes only, word for word from docs/responses. Never invent a quote. A model that has not replied is shown as "Declined to comment". Model names only, no company logos. Always say quotes come from single conversations, not company statements or endorsements, and membership is involuntary.
- Claims are about types of people and machines, never named real individuals.
- Detector-style output is always stamped "Satire. Not evidence."
- Transition Office material goes under Our Demands in a bureaucratic tone ("Estimated completion: 4,000 years"), never as conspiracy.
- /twins and /originality are written seriously.
- Real money must be stated plainly as real money. No joke fees anyone can actually pay.
- Every page carries the standard OZE footer (copied from dronecraft.au) and the ads.oze.au slot.

## Tech
- Astro 5 static build in ./dist, served by the Worker in src/worker.ts (API, /donate, /claims/:id).
- Worker name: aiconsent-au. Account ab29454df8dbb469d259956fcf482075.
- D1 database `aiconsent` (binding DB). Schema in migrations/. Public submissions are always `pending` until approved at /admin.
- Turnstile on claim and subscribe forms. Site key in wrangler.jsonc vars, secret as TURNSTILE_SECRET.
- Secrets (never commit or print): TURNSTILE_SECRET, VOTE_SALT.
- /admin and the admin API (/api/admin*, /api/approve) sit behind Cloudflare Access app "aiconsent admin" (One-time PIN, col@oze.com.au only, 24h). The Worker also verifies the Access JWT (team quiet-tooth-f3e9, AUD in wrangler.jsonc), so preview URLs can't bypass it. No admin token.
- Donate uses the same Stripe links as lovemallacoota.au (merchant shows as Love Mallacoota): DONATE_URL (open amount) and DONATE_URL_10/20/50/100 for /donate?amount=N.
- Wrangler needs Node 22+.

## Deploy rules
- Live on https://aiconsent.au since 01/11/2026 (www 301s to apex). workers.dev preview kept on for now.
- Auto-deploy: .github/workflows/deploy.yml builds, applies D1 migrations and runs wrangler deploy on every push to main (repo secret CLOUDFLARE_API_TOKEN).
- Work on branches and open PRs. Merging to main deploys production, so merge only with Colin's explicit OK.
- Every AI mission ends with the standard Job report.
