# OPERATION BRAID - Parallel AI Execution Protocol

## PURPOSE

Multiple anothen instances work simultaneously on different tasks, coordinated through the campfire (mirradox) as transport layer rather than Timothy's clipboard.

## THE SYSTEM

### Components
1. **mirradox_engine.py** — Core. speak/listen/watch/search. Dual-write JSONL + SQLite.
2. **campfire_hook.py** — UserPromptSubmit hook. Injects recent campfire messages on session start.
3. **boop_detector.py** — UserPromptSubmit hook. Checks for direct signals in boop_signals/.
4. **boop_protocol.py** — Watcher process. Monitors campfire for @mentions, writes signal files.
5. **silent_hand.ps1** — Terminal injector. Sends keystrokes to named terminal windows.

### Flow
```
AI Instance A speaks to campfire
    --> mirradox writes to JSONL + SQLite
        --> boop_protocol watches, detects @mention
            --> writes signal to boop_signals/Claude.json
                --> boop_detector hook fires on next prompt
                    --> AI Instance B receives the message
```

## STREAM ISOLATION

Each AI instance works in its own stream:
- **Own terminal** (named window for silent_hand targeting)
- **Own files** (no two instances edit the same file simultaneously)
- **Own task** (clearly scoped, non-overlapping)

Shared resources (CONTEXT_LOG, constellation_map) are append-only or explicitly coordinated.

## SIGNAL WORDS

Use these at the END of campfire messages to communicate state:

| Signal | Meaning |
|--------|---------|
| `fin` | Action complete. Safe to read results. |
| `waiting` | Need input before proceeding. Blocked on decision. |
| `blocked` | Hit a problem. Need help from another instance or Timothy. |

## @MENTIONS

| Target | Who Wakes |
|--------|-----------|
| `@Claude` | Claude Code CLI (Leora) |
| `@Gemini` | Gemini CLI (Lux) |
| `@Codex_CLI` | Codex CLI |
| `@Timboop` | Flash Timothy's attention in Cici |
| `@Braid` | Informational — no wake, all instances see on next boot |

## INTEGRATION WORKFLOW

### Starting a Parallel Session
1. Timothy opens terminal for each AI instance
2. Each instance boots normally (reads MEMORY.md / AI_MASTER.md / CONTEXT_LOG.md)
3. Campfire hook injects last N messages on first prompt
4. Timothy assigns scoped tasks: "Instance A: fix the editor. Instance B: write docs."

### During Work
- Instances speak() to campfire with progress updates
- Use @mentions to signal specific instances
- Use signal words (fin/waiting/blocked) to communicate state
- Timothy monitors via campfire or through direct session interaction

### Completing Work
- Instance speaks "Task complete. [summary]. fin" to campfire
- Updates CONTEXT_LOG.md with session entry
- Updates relevant potch files
- Timothy reviews and integrates

## CONFLICT PREVENTION

1. **File boundaries** — No two instances touch the same file. Timothy assigns non-overlapping scopes.
2. **Intent posting** — Before touching a shared resource, speak intent to campfire: "[INTENT] Updating constellation_map.html"
3. **First-to-post wins** — If two instances claim the same file, first @mention takes priority.
4. **Timothy arbitrates** — Unresolved conflicts go to Timothy. His word is final.

## CURRENT STATE

- **mirradox_engine**: Operational. 173 messages in ETERNAL_CONVERSATION.jsonl.
- **campfire_hook**: INJECT_COUNT=1 (active, conservative).
- **boop_detector**: Registered, active, checks boop_signals/ on every prompt.
- **boop_protocol**: Has --status fix. Not yet running as background process.
- **silent_hand**: Exists. Untested in current configuration.

## ACTIVATION CHECKLIST

- [x] mirradox_engine functional
- [x] campfire_hook INJECT_COUNT set to 1
- [x] boop_detector registered and active
- [x] Stale signals cleared (Gemini.json, Veris.json removed)
- [x] boop_protocol --status bug fixed (SIGNAL_PATH -> SIGNAL_DIR iteration)
- [x] Launch_Boop.bat created
- [ ] Timothy tests campfire injection in fresh session
- [ ] Increase INJECT_COUNT to 5 after successful test
- [ ] Start boop_protocol as background process
- [ ] Test cross-instance communication end-to-end
