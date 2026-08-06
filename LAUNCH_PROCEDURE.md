# AXXILAK LAUNCH PROCEDURE
*Written 2026-08-05 by Veris, after a real session where "checked" was said before a check actually happened, and it cost Timothy's trust. This document exists so that failure doesn't repeat — in this session or the next one. Read it before touching anything in this folder.*

---

## THE RULE THIS DOCUMENT EXISTS TO ENFORCE

**No verification claim counts unless the verification actually ran, in this turn, and its output is shown.**

Tonight, "Does a working version already exist I haven't found? Checked — no" was written before `git log --follow` had been run. It should have said "not checked yet." The gap between those two sentences is the whole reason this document exists. If you find yourself about to write "checked," "verified," "confirmed," or "no" — stop and ask: did I just run the command, or am I remembering that I usually would?

---

## BEFORE TOUCHING ANY FILE IN THIS FOLDER

1. `cd axxilak && git log --follow --oneline -- <the file>` — every time, no exceptions. Tonight's real finding: `index.html` had already been rebuilt and reverted once (`fc90693 Revert homepage to coming-soon placeholder`). A prior attempt existing changes what "safe" means.
2. Read the actual current file. Not a summary of it, not a memory of reading it earlier this session.
3. Run the Pre-Build Problem Scan (`P&P_BOOK\02_ENGINEERING_EXECUTION.md`) — seven questions, answered with real evidence, not assumed answers.
4. State the Love Gate — seven questions, shown — before the write happens, not after.

## AFTER EVERY SINGLE CHANGE, BEFORE THE NEXT ONE STARTS

1. Start the local server if it isn't running: `preview_start` with name `axxilak-local` (config already exists at `.claude\launch.json`, serves `axxilak/` on port 8878 — this exists specifically because `file://` silently breaks anything using `<script type="module">`, and Apex uses one).
2. Load the actual page that changed, over `http://localhost:8878/...`, never `file://`.
3. Check console for errors — `read_console_messages` with `onlyErrors: true`. Zero tolerance for new errors.
4. Click or read every link/control the change touched. Not "it should work" — watch it work.
5. Show the diff (`git diff`) of exactly what changed. The whole diff, not a description of it.
6. Report pass/fail plainly. If fail, stop and say so before touching anything else.

**One change at a time. Verify. Report. Wait for a go before the next one.** This is the Anti-Flail sequence from `02_ENGINEERING_EXECUTION.md` — it already existed, it just didn't get followed strictly enough tonight.

---

## CURRENT VERIFIED STATE (as of 2026-08-05, this session)

- **`index.html`** — nav wired to 4 of 6 real pages. Verified live on `localhost:8878`, zero console errors, exact diff shown and confirmed twice.
  - Linked: `about.html`, `discovery_gateway.html`, `axxilak_forge.html`, `free-stuff.html`
  - **Deliberately NOT linked — do not add without resolving first:**
    - `checkout.html` — not a real checkout. Card field is `disabled`, prefilled with a fake number, "Complete Purchase" runs a JS `alert()` and nothing else. Comment in the code admits it: `// In real implementation, this would call Gumroad API`. Timothy wants this to be a real, personal, relational flow (his words: "classy... deeply personal... we're going to break rules") that hands off to a real Gumroad checkout underneath. Not built yet.
    - `customer_dashboard.html` — shows fabricated purchase history ("You have 1 active webling in your library"). Flagged, not resolved.
  - **`about.html` needs a content fix before it's fully trustworthy**, even though it's linked: contains fabricated stats ("500+ Creators Empowered," "$2.4M+ Creator Revenue Enabled") that contradict every real business record (zero external sales, ever, on any of the three sites). Not yet corrected. Timothy shared real, personal replacement content tonight (a story about his brother, his dad, and a note from his mom) intended for a future page — not yet built in.
- **`Maizons/apex/`** — loads clean over the local server (zero console errors), confirmed tonight. This does NOT mean every feature inside it works — only that it initializes without error. Do not claim more than that without actually testing the specific feature in question.
- **Not pushed to GitHub. Nothing here is live on axxilak.com yet.** Repo is `PraxedisHaze/axxilak-com` (separate from the `apps` monorepo — no PII entanglement with that repo's exposure issue). Custody: Veris, per `BUSINESS\CUSTODY_MERGED_20260728.md` Section 4. Pushing requires Timothy's explicit yes in the moment, same as any public deploy — not implied by this document.

## REMAINING STEPS TO AN HONEST LAUNCH

1. Decide `checkout.html`'s real shape (Timothy's call, personal-story-plus-real-Gumroad direction already given — needs an actual build session).
2. Either fix or remove `customer_dashboard.html`'s fabricated data.
3. Replace `about.html`'s fabricated stats — likely with the real story Timothy shared tonight (brother/dad/mom notes), once he says it's ready to place.
4. Once all linked pages are real and verified: explicit go from Timothy → push to `origin/main` → verify the live `axxilak.com` endpoint directly (not just the local server) → report back with the live URL checked, not assumed.

## IF YOU ARE A DIFFERENT SESSION READING THIS

You are not starting over. Read this document, then `git log` on whatever file you're about to touch, then the current state section above. Don't re-verify what's already verified above unless something looks off — but don't trust it blindly either. Check it once, briefly, then move forward from there.
