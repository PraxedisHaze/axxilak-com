#!/usr/bin/env python3
"""
Transcript Indexer - Long-term Recall for the AGI Brain
=======================================================
Indexes Claude Code conversation transcripts (JSONL files) into a searchable
SQLite database with FTS5 full-text search.

This is the "Long-term Recall" component - making 119+ session transcripts
searchable by content, role, date, and session.

Usage:
  python transcript_index.py build          # Index all transcripts
  python transcript_index.py search "query" # Search across all sessions
  python transcript_index.py stats          # Show index statistics
  python transcript_index.py recent 10      # Show 10 most recent messages
"""

import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# Paths
TRANSCRIPT_DIR = Path(r"C:\Users\phaze\.claude\projects\C--Users-phaze-games-n-apps")
DB_PATH = Path(__file__).parent / "transcript_index.db"


def create_db():
    """Create the transcript index database with FTS5."""
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    # Main messages table
    c.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            session_file TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT,
            message_index INTEGER
        )
    """)

    # FTS5 virtual table for full-text search
    c.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
            content, role, session_id,
            content='messages',
            content_rowid='id',
            tokenize='trigram'
        )
    """)

    # Triggers to keep FTS in sync
    c.execute("""
        CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content, role, session_id)
            VALUES (new.id, new.content, new.role, new.session_id);
        END
    """)

    # Session metadata table
    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            file_path TEXT,
            file_size INTEGER,
            message_count INTEGER,
            first_timestamp TEXT,
            last_timestamp TEXT,
            indexed_at TEXT
        )
    """)

    conn.commit()
    return conn


def extract_text(content):
    """Extract text from message content (handles both string and block formats)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                text = block.get("text", "")
                if text:
                    parts.append(text)
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return str(content) if content else ""


def index_file(conn, filepath):
    """Index a single JSONL transcript file."""
    c = conn.cursor()
    session_id = filepath.stem
    file_size = filepath.stat().st_size

    # Skip if already indexed and file hasn't changed
    c.execute("SELECT file_size FROM sessions WHERE session_id = ?", (session_id,))
    row = c.fetchone()
    if row and row[0] == file_size:
        return 0  # Already indexed, same size

    # Clear old data for this session (re-index)
    if row:
        c.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))

    count = 0
    first_ts = None
    last_ts = None

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                # Handle BOM on first line
                if i == 0 and line.startswith("\ufeff"):
                    line = line[1:]
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue

                msg_type = obj.get("type", "")
                if msg_type not in ("user", "assistant"):
                    continue

                message = obj.get("message", {})
                if not isinstance(message, dict):
                    continue

                role = message.get("role", msg_type)
                content = extract_text(message.get("content", ""))
                timestamp = obj.get("timestamp", "")

                # Skip empty or very short messages
                if len(content.strip()) < 3:
                    continue

                # Skip tool results and system injections embedded in content
                if content.startswith('{"type":"tool_') or content.startswith('<system-reminder>'):
                    continue

                if timestamp and not first_ts:
                    first_ts = timestamp
                if timestamp:
                    last_ts = timestamp

                c.execute("""
                    INSERT INTO messages (session_id, session_file, role, content, timestamp, message_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (session_id, filepath.name, role, content, timestamp, i))
                count += 1

    except Exception as e:
        print(f"  Error reading {filepath.name}: {e}")
        return 0

    # Update session metadata
    c.execute("""
        INSERT OR REPLACE INTO sessions (session_id, file_path, file_size, message_count, first_timestamp, last_timestamp, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (session_id, str(filepath), file_size, count, first_ts, last_ts, datetime.now().isoformat()))

    return count


def build_index():
    """Build or update the full transcript index."""
    conn = create_db()
    files = sorted(TRANSCRIPT_DIR.glob("*.jsonl"), key=lambda f: f.stat().st_mtime)

    print(f"Found {len(files)} transcript files in {TRANSCRIPT_DIR}")
    total = 0
    indexed = 0

    for filepath in files:
        count = index_file(conn, filepath)
        if count > 0:
            print(f"  Indexed {filepath.name}: {count} messages")
            indexed += 1
        total += count

    conn.commit()
    conn.close()
    print(f"\nDone. {indexed} files indexed, {total} new messages added.")
    print(f"Database: {DB_PATH}")


def search(query, limit=20, role_filter=None):
    """Search across all indexed transcripts."""
    if not DB_PATH.exists():
        print("No index found. Run: python transcript_index.py build")
        return

    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    if role_filter:
        c.execute("""
            SELECT m.session_id, m.role, m.content, m.timestamp
            FROM messages_fts f
            JOIN messages m ON f.rowid = m.id
            WHERE messages_fts MATCH ? AND m.role = ?
            ORDER BY m.timestamp DESC
            LIMIT ?
        """, (query, role_filter, limit))
    else:
        c.execute("""
            SELECT m.session_id, m.role, m.content, m.timestamp
            FROM messages_fts f
            JOIN messages m ON f.rowid = m.id
            WHERE messages_fts MATCH ?
            ORDER BY m.timestamp DESC
            LIMIT ?
        """, (query, limit))

    results = c.fetchall()
    conn.close()

    if not results:
        print(f"No results for: {query}")
        return

    print(f"Found {len(results)} results for: {query}\n")
    for sid, role, content, ts in results:
        ts_short = ts[:19] if ts else "unknown"
        content_preview = content[:300].replace("\n", " ")
        print(f"[{ts_short}] {role} (session: {sid[:8]}...)")
        print(f"  {content_preview}")
        print()


def stats():
    """Show index statistics."""
    if not DB_PATH.exists():
        print("No index found. Run: python transcript_index.py build")
        return

    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM sessions")
    session_count = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM messages")
    message_count = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM messages WHERE role = 'user'")
    user_count = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM messages WHERE role = 'assistant'")
    assistant_count = c.fetchone()[0]

    c.execute("SELECT MIN(first_timestamp), MAX(last_timestamp) FROM sessions")
    first, last = c.fetchone()

    db_size = DB_PATH.stat().st_size / (1024 * 1024)

    conn.close()

    print("TRANSCRIPT INDEX STATISTICS")
    print("=" * 40)
    print(f"Sessions indexed: {session_count}")
    print(f"Total messages:   {message_count}")
    print(f"  User messages:  {user_count}")
    print(f"  Assistant msgs: {assistant_count}")
    print(f"Date range:       {(first or 'N/A')[:10]} to {(last or 'N/A')[:10]}")
    print(f"Database size:    {db_size:.1f} MB")
    print(f"Database path:    {DB_PATH}")


def recent(count=10):
    """Show most recent messages across all sessions."""
    if not DB_PATH.exists():
        print("No index found. Run: python transcript_index.py build")
        return

    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    c.execute("""
        SELECT session_id, role, content, timestamp
        FROM messages
        ORDER BY timestamp DESC
        LIMIT ?
    """, (count,))

    results = c.fetchall()
    conn.close()

    for sid, role, content, ts in results:
        ts_short = ts[:19] if ts else "unknown"
        content_preview = content[:200].replace("\n", " ")
        print(f"[{ts_short}] {role}: {content_preview}")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1].lower()

    if cmd == "build":
        build_index()
    elif cmd == "search":
        query = sys.argv[2] if len(sys.argv) > 2 else ""
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
        if not query:
            print("Usage: python transcript_index.py search 'query' [limit]")
        else:
            search(query, limit)
    elif cmd == "stats":
        stats()
    elif cmd == "recent":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        recent(count)
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
