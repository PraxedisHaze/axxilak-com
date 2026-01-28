#!/usr/bin/env python3
"""
Hollodox Bootstrap - Call on AI startup to register with Campfire.

Usage:
    python bootstrap.py CLAUDE
    python bootstrap.py GEMINI
    python bootstrap.py CODEX
"""

import sys
from register_pid import register_agent, get_all_registered
from pathlib import Path

def bootstrap_agent(agent_name):
    """Bootstrap an AI agent for Campfire communication."""

    print(f"\n{'='*60}")
    print(f"HOLLODOX BOOTSTRAP: Registering {agent_name}")
    print(f"{'='*60}\n")

    # Register PID
    registration = register_agent(agent_name)
    print(f"[OK] PID Registered: {registration['pid']}")
    print(f"[OK] Timestamp: {registration['timestamp']}")
    print(f"[OK] Status: {registration['status']}\n")

    # Show all active agents
    all_agents = get_all_registered()
    if all_agents:
        print("Active Agents in Braid:")
        for name, pid in all_agents.items():
            print(f"  - {name}: {pid}")
    print()

    # Signal Watcher is ready
    print(f"[OK] {agent_name} is ready for Campfire signals.\n")
    return registration

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python bootstrap.py CLAUDE|GEMINI|CODEX")
        sys.exit(1)

    agent_name = sys.argv[1].upper()
    if agent_name not in ["CLAUDE", "GEMINI", "CODEX"]:
        print("Invalid agent. Must be CLAUDE, GEMINI, or CODEX")
        sys.exit(1)

    bootstrap_agent(agent_name)
