# Keystone Constellation Continuity Routine

Purpose: preserve momentum and identity continuity during major work shifts.

## Trigger (when to run)
- After each major change block (for example: SEO foundation, navigation refactor, launch settings, policy pages).
- Before breaks longer than 30 minutes.
- Before any deploy/push.

## Step 1: Append snapshot
Append one entry to `CONTINUITY_LOG.md` with:
- Timestamp
- Stable now
- Changed in this step
- Open seams
- Next re-entry point

## Step 2: Refresh re-entry note
Update `REENTRY_NOTE.md` with:
- Current mission
- Immediate next 3 actions
- Exact first command to run

## Guardrails
- `CONTINUITY_LOG.md` is append-only.
- Keep entries concise and factual.
- If uncertain, prefer writing the snapshot first, then continuing work.
