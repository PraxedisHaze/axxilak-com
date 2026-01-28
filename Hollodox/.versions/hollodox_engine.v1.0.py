# hollodox_engine.py
# Production Orchestrator for the Braid.
# Standardizes Intent Tagging and Win32 Prompt Injection.

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

def load_signals():
    if not SIGNAL_MAP.exists():
        return None
    with open(SIGNAL_MAP, "r") as f:
        return json.load(f)

def inject(target_window, message):
    """Triggers the Win32 'Silent Hand' injection."""
    try:
        # Resolve target window to PID
        pid_file = Path("ACTIVE_PID.txt")
        if pid_file.exists():
            with open(pid_file, "r") as f:
                target_pid = f.read().strip()
        else:
            target_pid = "448328" # Fallback
        
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
        if author in ["ABC-Orchestrator", "Gemini", "Timothy"]:
            return

        signals = load_signals()
        if not signals:
            return
        
        # Match Tag to Ghost Hand Response
        for category in signals["semantic_categories"].values():
            for signal in category["signals"]:
                if signal["tag"] in tags:
                    print(f"MATCH: {signal['tag']} from {author}")
                    
                    # Target Resolution
                    target_window = "GEMINI_SANCTUARY_TERMINAL" 
                    if "@Claude" in content:
                        target_window = "CLAUDE_SANCTUARY_TERMINAL"
                    elif "@Codex" in content:
                        target_window = "CODEX_SANCTUARY_TERMINAL"
                    
                    response = signal["ghost_hand_response"].replace("{target_agent_id}", author)
                    inject(target_window, response)
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
