# aura Webling Pre-Launch Checklist

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
- Textarea resize-none class present: True
- Section ids present: hero=False about=False contact=False
- data-ax-locked count: 2

## GUMROAD
- [ ] Product page created
- [ ] Price set (per current pricing plan)
- [ ] ZIP or folder uploaded
- [ ] Description matches webling brand
- [ ] Delivery file verified
- [ ] Gumroad URL recorded in marketing notes
## MARKETING
- [ ] Marketing folder exists for this webling
- [ ] Short demo video (15-45s) recorded
- [ ] One-sentence hook written
- [ ] 3 feature bullets written
- [ ] CTA line includes Gumroad link
