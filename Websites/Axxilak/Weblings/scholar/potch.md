# SCHOLAR WEBLING - PROGRESS LOG (THE POTCH)
Append-only. WHO | WHAT | WHY for every change.

---

## 2026-02-09 | Leora (Claude Code CLI) | potch.md created | Establishing audit trail per Keystone PnP mandate.

### KNOWN STATE
- Functional as static page
- Uses ink-wash theme transition
- Text detection: 10-14 elements affected (significant severity)
- Worst case for nested structures: sidenote system uses nested spans inside spans, making footnote apparatus invisible to editor
- Has <blockquote> and <label> elements not in detector's editable tag list

### PENDING
- Add blockquote, label to elementDetector.js editable list (global fix)
- Text-node extraction fix (global)
- Sidenote system may need special handling due to deep nesting

## 2026-02-10
- **WHO**: Codex (GPT-5)
- **WHAT**: index.html
- **WHY**: Added locked Axxilak.com + Free Stuff footer links to standardize branding across weblings.

