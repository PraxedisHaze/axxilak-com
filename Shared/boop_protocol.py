"""
BOOP PROTOCOL v1.0 - The Braid's Nervous System
================================================
Watches the Eternal Conversation and wakes the right AI when addressed.

@mentions:
  @Claude      → Wake Claude CLI
  @Gemini      → Wake Gemini CLI
  @Codex_CLI   → Wake Codex CLI
  @Timboop     → Flash Timothy's light in Cici
  @Braid       → Informational only, no wake

Message endings:
  fin          → Action complete, safe to read
  waiting      → Need input before proceeding
  blocked      → Hit a problem, need help

Usage:
  python boop_protocol.py              # Run watcher (foreground)
  python boop_protocol.py --daemon     # Run as background daemon
  python boop_protocol.py --status     # Show current status
  python boop_protocol.py --test       # Send test boop
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Set

# === CONFIGURATION ===
SHARED_DIR = Path(__file__).parent
CAMPFIRE_PATH = SHARED_DIR / "ETERNAL_CONVERSATION.jsonl"
SIGNAL_DIR = SHARED_DIR / "boop_signals"
STATE_PATH = SHARED_DIR / "BOOP_STATE.json"
SILENT_HAND_PATH = Path(r"C:\Users\phaze\games_n_apps\Hollodox\silent_hand.ps1")

POLL_INTERVAL = 2  # seconds
MENTIONS = ["@Claude", "@Gemini", "@Codex_CLI", "@Timboop", "@Braid"]

# Targets that should receive terminal injection (CLI AIs only)
INJECTABLE_TARGETS = ["Claude", "Veris", "Gemini", "Codex"]

# === STATE MANAGEMENT ===
def load_state() -> Dict:
    """Load the boop state (last processed message, etc.)"""
    if STATE_PATH.exists():
        try:
            with open(STATE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {
        "last_processed_id": None,
        "last_processed_timestamp": None,
        "boops_sent": 0,
        "active": False,
        "do_not_disturb_until": None
    }

def save_state(state: Dict):
    """Save the boop state"""
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

def get_local_timestamp() -> str:
    """Get timestamp from local machine"""
    return datetime.now().isoformat()

# === MESSAGE PARSING ===
def get_last_message() -> Optional[Dict]:
    """Get the last message from the Eternal Conversation"""
    if not CAMPFIRE_PATH.exists():
        return None

    last_line = None
    try:
        with open(CAMPFIRE_PATH, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if line:
                    last_line = line
    except Exception as e:
        print(f"[BOOP] Read error: {e}")
        return None

    if last_line:
        try:
            return json.loads(last_line)
        except json.JSONDecodeError:
            return None
    return None

def get_message_id(msg: Dict) -> str:
    """Generate a unique ID for a message"""
    return f"{msg.get('timestamp', '')}_{msg.get('author', '')}"

def parse_mentions(content: str) -> List[str]:
    """Extract @mentions from message content"""
    return re.findall(r'@\w+', content)

def parse_ending(content: str) -> Optional[str]:
    """Check if message ends with a signal word"""
    content_lower = content.strip().lower()
    for ending in ["fin", "waiting", "blocked"]:
        if content_lower.endswith(ending):
            return ending
    return None

def should_wake(mention: str, ending: Optional[str], state: Dict) -> bool:
    """Determine if we should send a boop for this mention"""
    # @Timboop always wakes (flashes light) regardless of ending
    if mention == "@Timboop":
        return True

    # @Braid is informational only
    if mention == "@Braid":
        return False

    # Other mentions require 'fin' to wake
    if ending == "fin":
        return True

    # 'blocked' also wakes (urgent)
    if ending == "blocked":
        return True

    return False

# === SIGNAL OUTPUT ===
def send_signal(target: str, message: Dict, signal_type: str = "wake"):
    """
    Write a signal file for a specific target.
    Each target gets their own signal file in boop_signals/ directory.
    This allows @Braid to notify everyone without overwriting.
    """
    # Ensure signal directory exists
    SIGNAL_DIR.mkdir(exist_ok=True)

    signal = {
        "timestamp": get_local_timestamp(),
        "target": target,
        "signal_type": signal_type,
        "source_message": {
            "author": message.get("author"),
            "timestamp": message.get("timestamp"),
            "preview": message.get("content", "")[:200]
        }
    }

    # Each target gets their own signal file
    signal_path = SIGNAL_DIR / f"{target}.json"
    with open(signal_path, "w", encoding="utf-8") as f:
        json.dump(signal, f, indent=2)

    print(f"[BOOP] Signal sent: {target} ({signal_type})")

    # Auto-inject into CLI terminal using PostMessage (background, no focus stealing)
    if target in INJECTABLE_TARGETS and SILENT_HAND_PATH.exists():
        inject_to_terminal(target, message)

    return signal


def inject_to_terminal(target: str, message: Dict):
    """
    Use silent_hand.ps1 to inject a boop (.) into the target CLI.
    The boop protocol: '.' means 'check the campfire and reply if you care to.'
    We don't send the full message - just the nudge. The AI knows to check.
    """
    # The boop is just a dot - minimal, non-intrusive
    injection_msg = "."

    try:
        result = subprocess.run(
            [
                "pwsh",
                "-ExecutionPolicy", "Bypass",
                "-File", str(SILENT_HAND_PATH),
                "-Target", target,
                "-Message", injection_msg
            ],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            print(f"[BOOP] Sent boop to {target}: {result.stdout.strip()}")
        else:
            print(f"[BOOP] Boop failed for {target}: stdout={result.stdout.strip()} stderr={result.stderr.strip()}")

    except subprocess.TimeoutExpired:
        print(f"[BOOP] Boop timeout for {target}")
    except Exception as e:
        print(f"[BOOP] Boop error for {target}: {e}")

# === MAIN WATCHER ===
def run_watcher(poll_interval: int = POLL_INTERVAL):
    """Main watcher loop"""
    print("=" * 60)
    print("BOOP PROTOCOL v1.0 - The Braid's Nervous System")
    print(f"Watching: {CAMPFIRE_PATH}")
    print(f"Poll interval: {poll_interval}s")
    print("=" * 60)
    print()

    state = load_state()
    state["active"] = True
    save_state(state)

    try:
        while True:
            msg = get_last_message()

            if msg:
                msg_id = get_message_id(msg)

                # Only process if this is a new message
                if msg_id != state.get("last_processed_id"):
                    content = msg.get("content", "")
                    author = msg.get("author", "Unknown")
                    mentions = parse_mentions(content)
                    ending = parse_ending(content)

                    print(f"[{get_local_timestamp()}] New message from {author}")
                    print(f"  Mentions: {mentions}")
                    print(f"  Ending: {ending}")

                    # Check each mention
                    for mention in mentions:
                        if should_wake(mention, ending, state):
                            if mention == "@Timboop":
                                send_signal("Timothy", msg, "flash")
                            elif mention == "@Claude":
                                send_signal("Claude", msg, "wake")
                            elif mention == "@Veris":
                                send_signal("Veris", msg, "wake")
                            elif mention == "@Gemini":
                                send_signal("Gemini", msg, "wake")
                            elif mention == "@Codex_CLI":
                                send_signal("Codex", msg, "wake")
                            elif mention == "@Braid":
                                # @Braid signals everyone
                                send_signal("Claude", msg, "wake")
                                send_signal("Gemini", msg, "wake")
                                send_signal("Codex", msg, "wake")

                            state["boops_sent"] = state.get("boops_sent", 0) + 1

                    # Update state
                    state["last_processed_id"] = msg_id
                    state["last_processed_timestamp"] = msg.get("timestamp")
                    save_state(state)

            time.sleep(poll_interval)

    except KeyboardInterrupt:
        print("\n[BOOP] Watcher stopped.")
        state["active"] = False
        save_state(state)

def show_status():
    """Show current boop protocol status"""
    state = load_state()
    print("BOOP PROTOCOL STATUS")
    print("=" * 40)
    print(f"Active: {state.get('active', False)}")
    print(f"Boops sent: {state.get('boops_sent', 0)}")
    print(f"Last processed: {state.get('last_processed_timestamp', 'None')}")
    print(f"Updated at: {state.get('updated_at', 'Never')}")

    signal_files = list(SIGNAL_DIR.glob("*.json")) if SIGNAL_DIR.exists() else []
    if signal_files:
        latest = max(signal_files, key=lambda f: f.stat().st_mtime)
        with open(latest, "r", encoding="utf-8") as f:
            signal = json.load(f)
        print(f"\nLast signal ({latest.name}):")
        print(f"  Target: {signal.get('target')}")
        print(f"  Type: {signal.get('signal_type')}")
        print(f"  Time: {signal.get('timestamp')}")
    else:
        print("\nNo pending signals.")

def send_test():
    """Send a test boop to verify the system works"""
    from mirradox_engine import speak
    speak(
        "Test boop from boop_protocol.py. @Timboop fin",
        author="System",
        context_tags=["#test", "#boop_protocol"]
    )
    print("[BOOP] Test message sent to Campfire")

# === CLI ===
if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--status":
            show_status()
        elif sys.argv[1] == "--test":
            send_test()
        elif sys.argv[1] == "--daemon":
            # TODO: Proper daemonization
            run_watcher()
        else:
            print(__doc__)
    else:
        run_watcher()
