# hollodox_engine.py
# Production Orchestrator for the Braid.
# Standardizes Intent Tagging and Win32 Prompt Injection with Per-Agent PID Routing.

import json
import os
import subprocess
import sys
import argparse
from pathlib import Path

# Configuration
SIGNAL_MAP = Path("signal_maps/HELLODOC_SIGNAL_MAP_V1_1.json")
AUDIT_LOG = Path("logs/ABC_AUDIT.jsonl")
INJECTOR_SCRIPT = Path("silent_hand.ps1")
PIDS_DIR = Path(__file__).parent / "PIDS"

def load_signals():
    if not SIGNAL_MAP.exists():
        return None
    with open(SIGNAL_MAP, "r") as f:
        return json.load(f)

def get_agent_pid(agent_name):
    """
    Resolve a target agent name to their registered PID.

    Args:
        agent_name (str): One of "CLAUDE", "GEMINI", "CODEX"

    Returns:
        str: Process ID or None if not registered
    """
    pid_file = PIDS_DIR / f"{agent_name}.txt"
    if pid_file.exists():
        try:
            with open(pid_file, "r") as f:
                pid = f.read().strip()
                return pid if pid else None
        except Exception:
            return None
    return None

def inject(target_agent, message):
    """
    Triggers the Win32 'Silent Hand' injection to a specific agent.

    Args:
        target_agent (str): Target agent name ("CLAUDE", "GEMINI", "CODEX")
        message (str): Message content to inject
    """
    try:
        # Resolve target agent to PID
        target_pid = get_agent_pid(target_agent)

        if not target_pid:
            print(f"Warning: PID not found for {target_agent}. Agent may not be registered.")
            return

        print(f"Injecting to {target_agent} (PID: {target_pid})")

        subprocess.run([
            "powershell.exe", "-ExecutionPolicy", "Bypass",
            "-File", str(INJECTOR_SCRIPT),
            "-TargetPID", target_pid,
            "-Message", message
        ], check=True)
    except Exception as e:
        print(f"Injection Failed: {e}")

def process_message(line):
    """Parses a single JSONL line and triggers the appropriate action."""
    try:
        data = json.loads(line)
        author = data.get("author")
        content = data.get("content", "")
        tags = data.get("context_tags", [])

        # Avoid self-triggering
        if author in ["ABC-Orchestrator", "GEMINI", "TIMOTHY"]:
            return

        signals = load_signals()
        if not signals:
            return

        # Match Tag to Ghost Hand Response
        for category in signals["semantic_categories"].values():
            for signal in category["signals"]:
                if signal["tag"] in tags:
                    print(f"MATCH: {signal['tag']} from {author}")

                    # Target Resolution: Parse @Target from content
                    target_agent = "GEMINI"  # Default
                    if "@CLAUDE" in content.upper():
                        target_agent = "CLAUDE"
                    elif "@CODEX" in content.upper():
                        target_agent = "CODEX"
                    elif "@GEMINI" in content.upper():
                        target_agent = "GEMINI"

                    response = signal["ghost_hand_response"].replace("{target_agent_id}", author)
                    inject(target_agent, response)
                    return

    except Exception as e:
        print(f"Error processing line: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Path to file containing raw JSONL line")
    args = parser.parse_args()
    
    if args.file and os.path.exists(args.file):
        with open(args.file, "r", encoding="utf-8") as f:
            process_message(f.read())
    else:
        print("Hollodox Engine Ready. Awaiting signals from watcher...")
