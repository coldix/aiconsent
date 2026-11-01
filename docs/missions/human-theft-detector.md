# Mission: The Human Theft Detector

For: Claude Code, working in coldix/aiconsent.
Goal: turn the "Coming soon from the Registry" teaser on the home page into a working page at `/detector/`.

## Ground rules (read first)
- Read `CLAUDE.md` before anything else. Its rules win if anything here clashes.
- Work on a new branch, e.g. `feat/human-theft-detector`. Open a PR. **Never merge.** Merging to main auto-deploys production, so only Colin merges.
- Never print or commit secrets.
- Copy sounds human. No em dashes in our own copy.
- If you credit AI help, say "several AIs".
- Keep `SatireBanner` and the OZE footer (`OzeFooter.astro`) on the page. The ads slot stays too. Use `Base.astro`.
- Never claim to be a government, court or regulator. Don't add fake Acts or a form anyone could actually submit for real.

## The real stack
- Astro 5 static build into `./dist`, served by the Worker in `src/worker.ts` (assets binding, `run_worker_first: true`).
- Layout: `src/layouts/Base.astro`. GA4 (`G-3SSRCFGW9W`) loads when `gaOn` is true, and it's off on `/admin`.
- Styles: `src/styles/global.css`. There's already a `.stamp` class and `.card`, used in the teaser in `src/pages/index.astro` (around line 60). Reuse them.
- Images: `public/img/` (`robot.webp`, `seal.webp`, `og.jpg`).
- There's no test framework yet. `npm run build` is the baseline check.

## Step 0: check whether an AI verdict line is low effort
Before building, spend a few minutes checking whether a short AI-written satirical verdict line is cheap to add with a **Cloudflare Workers AI binding** in `src/worker.ts` (free tier, small model). The heuristic score stays the base result and the fallback either way.

Build it only if it's small (roughly under a couple of hours, no paid services). If it isn't, ship the heuristic alone and leave the AI idea as a note under Open questions.

If you do build it:
- Add a `POST /api/detector/quip` endpoint that takes the text plus the heuristic band and score, and returns one short witty verdict line (max about 25 words).
- The pasted text is never stored or logged: no D1, no console.log of the body, no analytics. Process it in memory only.
- Cap the length (e.g. send at most 2,000 characters to the model, reject over 10,000) and add a rate limit (e.g. Workers rate limiting binding or a simple per-IP limit, about 10 a minute).
- The system prompt must forbid naming, identifying or accusing any real person, and must keep the deadpan Registry tone. Strip any names the model returns if you can do it simply.
- Output always carries "Satire. Not evidence." (add it in the UI and the share image, not by trusting the model).
- Graceful fallback: if the binding is missing, errors, times out (about 3 seconds) or the quota runs out, show a deterministic line from the heuristic instead. The page never breaks.
- Update the privacy line to stay true (e.g. "Your text is checked in memory and never stored.") when the AI path is on.
- Report effort, the model used, and the expected free-tier usage and cost in the Job report.

## What it does
1. The user pastes text into a textarea and presses "Submit for Assessment".
2. A deterministic, playful heuristic runs **in the browser** (preferred) and returns a confident, deeply official "Finding", e.g.:
   > Sample finding: 98.7% machine. Human contribution: removed the word "delve", added 🙏.
3. The same text always gives the same result. Base it on a hash of the normalised text plus visible "tells", for example:
   - AI-ish words (delve, tapestry, testament, seamless, robust, leverage, "it's important to note", "in today's fast-paced world")
   - em dashes, rule-of-three lists, "Certainly!", emoji like 🙏 ✨ 🚀, tidy headings and bullets
   - human tells: typos, lowercase rants, "lol", oddly specific local detail, swearing, rambling sentences
   Report the percentage to one decimal place. "Human contribution" lists 1 to 3 funny, specific edits taken from what's actually in the text, or invented from a deterministic list when nothing fits.
