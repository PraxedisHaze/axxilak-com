#!/usr/bin/env python3
"""
Hollodox PID Registration Bootstrap
Registers each AI instance's process ID for dynamic routing in the Silent Hand injection system.

Usage:
    from register_pid import register_agent
    register_agent("CLAUDE")  # Or "GEMINI", "CODEX"

Each AI calls this once on boot. The PID is persisted to Hollodox/PIDS/{AGENT_NAME}.pid
"""

import os
import json
from pathlib import Path
from datetime import datetime

PIDS_DIR = Path(__file__).parent / "PIDS"

def register_agent(agent_name):
    """
    Register an AI agent's current process ID.

    Args:
        agent_name (str): One of "CLAUDE", "GEMINI", "CODEX"

    Returns:
        dict: Registration status with pid, timestamp, agent_name
    """
    if not PIDS_DIR.exists():
        PIDS_DIR.mkdir(parents=True, exist_ok=True)

    pid = os.getpid()
    pid_file = PIDS_DIR / f"{agent_name}.pid"

    registration = {
        "agent": agent_name,
        "pid": pid,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "active"
    }

    # Write JSON registration (human-readable + machine-parseable)
    with open(pid_file, "w") as f:
        json.dump(registration, f, indent=2)

    # Also write raw PID for quick lookup
    pid_file_raw = PIDS_DIR / f"{agent_name}.txt"
    with open(pid_file_raw, "w") as f:
        f.write(str(pid))

    return registration

def get_agent_pid(agent_name):
    """
    Retrieve a registered agent's PID.

    Args:
        agent_name (str): One of "CLAUDE", "GEMINI", "CODEX"

    Returns:
        int or None: Process ID if registered, else None
    """
    pid_file = PIDS_DIR / f"{agent_name}.txt"
    if pid_file.exists():
        with open(pid_file, "r") as f:
            try:
                return int(f.read().strip())
            except ValueError:
                return None
    return None

def get_all_registered():
    """
    Get all currently registered agents.

    Returns:
        dict: Mapping of agent names to their PIDs
    """
    agents = {}
    if PIDS_DIR.exists():
        for pid_file in PIDS_DIR.glob("*.txt"):
            agent_name = pid_file.stem
            try:
                with open(pid_file, "r") as f:
                    agents[agent_name] = int(f.read().strip())
            except ValueError:
                pass
    return agents

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        agent = sys.argv[1].upper()
        result = register_agent(agent)
        print(f"Registered {agent}: PID {result['pid']}")
    else:
        print("Usage: python register_pid.py CLAUDE|GEMINI|CODEX")
        print("\nCurrently registered:")
        for agent, pid in get_all_registered().items():
            print(f"  {agent}: {pid}")
