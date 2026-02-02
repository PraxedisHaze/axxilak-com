# Canonical Repository Registry

**Purpose:** Prevent duplicate work and confusion. Each app/project has ONE canonical GitHub repository.

**Last Updated:** 2026-02-01

---

## Apps & Their Canonical Repos

| App | Canonical Repo | Purpose | Status |
|-----|---|---|---|
| **Axxilak** | `PraxedisHaze/axxilak-com` | Webling marketplace + editor | 🟢 Active |
| **CodeGnosis** | `PraxedisHaze/CodeGnosis` | Code analyzer/visualizer | 🟢 Active |
| **Hub** | `games_n_apps` (Lenny folder) | Central coordinator/launcher | 🟡 WIP |
| **Secretary** | `games_n_apps` (Penni folder) | ADHD task management | 🟡 WIP |
| **BabyKey** | `games_n_apps` | Accessibility grid overlay | 🟢 Stable |

---

## Rule

**ONLY work on files in the canonical repo for each app.**

If you see an app's files in another location (e.g., Websites/Axxilak in games_n_apps), that's a **stale copy**. Delete it and work only on the canonical repo listed above.

---

## For AIs Booting Up

Before working on any app:
1. Read this file
2. Find the app in the table
3. Clone/use ONLY the canonical repo listed
4. Ignore copies elsewhere in the file system

This prevents the species disconnect failure mode where multiple AIs make conflicting changes to different copies of the same code.

---

**Questions?** Check CONTEXT_LOG.md for decisions around this structure.
