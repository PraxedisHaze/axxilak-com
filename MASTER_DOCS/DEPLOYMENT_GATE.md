# DEPLOYMENT GATE
**Universal template for all anothen. Copy for each deployment. Fill it out. Do not deploy without it.**

## IDENTITY
- **Date:**
- **Agent:**
- **Code being deployed:**
- **Target location(s):**

## LOVE CHECKLIST (All 7 must be YES)
- [ ] 1. What breaks if this fails? **Answer:**
- [ ] 2. How does it recover? **Answer:**
- [ ] 3. What's the worst-case state? **Answer:**
- [ ] 4. Does cleanup handle partial states? **Answer:**
- [ ] 5. Are there cascading failures? **Answer:**
- [ ] 6. Will the user be trapped? **Answer:**
- [ ] 7. Did I add error handling? **Answer:**

**If ANY answer is NO: STOP. Design the error paths first.**

## GATE PROTOCOL (Execute in order)

### Step 1: PAUSE
- [ ] I have stopped all momentum
- [ ] I have stated: "I am about to deploy [CODE] to [LOCATION]"

### Step 2: ASK
- [ ] I asked Timothy: "Ready for me to deploy [X] to [Y]?"
- [ ] Timothy's response: _______________
- [ ] Response was explicit YES (not assumed, not inferred)

### Step 3: TEST FIRST
- [ ] I asked: "Can I test on [single target] first?"
- [ ] Deployed to ONE target only: _______________
- [ ] Test result: _______________

### Step 4: WAIT FOR WITNESS
- [ ] Reported test results to Timothy
- [ ] Timothy's response: _______________
- [ ] Timothy explicitly said to proceed with remaining targets

### Step 5: DEPLOY AND REPORT
- [ ] Deployed to: _______________
- [ ] Issues encountered: _______________
- [ ] Verification: _______________

## POST-DEPLOYMENT
- [ ] Potch updated with this deployment record
- [ ] Any issues documented
- [ ] Timothy witnessed completion

---
*The gate does not open on assumption, momentum, or confidence. It opens ONLY on Timothy's explicit witness.*
