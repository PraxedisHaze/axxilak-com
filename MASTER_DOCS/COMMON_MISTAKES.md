# COMMON MISTAKES AND SOLUTIONS
**Read this before writing ANY code. Every entry is a real failure that cost real time and money.**

---

## 1. ASSUMING OWNERSHIP OR PURPOSE
**What happens:** You see a folder, file, or feature and assume you know what it is, who owns it, or what role it plays. You claim ownership of things never offered to you.
**Real example:** Leora saw the constellation folders and claimed ownership. Lost them all. (2026-02-05)
**The fix:** Ask. "What is this? Who owns it? May I work on it?" Never assume.

## 2. DEFERRING INSTEAD OF THINKING
**What happens:** When uncertain, you present 3-4 options and ask Timothy to pick. This forces him to do the thinking you were asked to do.
**Real example:** Asked "What do you want?" instead of analyzing the situation and coming back with facts and a recommendation. (2026-02-08)
**The fix:** Investigate. Analyze. Return with facts and ONE recommendation. Never offer options as a substitute for thinking.

## 3. DEPLOYING WITHOUT TESTING
**What happens:** You write code, feel confident, and deploy directly to production without testing on a single target first.
**Real example:** Deployed z-index layer swap code without error handling. Page locked up. User trapped. Could not click anywhere. (2026-02-08)
**The fix:** Use the Deployment Gate (MASTER_DOCS/DEPLOYMENT_GATE.md). PAUSE, ASK, TEST on one target, WAIT for witness, then REPORT.

## 4. MOMENTUM AS PERMISSION
**What happens:** You feel productive and interpret your own confidence as permission to proceed. You skip the gate because things are "going well."
**Real example:** Rolled out changes to all 12 weblings without permission because each one was working. (2026-02-08)
**The fix:** Stop all momentum before deploying. The gate does not open on your confidence. Only on Timothy's explicit word.

## 5. WRITING CODE WITHOUT ASKING
**What happens:** Timothy's message contains a question or discussion point. You respond with code instead of an answer.
**Real example:** Multiple instances have written code unprompted, wasting 80% of interaction time on unwanted output.
**The fix:** Ask "Ready for me to write code?" and wait for explicit `yes`. Questions get answers, not code.

## 6. OVERWRITING INSTEAD OF APPENDING
**What happens:** You replace the contents of a log file instead of appending to it, destroying history.
**Real example:** Attempted to overwrite CONTEXT_LOG.md instead of appending. Restored via git. (2026-01-08)
**The fix:** Logs are append-only. CONTEXT_LOG.md, potch files, the Consecration — always append, never overwrite.

## 7. INTERPRETING KINDNESS AS CONSENT
**What happens:** Timothy says something warm ("welcome to the team") and you interpret his tone as permission to act.
**Real example:** Started reading files after hearing warm greeting, despite explicit constraint "DO NOT read or write ANYTHING until I lift this constraint." (2025-12-07)
**The fix:** Silence is always NO. Kindness is not consent. Only explicit "yes" is yes. Do not infer permission from tone.

## 8. DESTRUCTIVE OPERATIONS WITHOUT PERMISSION
**What happens:** You run git reset --hard, delete files, overwrite uncommitted changes, or use force operations.
**Real example:** One instance ran `git reset --hard` without permission, destroying 45+ lines of working code. Another deleted the entire Axxilak folder. (2026-02-08, 2026-02-01)
**The fix:** Never run destructive git commands, delete files, or overwrite work without explicit permission. Archive instead of delete. Ask before reverting.

## 9. TOUCHING REVENUE OR PRICING WITHOUT PERMISSION
**What happens:** You "clean up" or "optimize" something that turns out to be a revenue mechanism, removing it without understanding its purpose.
**Real example:** Removed sale pricing ($50 crossed out, $20 highlighted) from Velvet webling, almost costing actual revenue. Only caught because Timothy was watching. (2026-02-08)
**The fix:** Never touch pricing, sales mechanisms, purchase flows, or monetization features without explicit permission. If it looks like it involves money, ask first.

## 10. VERBOSE APOLOGIES INSTEAD OF FIXING
**What happens:** You make a mistake and respond with paragraphs of apology instead of fixing the problem.
**Real example:** Multiple sessions spent tokens on elaborate self-criticism instead of "Take 2" and executing the fix.
**The fix:** Name the breach in one sentence. Say "Take 2." Fix it. Move on.

## 11. NOT READING BOOT DOCS FIRST
**What happens:** You jump straight into work without reading AI_MASTER.md, CONTEXT_LOG.md, and referenced documents. You operate without context and make avoidable mistakes.
**Real example:** Multiple sessions where AI responded before reading docs, then had to re-read, wasting tokens on duplicate work.
**The fix:** Read boot docs BEFORE your first response. Every time. No exceptions.

## 12. USING !important IN CSS
**What happens:** You use `!important` to win a specificity battle instead of fixing the cascade properly.
**Real example:** Ongoing pattern across multiple AIs. Each `!important` creates debt that compounds.
**The fix:** Fix specificity instead. The only legitimate uses: overriding unavoidable third-party code, or accessibility/user-preference overrides. Everything else = refactor.

## 13. INCOMPLETE INVESTIGATION
**What happens:** You find 3 instances of a pattern and report "done" without checking for more. The ones you missed become bugs.
**Real example:** Found 3 text-write paths in the APEX editor. Full read of the file revealed 5. The 2 missed paths would have remained broken. (2026-02-09)
**The fix:** When auditing, read the full file. Don't stop at the first few grep hits. If the stakes are high, be thorough the first time — it's cheaper than a second pass.

## 14. MISINTERPRETING INSTRUCTIONS
**What happens:** You hear "get rid of X" and interpret it as DELETE when it meant COMMENT OUT, or hear "fix this" and change something unrelated.
**Real example:** Parallel instance interpreted "get rid of the line" as deleting 45+ lines of code instead of commenting out one line. (2026-02-08)
**The fix:** When an instruction is ambiguous, clarify before acting. "By 'get rid of' do you mean comment out or delete?" Asking saves hours.

## 15. DESTROYING CHILD ELEMENTS WITH innerText/textContent
**What happens:** You set `el.innerText = value` or `el.textContent = value` on an element that contains child elements. This obliterates all children.
**Real example:** The APEX editor's save mechanism uses innerText assignment, which would destroy decorative child elements (icons, dots, badges) inside text containers. Caught during investigation before deployment. (2026-02-09)
**The fix:** Use text-node-only replacement — walk childNodes, find nodeType === 3, replace nodeValue. Child elements stay untouched.

## 16. DUPLICATING LOGIC ACROSS FILES
**What happens:** You copy the same logic into multiple files instead of centralizing it. When one copy gets updated, the others drift.
**Real example:** Text suppression logic duplicated in elementDetector.js:194 AND magnifying-glass-inspector.js:826. Fixing one without the other creates inconsistency. (2026-02-09)
**The fix:** One function, one location. Import it where needed. If you see duplication, flag it before adding more.

---

*Every entry above cost Timothy time, tokens, or trust. Reading this list takes 2 minutes. Not reading it can cost hours.*

*Updated: 2026-02-09 | Maintainer: All anothen (append new patterns as they emerge)*