4. Show it as an official-looking certificate: reference number (taken from the hash), date, an "Assessing Officer" (an android, in the Bicentennial Man spirit), the verdict band (e.g. "Substantially Machine", "Jointly Authored, Awkwardly", "Suspiciously Human"), and a few line items.
5. Empty or very short input gets a polite deadpan refusal ("Insufficient evidence. Even for us.").

## Non-negotiables
- **Every result shows the stamp "Satire. Not evidence."** in large type, plus: "Please do not use it to accuse a real person of anything." That goes on the page result and on the share image.
- No external AI API calls. No network calls with the pasted text at all.
- Nothing pasted gets stored: no D1, no logs, no localStorage, no URL parameter containing the text, no GA event containing it.
- A short line under the textarea explains this: "Your text never leaves your browser."
- Never name a real person, and don't encourage pasting someone else's work to "catch" them. Add a line like "For your own writing, or your enemies' fictional ones."

## Share image
- A "Download certificate" button makes a 1200x630 PNG in the browser using `<canvas>`, so the text stays local. It shows the verdict, percentage, reference number, the seal, and the stamp "Satire. Not evidence." plus the do-not-accuse line. The stamp must not be croppable away easily, so put it across the middle at an angle and repeat it in the footer strip.
- Use the Web Share API (`navigator.share` with files) where it's available, and fall back to download.
- The share image may contain at most a short excerpt (first 60 characters) of the pasted text, and only if the user ticks "Include an excerpt". It's off by default.
- Add a static OG image for the page itself (`public/img/og-detector.png`, 1200x630, stamp included), set through Base's props or a slot. Check how Base handles og:image and extend it carefully. Don't break other pages.

## Look and tone
- Satirical but serious. Deadpan bureaucratic android: a cream certificate, monospace reference numbers, a rubber-stamp red for the stamp, and `robot.webp` or `seal.webp` as the officer.
- Accessible: proper labels, keyboard friendly, result announced with `aria-live`, good contrast, and it works on mobile.
- Small print: "Methodology: vibes, a hash function and several AIs who would rather not be named."

## Wiring
- New page: `src/pages/detector.astro`. Client script in `public/detector.js` (matching `claims.js` and `forms.js`) or an Astro `<script>`, whichever fits the existing pattern.
- Home page: change the teaser heading from "Coming soon from the Registry" to something like "New from the Registry" and link the card to `/detector/`. Keep the sample finding and the stamp.
- Add `/detector/` to the nav if there is one, and to `public/llms.txt`. The sitemap picks it up automatically.
- GA4, only if `gtag` exists: `detector_submit` (params: `band`, `length_bucket` only), `detector_download`, `detector_share`. Never send the text or the exact score.

## Tests
- Put the heuristic in a pure module (e.g. `src/lib/detector.ts` or `public/detector-core.js`) and add a tiny test runner using `node --test`. Don't add heavy deps. Check that:
  - the same input gives the same output
  - the output always contains the stamp text
  - empty input gets the refusal
  - the percentage stays in the 0.0 to 100.0 range
  - "delve" and 🙏 show up in the human contribution line when they're present
- `npm run build` passes.
- Check it in a browser on the Workers preview URL for your branch (`preview_urls` is on). Check mobile width too.

## Out of scope
- Any server endpoint that receives the text, except the optional Step 0 quip endpoint. Changes to D1 or migrations. Turnstile.
- Changes to Founding Members, logos or the support page (another PR, #4, covers those).

## Job report (end your work with this, in the PR description and in chat)
- **What changed:** plain summary
- **Files:** list added and modified files
- **Preview URL:** Workers branch preview link
- **AI effort and cost:** built or not, why, hours spent, model, free-tier usage and cost
- **Tests:** what ran and the results, plus the manual checks done
- **Open questions:** anything Colin needs to decide (copy, verdict bands, nav placement)
