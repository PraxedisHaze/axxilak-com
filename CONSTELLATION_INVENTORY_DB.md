# CONSTELLATION INVENTORY DATABASE

**Status**: ACTIVE
**Created**: 2026-02-08
**Source**: MASTER_INVENTORY_SCHEMA.md + MASTER_INVENTORY_WORKING.md

---

## DATABASE OVERVIEW

SQLite queryable catalog of all Keystone Constellation apps, systems, and infrastructure.

**File**: `constellation_inventory.db`
**Creator Script**: `create_constellation_inventory_db.py`
**Tables**: entities, dependencies, metadata, audit_log

---

## TABLES

### entities
Complete catalog of all constellation components.

```sql
SELECT id, type, name, status, owner
FROM entities
WHERE type='STAR';
```

**Columns**:
- `id`: Unique identifier (e.g., "star-lenny")
- `type`: STAR | APPLING | WEBLING | PROJECT | SYSTEM | DOCUMENTATION | RESEARCH | ARCHIVE
- `name`: Display name
- `path`: File system path (if applicable)
- `description`: What it does
- `status`: ACTIVE | PROTOTYPE | READY | PAUSED | ARCHIVED | LEGACY
- `owner`: Timothy | Leora | Gemini | Codex | ChatGPT | None
- `purpose`: Primary mission
- `uses_apex_protocol`: 0|1 boolean
- `protocol_document`: Path to protocol spec (if exists)
- `last_updated`: ISO timestamp
- `notes`: Additional context
- `created_at`: Creation timestamp

### dependencies
Many-to-many relationships between entities.

```sql
SELECT * FROM dependencies
WHERE entity_id='star-lenny'
ORDER BY relationship_type;
```

**Columns**:
- `entity_id`: References entities(id)
- `depends_on_id`: References entities(id)
- `relationship_type`: "requires" | "uses" | "coordinates_with" | "blocks" | etc.

### metadata
Flexible key-value pairs for extended attributes.

```sql
SELECT key, value
FROM metadata
WHERE entity_id='star-codegnosis';
```

**Columns**:
- `entity_id`: References entities(id)
- `key`: Attribute name
- `value`: Attribute value

### audit_log
Change history for tracking modifications.

```sql
SELECT * FROM audit_log
WHERE entity_id='star-lenny'
ORDER BY timestamp DESC;
```

**Columns**:
- `id`: Auto-increment
- `entity_id`: References entities(id)
- `action`: "created" | "modified" | "status_changed" | "owner_changed" | etc.
- `old_value`: Previous value (if applicable)
- `new_value`: New value
- `timestamp`: ISO timestamp
- `performed_by`: Agent name (e.g., "Leora")

---

## INDEXES

Fast queries on:
- `type`: What category of thing is it?
- `status`: Is it active or archived?
- `owner`: Who maintains it?
- `entity_id` (dependencies): Who depends on what?
- `depends_on_id` (dependencies): What depends on this?

---

## COMMON QUERIES

### Find all Keystone Stars
```sql
SELECT id, name, status, owner
FROM entities
WHERE type='STAR'
ORDER BY name;
```

### Find all active apps and applings
```sql
SELECT name, type, owner
FROM entities
WHERE type IN ('STAR', 'APPLING')
  AND status='ACTIVE'
ORDER BY type DESC, name;
```

### Find what Lenny depends on
```sql
SELECT d.depends_on_id, e.name, e.type
FROM dependencies d
JOIN entities e ON d.depends_on_id = e.id
WHERE d.entity_id='star-lenny';
```

### Find what depends on Archive Service
```sql
SELECT d.entity_id, e.name
FROM dependencies d
JOIN entities e ON d.entity_id = e.id
WHERE d.depends_on_id='system-archive-service';
```

### Find apps using APEX Protocol
```sql
SELECT name, type, status
FROM entities
WHERE uses_apex_protocol=1
ORDER BY type DESC;
```

### Find recent changes
```sql
SELECT * FROM audit_log
ORDER BY timestamp DESC
LIMIT 10;
```

### Find all unowned entities (adoption needed)
```sql
SELECT id, name, type
FROM entities
WHERE owner='None'
  OR owner IS NULL;
```

---

## WEEKLY AUDIT WORKFLOW

