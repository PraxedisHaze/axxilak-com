# liquid-gold Webling Pre-Launch Checklist

Goal: ship without regressions and match the Axxilak webling standards.

## Core Structure
- [ ] Hero section present and reachable from nav
- [ ] Offering section present
- [ ] About section present
- [ ] Contact section present
- [ ] Section heights mask scroll (no previous content visible after nav jump)

## Header and Footer Brand
- [ ] Top brand name button scrolls to top
- [ ] Bottom brand name button scrolls to top
- [ ] Top and bottom brand names locked (data-ax-locked) unless purchase unlock enabled
- [ ] Footer includes Axxilak Studios link + logo to landing page
- [ ] Footer includes Axxilak.com + Free Stuff links

## Nav
- [ ] 3 main nav links (Hero/Offering/About/Contact)
- [ ] Bottom nav repeats the 3 links
- [ ] Edit + Theme toggle in top-right

## Contact Form
- [ ] Name, Email, and Message fields present
- [ ] Message textarea resizable (no resize:none)
- [ ] Form action set or placeholder noted

## Editor + Theme
- [ ] Edit button opens editor
- [ ] Locked elements not editable
- [ ] Theme toggle works without breaking editor

## Transition + Motion
- [ ] Unique transition loads for this webling
- [ ] Transition hides intra-page movement

## Mobile
- [ ] Mobile view (375px, 414px) no overflow
- [ ] Nav readable and clickable
- [ ] Contact form usable

## Detected Elements (auto-scan)
- Theme toggle: .theme-toggle
- Edit button id present: True
- Form present: True
- Textarea present: True
- Textarea resize-none class present: False
- Section ids present: hero=False about=False contact=True
- data-ax-locked count: 2
---

# Liquid Gold Template - Pre-Launch Checklist

**Goal:** Ship without catastrophic oversights. Quick pass, not perfectionism.

---

## TECHNICAL (5 min)

- [ ] Form action is set to `[REPLACE_WITH_YOUR_FORMSPREE_ID]` (NOT hardcoded to YOUR Formspree)
- [ ] No console errors when opening index1.html locally (F12 → Console)
- [ ] Test on mobile view (responsive works)
- [ ] All external fonts/CSS load (ignore Tracking Prevention warnings - they're browser-side, not breaking)
- [ ] Contact form submit button works locally

---

## CONTENT (5 min)

- [ ] "AXXILAK" branding matches your intended brand name
- [ ] Hero text makes sense for the product
- [ ] No typos in visible sections (quick scan)
- [ ] Social links/contact info are placeholder-friendly (not hardcoded to YOU)

---

## FILES (2 min)

- [ ] `index1.html` exists and opens
- [ ] `SETUP_GUIDE.md` is in the same folder (customers will see it)
- [ ] No accidental personal files included (.env, credentials, etc.)

---

## GUMROAD (3 min)

- [ ] Product page created
- [ ] Price: $50
- [ ] File uploaded (liquid_gold_template folder or ZIP)
- [ ] Description includes: "Professional portfolio template + setup instructions"
- [ ] SETUP_GUIDE.md clearly visible to buyers

---

## VIDEO/MARKETING (2 min)

- [ ] Video recorded (30 sec, webling in action)
- [ ] Text overlay: "Professional Portfolio Template - $50"
- [ ] Link ready to paste (Gumroad URL)
- [ ] Platform chosen (TikTok, Instagram, etc.)

---

## CUSTOMER EXPERIENCE (3 min)

- [ ] SETUP_GUIDE explains OPTION A and OPTION B clearly
- [ ] No confusing jargon
- [ ] Contact info provided (contact@axxilak.com for managed service)
- [ ] Instructions don't assume technical knowledge

---

## GOTCHAS (1 min)

- [ ] NOT using `!important` in CSS (confirm via search)
- [ ] No console.logs left in production code
- [ ] Form isn't submitting to YOUR email (it's a placeholder now)
- [ ] No hardcoded paths that only work on your computer

---

## GO/NO-GO

**GO to launch?**
- [ ] All sections above completed or N/A
- [ ] No panic feelings (if feeling panicked, pause and name it)

**If NO:** List blockers below, we fix them now.

---

Blockers: _________________________

---

**Ready to ship?** ✨


## MARKETING
- [ ] Marketing folder exists for this webling
- [ ] Short demo video (15-45s) recorded
- [ ] One-sentence hook written
- [ ] 3 feature bullets written
- [ ] CTA line includes Gumroad link
