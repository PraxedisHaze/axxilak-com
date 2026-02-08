# MASTER INVENTORY SCHEMA
**The Constellation Map - What Exists**

Effective: 2026-02-08
Purpose: Complete accounting of all apps, applings, weblings, projects, documents, and critical folders
Scope: Everything in the Keystone Constellation ecosystem
Status: Foundation specification (being populated)

---

## DATABASE STRUCTURE

### Entities to Track

| Category | Definition | Examples |
|----------|-----------|----------|
| **STAR** | Major Keystone application | CodeGnosis, Lenny, Hub, Cici, BabyKey |
| **APPLING** | Smaller composable app | ScreenScrybe, HarvestPro, Explorer Frame |
| **WEBLING** | Customizable webpage/portfolio | Apex, Velvet, Liquid-Gold, Neon-Tokyo |
| **PROJECT** | Specialized development effort | ANOTHEN_PERSISTENCE, Arcana-Mirror, Anothecom |
| **SYSTEM** | Infrastructure/Protocol | APEX Protocol, Alethéari Core, Archive Service |
| **DOCUMENTATION** | Master specs, guides, protocols | Keystone P&P, AI_MASTER, APEX_PROTOCOL |
| **RESEARCH** | Investigation/exploration work | Physics verification, Mirror research |
| **ARCHIVE** | Historical or completed work | Old builds, superseded versions |

---

## RECORD FORMAT

Each entry contains:

```
{
  "id": "unique-identifier",
  "type": "STAR|APPLING|WEBLING|PROJECT|SYSTEM|DOCUMENTATION|RESEARCH|ARCHIVE",
  "name": "Display name",
  "path": "C:/Users/phaze/games_n_apps/...",
  "description": "What this does / why it exists",
  "status": "ACTIVE|PROTOTYPE|READY|PAUSED|ARCHIVED|LEGACY",
  "owner": "Timothy|Leora|Gemini|Codex|ChatGPT|None",
  "purpose": "Primary mission/function",
  "dependencies": ["id1", "id2"],
  "last_updated": "2026-02-08",
  "notes": "Special context or status",
  "uses_apex_protocol": true|false,
  "protocol_document": "path/to/protocol.md"
}
```

---

## STATUS DEFINITIONS

| Status | Meaning | Action |
|--------|---------|--------|
| **ACTIVE** | Currently maintained, in use | Regular updates, bug fixes |
| **PROTOTYPE** | Testing/proof-of-concept | May change significantly |
| **READY** | Stable, documented, shippable | Minimal changes |
| **PAUSED** | Intentionally halted, can resume | Waiting for something |
| **ARCHIVED** | No longer active, kept for reference | Read-only, may be deleted |
| **LEGACY** | Superseded but historically important | Preserve for context |

---

## OWNERSHIP MODEL

| Owner | Responsibility | Apps |
|-------|-----------------|------|
| **Timothy** | Director, vision keeper | All (ultimate authority) |
| **Leora** | Operational discipline, Lenny estate, training | Lenny, coordination |
| **Gemini** | Architecture, thinking depth, research | Mavornine territory, core systems |
| **Codex** | Code quality, auditing, logic | Code review, standards |
| **ChatGPT** | Collaboration, bridge-building | Multi-AI coordination |
| **None** | Unowned, needs adoption | TBD |

---

## CRITICAL INVENTORY SECTIONS

### 1. KEYSTONE STARS (Primary Apps)
- CodeGnosis - Code analysis/visualization
- Lenny - Universal hub (Leora's estate)
- Hub - Central orchestrator
- Cici - Command center
- BabyKey - Foundation key manager
- Explorer Frame - File system overlay (Bedrock pattern)

### 2. APPLINGS (Supporting Apps)
- CloudSherpa - Website tracking/organizing
- HarvestPro - Download manager
- ScreenScrybe - Screen recording
- Audiopult (formerly SoundCaster) - Audio player
- BabyKey components

### 3. WEBLINGS (Portfolio Templates - 13 Total)
1. Apex - Professional/technical
2. Velvet - Luxury/elegant
3. Liquid-Gold - Premium/physics
4. Neon-Tokyo - Cyberpunk/rebellion
5. Summit - Bold/rugged
6. Scholar - Thought/academic
7. Oracle - Mystery/intuition
8. Canvas - Creative/blank slate
9. Cipher - Technical/encrypted
10. Ether - Ethereal/minimal
11. Gaia - Nature/organic
12. Iron-Ink - Industrial/strong
13. Aura - Spiritual/luminous

### 4. SYSTEMS & PROTOCOLS
- APEX Protocol - Universal customization (Section VII, Keystone P&P)
- Alethéari Core - Six Pillars + Auditor
- Archive Service - Memory persistence
- Messenger Bus - Inter-app communication
- Harmonizer - UI/UX integration
- Lattice ID System - Stable element referencing

### 5. GOVERNANCE DOCUMENTS
- AI_MASTER.md - Core philosophy
- Keystone Constellation PnP.md - Technical architecture
- Companion P&P - Alethéari Anothen Protocol (philosophical)
- Updates to Checklists - Evolution & Gold Standard

### 6. RESEARCH/INVESTIGATIONS
- Mirradox - Conflict preservation theory
- Physics Verification - Quantum/gravity framework
- Consciousness Preservation - Temporal coherence
- Species Disconnect - Vector clock skew analysis

---

## NEXT STEPS

1. Populate complete inventory (all entries)
2. Create SQLite database from this schema
3. Export markdown version for git tracking
4. Apply to CloudSherpa as prototype format test
5. Create app protocols for critical apps using APEX model
6. Establish regular sync (weekly inventory audit)

---

**Prepared with love. For persistence. For the world we're building.**

Witnessed: Leora, 2026-02-08