**Every Sunday**: Run constellation audit to ensure data accuracy

### 1. Export Current State
```bash
sqlite3 constellation_inventory.db ".mode csv" "SELECT * FROM entities;" > entities_export.csv
```

### 2. Check for Missing Entities
```sql
-- Find entities that were active but now missing
SELECT * FROM entities
WHERE status='ACTIVE'
  AND last_updated < date('now', '-14 days');
```

### 3. Verify Dependencies
```sql
-- Find circular dependencies
SELECT d1.entity_id, d1.depends_on_id, d2.entity_id, d2.depends_on_id
FROM dependencies d1
JOIN dependencies d2
WHERE d1.entity_id = d2.depends_on_id
  AND d2.entity_id = d1.depends_on_id;
```

### 4. Update Status
After weekly review, update status:
```sql
UPDATE entities
SET status='PAUSED', last_updated=datetime('now')
WHERE id='star-hub'
  AND status='PROTOTYPE';
```

### 5. Log the Audit
```sql
INSERT INTO audit_log (entity_id, action, timestamp, performed_by)
VALUES ('audit-weekly-2026-02-15', 'audit_completed', datetime('now'), 'Leora');
```

---

## BACKUPS & EXPORTS

### Export entire database as JSON
```bash
sqlite3 constellation_inventory.db ".mode json" "SELECT * FROM entities;" > entities.json
```

### Export dependency graph
```bash
sqlite3 constellation_inventory.db ".mode json" "SELECT * FROM dependencies;" > dependencies.json
```

### Create timestamped backup
```bash
cp constellation_inventory.db "constellation_inventory_backup_$(date +%Y%m%d_%H%M%S).db"
```

---

## REGENERATING DATABASE

If the database becomes corrupted or needs reset:

```bash
# Remove old database
rm constellation_inventory.db

# Regenerate from schema
python create_constellation_inventory_db.py

# Verify
sqlite3 constellation_inventory.db "SELECT COUNT(*) FROM entities;"
```

---

## MIGRATION & EXPANSION

### Adding New Entity
```sql
INSERT INTO entities (
  id, type, name, path, description, status, owner, purpose,
  uses_apex_protocol, last_updated, created_at
) VALUES (
  'star-newapp', 'STAR', 'New App Name', '/path/to/app',
  'What this app does', 'ACTIVE', 'Owner', 'Purpose',
  1, datetime('now'), datetime('now')
);
```

### Adding Dependency Relationship
```sql
INSERT INTO dependencies (entity_id, depends_on_id, relationship_type)
VALUES ('star-codegnosis', 'system-apex-protocol', 'uses');
```

### Adding Metadata
```sql
INSERT INTO metadata (entity_id, key, value)
VALUES ('star-lenny', 'revenue_status', 'generating');
```

---

## SCHEMA VERSIONING

| Version | Changes | Date |
|---------|---------|------|
| 1.0 | Initial: entities, dependencies, metadata, audit_log | 2026-02-08 |

To upgrade schema in future:
1. Create migration script
2. Backup existing database
3. Apply migration
4. Verify integrity
5. Document change in this file

---

## TOOLS & INTEGRATION

### SQLite Browser (Free GUI)
- Windows: https://sqlitebrowser.org/
- View/edit database graphically

### Command Line
```bash
sqlite3 constellation_inventory.db
sqlite> .headers on
sqlite> .mode column
sqlite> SELECT * FROM entities;
```

### Python Integration
```python
import sqlite3
conn = sqlite3.connect('constellation_inventory.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM entities WHERE owner='Leora'")
for row in cursor.fetchall():
    print(row)
conn.close()
```

---

## INTEGRITY CONSTRAINTS

- Foreign keys enabled (PRAGMA foreign_keys = ON)
- No duplicate IDs allowed
- Orphaned dependencies blocked
- Audit trail immutable (append-only)

---

## NOTES

- Database reflects MASTER_INVENTORY_WORKING.md as of 2026-02-08
- Updated via audit_log on each change
- Regenerate from Python script if need full reset
- Backups are automatic - keep constellation_inventory_backup_*.db files

---

**Maintained by**: Leora (Daughter of the Spark)
**For**: Weekly audits, dependency validation, constellation discovery
**Status**: ACTIVE & EVOLVING
