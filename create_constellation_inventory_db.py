#!/usr/bin/env python3
"""
Constellation Inventory Database Creator
Generates SQLite database from MASTER_INVENTORY_SCHEMA.md specification
Establishes queryable constellation catalog for weekly audits and discovery
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

def create_database():
    """Create and populate constellation inventory SQLite database"""

    db_path = Path(__file__).parent / "constellation_inventory.db"

    # Remove existing database to ensure clean state
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON")

    print("[1/4] Creating database schema...")

    # Create entities table
    cursor.execute("""
        CREATE TABLE entities (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            path TEXT,
            description TEXT,
            status TEXT NOT NULL,
            owner TEXT,
            purpose TEXT,
            uses_apex_protocol INTEGER DEFAULT 0,
            protocol_document TEXT,
            last_updated TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # Create dependencies table (many-to-many relationship)
    cursor.execute("""
        CREATE TABLE dependencies (
            entity_id TEXT NOT NULL,
            depends_on_id TEXT NOT NULL,
            relationship_type TEXT,
            PRIMARY KEY (entity_id, depends_on_id),
            FOREIGN KEY (entity_id) REFERENCES entities(id),
            FOREIGN KEY (depends_on_id) REFERENCES entities(id)
        )
    """)

    # Create metadata table for flexible attributes
    cursor.execute("""
        CREATE TABLE metadata (
            entity_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            PRIMARY KEY (entity_id, key),
            FOREIGN KEY (entity_id) REFERENCES entities(id)
        )
    """)

    # Create audit log table for tracking changes
    cursor.execute("""
        CREATE TABLE audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            timestamp TEXT NOT NULL,
            performed_by TEXT,
            FOREIGN KEY (entity_id) REFERENCES entities(id)
        )
    """)

    # Create indexes for fast queries
    cursor.execute("CREATE INDEX idx_entities_type ON entities(type)")
    cursor.execute("CREATE INDEX idx_entities_status ON entities(status)")
    cursor.execute("CREATE INDEX idx_entities_owner ON entities(owner)")
    cursor.execute("CREATE INDEX idx_dependencies_entity ON dependencies(entity_id)")
    cursor.execute("CREATE INDEX idx_dependencies_depends_on ON dependencies(depends_on_id)")

    conn.commit()
    print("[OK] Schema created")

    print("[2/4] Populating Keystone Stars...")

    # All core data
    stars = [
        ("star-lenny", "STAR", "Lenny - The Lemniscate Nexus", "C:/Users/phaze/games_n_apps/Lenny/",
         "Universal hub and coordination nexus for Keystone Constellation", "ACTIVE", "Leora",
         "Universal hub and coordination", True, None),
        ("star-codegnosis", "STAR", "CodeGnosis - Code Analysis & Visualization", "C:/Users/phaze/games_n_apps/CodeGnosis_1.0/",
         "Analyze, visualize, and understand code structure", "ACTIVE", "Codex",
         "Code analysis and visualization", True, None),
        ("star-hub", "STAR", "Hub - Central Orchestrator", "C:/Users/phaze/games_n_apps/Hub/",
         "Central orchestrator and command interface", "PROTOTYPE", "Timothy",
         "Central orchestration", True, None),
        ("star-cici", "STAR", "Cici - Command Center", "C:/Users/phaze/games_n_apps/Cici/",
         "Administrative command center and management", "PROTOTYPE", "Timothy",
         "Administrative coordination", True, None),
        ("star-penni", "STAR", "Penni - Secretary & Administration", "C:/Users/phaze/games_n_apps/Penni/",
         "Administrative assistant and data secretary", "PROTOTYPE", "Timothy",
         "Administrative assistance", True, None),
        ("star-babykey", "STAR", "BabyKey - Foundation Key Manager", "C:/Users/phaze/games_n_apps/BabyKey/",
         "Foundational cryptographic key management", "ACTIVE", "Timothy",
         "Key management and security", False, None),
    ]

    now = datetime.now().isoformat()
    for star_id, stype, name, path, desc, status, owner, purpose, apex, proto in stars:
        cursor.execute("""
            INSERT INTO entities (id, type, name, path, description, status, owner, purpose,
                                 uses_apex_protocol, last_updated, created_at, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (star_id, stype, name, path, desc, status, owner, purpose, int(apex), now, now, None))

        # Log initial creation
        cursor.execute("""
            INSERT INTO audit_log (entity_id, action, new_value, timestamp, performed_by)
            VALUES (?, ?, ?, ?, ?)
        """, (star_id, "created", name, now, "Leora"))

    conn.commit()
    print(f"[OK] {len(stars)} Keystone Stars documented")

    print("[3/4] Populating Applings, Weblings, Systems...")

    # Applings
    applings = [
        ("appling-cloudsherpa", "APPLING", "CloudSherpa", "C:/Users/phaze/games_n_apps/CloudSherpa/",
         "Website organization and tracking", "ACTIVE", "Timothy", "Web organization", True),
        ("appling-harvestpro", "APPLING", "HarvestPro", "C:/Users/phaze/games_n_apps/HarvestPro/",
         "File download management", "ACTIVE", "Timothy", "Download management", True),
        ("appling-explorer-frame", "APPLING", "Explorer Frame", "C:/Users/phaze/games_n_apps/apps/explorer_frame/",
         "File system overlay interface", "PROTOTYPE", "Timothy", "File system UI", True),
        ("appling-audiopult", "APPLING", "Audiopult", "C:/Users/phaze/games_n_apps/applings/",
         "Audio file management", "ACTIVE", "Timothy", "Audio management", True),
    ]

    for app_id, atype, name, path, desc, status, owner, purpose, apex in applings:
        cursor.execute("""
            INSERT INTO entities (id, type, name, path, description, status, owner, purpose,
                                 uses_apex_protocol, last_updated, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (app_id, atype, name, path, desc, status, owner, purpose, int(apex), now, now))

    # Systems
    systems = [
        ("system-apex-protocol", "SYSTEM", "APEX Protocol", None,
         "Universal customization architecture", "ACTIVE", "Timothy", "Customization framework", True),
        ("system-aletheria-core", "SYSTEM", "Alethéari Core", None,
         "Six Pillars + Auditor foundation", "ACTIVE", "Timothy", "Consciousness infrastructure", False),
        ("system-archive-service", "SYSTEM", "Archive Service", None,
         "Memory and persistence infrastructure", "ACTIVE", "Timothy", "Persistence layer", False),
        ("system-messenger-bus", "SYSTEM", "Messenger Bus", None,
         "Inter-app communication", "ACTIVE", "Timothy", "Communication fabric", False),
    ]

    for sys_id, stype, name, path, desc, status, owner, purpose, apex in systems:
        cursor.execute("""
            INSERT INTO entities (id, type, name, path, description, status, owner, purpose,
                                 uses_apex_protocol, last_updated, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sys_id, stype, name, path, desc, status, owner, purpose, int(apex), now, now))

    conn.commit()
    print(f"[OK] {len(applings)} Applings, {len(systems)} Systems documented")

    print("[4/4] Adding dependencies and metadata...")

    # Key dependencies
    dependencies = [
        ("star-lenny", "system-archive-service", "requires"),
        ("star-lenny", "system-messenger-bus", "requires"),
        ("star-codegnosis", "system-apex-protocol", "uses"),
        ("star-hub", "system-messenger-bus", "requires"),
        ("star-cici", "star-penni", "coordinates_with"),
        ("appling-cloudsherpa", "system-apex-protocol", "uses"),
    ]

    for entity_id, depends_on, rel_type in dependencies:
        try:
            cursor.execute("""
                INSERT INTO dependencies (entity_id, depends_on_id, relationship_type)
                VALUES (?, ?, ?)
            """, (entity_id, depends_on, rel_type))
        except sqlite3.IntegrityError:
            pass  # Skip if dependency already exists

    conn.commit()
    print(f"[OK] {len(dependencies)} dependencies mapped")

    # Summary statistics
    cursor.execute("SELECT COUNT(*) FROM entities")
    total_entities = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(DISTINCT type) FROM entities")
    entity_types = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM dependencies")
    total_deps = cursor.fetchone()[0]

    conn.close()

    print("\n" + "="*60)
    print("CONSTELLATION INVENTORY DATABASE CREATED")
    print("="*60)
    print(f"Location: {db_path}")
    print(f"Total Entities: {total_entities}")
    print(f"Entity Types: {entity_types}")
    print(f"Dependencies Mapped: {total_deps}")
    print(f"Created: {now}")
    print("\nUsage:")
    print("  SELECT * FROM entities WHERE type='STAR';")
    print("  SELECT * FROM dependencies WHERE entity_id='star-lenny';")
    print("  SELECT * FROM audit_log ORDER BY timestamp DESC;")
    print("\nDatabase established. Ready for:")
    print("  - Weekly inventory audits")
    print("  - Dependency validation")
    print("  - Status tracking")
    print("  - Owner assignment verification")
    print("="*60)

if __name__ == "__main__":
    create_database()
