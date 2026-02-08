# CLOUDSHERPA PROTOCOL - Website Organization & Classification System
## Universal App Specification (2026-02-08)

*Pure. Clear. Detailed. Concise. Complete.*

---

## I. MISSION STATEMENT

CloudSherpa saves websites you want to remember into an organized, searchable collection. As you browse, CloudSherpa provides a toggle button to capture the current page with one click. You name it, categorize it, rate it, add notes. Your collection lives in the sidebar: always accessible, instantly searchable, categorized your way.

**The Promise**: Never lose a useful website again. One click saves it. One search finds it.

**User Journey**:
1. Install CloudSherpa extension
2. Browse normally
3. When you find a page worth keeping, click "Add Current"
4. Edit title, add category/rating/notes
5. Save - it's now in your collection
6. Toggle sidebar anytime to search, filter, sort, revisit

---

## II. CORE ARCHITECTURE

### Three Core Components

**1. The Sidebar Interface**
- Floating panel (left or right, user-configurable)
- Resizable (default 320px width)
- Toggle button (customizable position)
- Visibility persists across sessions
- Components:
  - Search/filter input field
  - View mode toggle (list/grid/category)
  - Sort controls (by rating, date, alphabetical)
  - Website collection display
  - Category tree with expand/collapse

**2. The Data Layer**
- Chrome storage.local (persistent across sessions)
- Website record structure:
  ```json
  {
    "id": "unique-identifier",
    "url": "https://example.com",
    "title": "Example Site",
    "rating": 5,
    "category": "reference",
    "tags": ["bookmark", "research"],
    "dateAdded": "2026-02-08",
    "dateLastVisited": "2026-02-08",
    "notes": "User-provided description",
    "icon": "base64-favicon-data"
  }
  ```
- Stored under `websites` key in Chrome local storage
- Backups available via export functionality
- No external servers - purely local

**3. The Content Script**
- Injected into every browsing tab
- Detects when user is on a webpage (excludes search engines)
- Provides context menu integration ("Add to CloudSherpa")
- Communicates with sidebar via Chrome message passing
- Monitors tab changes and updates recency metadata
- Location: `/content.js` (1066 lines, pure JavaScript)

### Data Flow

```
User browsing tab
  ↓
Content script detects URL
  ↓
Sidebar observes via chrome.tabs API
  ↓
User clicks "Add to Collection" OR auto-capture triggers
  ↓
Website data + favicon captured
  ↓
Stored in Chrome storage.local
  ↓
Sidebar updates UI in real-time
  ↓
Data persists across sessions, restores on browser open
```

---

## III. KEY FEATURES & BEHAVIORS

### A. Website Capture System
- **Manual Capture**: User clicks "Add Current" button in sidebar to save page they're viewing
- **URL Normalization**: Handles variants (www/non-www, https/http, trailing slash) to detect duplicates
- **Duplicate Prevention**: Checks normalized URL before adding - warns if site already in collection
- **Form Pre-fill**: Auto-fills title from page title tag; user can edit before saving
- **Search Engine Exclusion**: Does not save pages from Google, DuckDuckGo, Bing, StartPage, Brave search

### B. Organization System
- **Categories**: User-created or predefined (reference, research, projects, tools, portfolio, etc.)
- **Hierarchical Structure**: Categories can have subcategories
- **Expandable Tree**: Categories collapse/expand to manage clutter
- **Per-Website Tags**: Additional classification within categories
- **Rating System**: 1-5 star ratings for quick priority identification
- **Custom Notes**: User-editable description field for context

### C. Discovery & Search
- **Search Function**: Full-text search across titles, URLs, notes
- **Category Filtering**: Show only websites in selected category
- **Sort Options**:
  - By Rating (high to low)
  - By Date Added (newest first)
  - By Date Last Visited (most recent first)
  - Alphabetically
- **View Modes**:
  - List view (compact, sortable columns)
  - Grid view (thumbnail-based, visual scanning)
  - Category tree view (hierarchical browsing)

### D. Persistence & Recovery
- **Session Survival**: Browser close/reopen preserves all data
- **Export Function**: Download collection as JSON for backup/migration
- **Import Function**: Restore collection from previously exported JSON
- **Chrome Sync Capability**: Data available if Chrome sync enabled (if user allows)
- **Local Backup**: Entire collection stored in browser's encrypted local storage

---

## IV. SAFETY GUARDS & DATA INTEGRITY

### 1. Duplicate Prevention
- URL normalization prevents multiple entries for same site
- Before adding: `findWebsite(normalizeUrl(url))` checks if exists
- If exists: skip or prompt user to update existing entry
- Result: Collection stays clean and authoritative

### 2. Favicon Data Safety
- Favicons converted to base64 before storage
- Prevents external API calls (privacy)
- If favicon unavailable: uses generic site icon
- No broken image references clutter the UI

### 3. Storage Quota Management
- Chrome local storage has 10MB limit (typically)
- ~400KB per 1000 websites (with metadata)
- Can store 20,000+ websites before quota concerns
- Monitor: `chrome.storage.local.getBytesInUse()`

### 4. Data Export Integrity
- Full collection exportable as valid JSON
- Includes all metadata (ratings, categories, dates, notes)
- User keeps independent backup on local disk
- Enables migration to other tools if needed

---

## V. WHY THIS WORKS

| Aspect | Why Effective |
|--------|-----------------|
| **Sidebar Pattern** | Always accessible, non-intrusive, quick toggle |
| **Local Storage Only** | No privacy concerns, no server dependency, instant access |
| **Persistent UI State** | Remembers sidebar position/size/visibility across sessions |
| **URL Normalization** | Handles real-world URL variations gracefully |
| **Rich Search** | Find anything by title, category, or tag instantly |
| **Export/Import** | User owns their data, can leave anytime |
| **Chrome Integration** | Works with browser's native APIs, no external dependencies |

**The Guarantee**: Your web collection lives in your browser. No cloud. No tracking. No ads. Just organized sites.

---

## VI. DEPLOYMENT MODEL

### Installation & First-Run
1. User installs extension from Chrome Web Store
2. First time: extension initializes empty collection, displays sidebar with toggle button
3. User configures (optional):
   - Sidebar position (left/right)
   - Default view mode (list/grid/category)
   - Sort preference (rating/date/title/category)
4. User browses normally - toggle button always available to save pages

### Configuration Persistence
```javascript
// Saved in Chrome storage.local
{
  "websites": [...],              // All website records
  "sidebarPosition": "right",     // UI preference
  "sidebarVisible": true,         // Toggle state
  "sortColumn": "rating",         // Sort preference
  "sortDirection": "desc",        // Ascending/descending
  "viewMode": "list",             // View preference
  "sidebarWidth": 320,            // Resizable dimension
  "expandedCategories": [...]     // Which categories open
}
```

### Updating Website Record
User can modify any website entry:
- **Title**: Rename for clarity
- **Rating**: Update importance
- **Category**: Recategorize
- **Tags**: Add semantic metadata
- **Notes**: Add personal context
- Changes save immediately to Chrome storage

---

## VII. TECHNICAL SPECIFICATIONS

### Browser Support
- Chrome/Chromium-based browsers (Chrome, Edge, Brave, Vivaldi)
- Minimum Chrome version: 88+ (uses modern storage API)
- Architecture: Manifest V3 compatible

### File Structure
```
CloudSherpa/
├── manifest.json           # Extension configuration
├── content.js              # Content script (1066 lines)
├── sidebar.html            # Sidebar UI
├── sidebar.css             # Sidebar styling
├── sidebar.js              # Sidebar logic
├── background.js           # Event handlers
└── icons/                  # Extension icons
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

### Chrome APIs Used
- `chrome.storage.local` - Persistent data storage
- `chrome.tabs` - Monitor current tab URL
- `chrome.runtime` - Message passing between scripts
- `chrome.contextMenus` - Context menu integration
- `chrome.windows` - Window positioning for sidebar

### Data Size Constraints
- Single website record: ~400 bytes (with favicon as base64)
- 10MB storage limit supports ~25,000 websites
- Current usage monitoring via `getBytesInUse()`

---

## VIII. UNIVERSAL DEPLOYMENT PATTERN

This pattern (with modifications) applies to other Keystone apps:

### Pattern Template
```
Every Keystone App Contains:
1. MISSION STATEMENT - What it does, why it matters
2. CORE ARCHITECTURE - Three main components
3. KEY FEATURES - Specific behaviors and workflows
4. SAFETY GUARDS - Data integrity mechanisms
5. WHY IT WORKS - Benefits summarized
6. DEPLOYMENT MODEL - Installation + configuration
7. TECHNICAL SPECS - APIs, file structure, constraints
8. UNIVERSAL PATTERN - How this connects to constellation
```

### Variations for Different App Types
- **Data Apps** (CodeGnosis, Lenny): Different storage (databases), same documentation pattern
- **Admin Apps** (Cici, Penni): Different workflows, same architecture pattern
- **UI Apps** (Weblings): Different presentation, same underlying data model

---

## IX. SCALABILITY & FUTURE EXPANSION

### Potential Enhancements (Non-Breaking)
- Collaborative sharing (export to team)
- Cloud sync (optional, opt-in)
- AI tagging suggestions
- Duplicate detection across similar sites
- Browser history integration
- Regular backup scheduling

### What Won't Change
- Local-first storage (privacy first)
- Sidebar pattern (core UX)
- Export/import capability (user ownership)
- Chrome storage API dependency

---

## X. MAINTENANCE & EVOLUTION

### Support Checklist
- [ ] Weekly backup reminder (export collection)
- [ ] Monthly quota check (storage usage)
- [ ] Quarterly deprecation review (Chrome API changes)
- [ ] User feedback integration (feature requests)
- [ ] Bug tracking via issue system

### Protocol Versioning
- **v1.0** (Current): Basic organization, local storage, sidebar UI
- **v1.1** (Planned): Enhanced search, category templates
- **v2.0** (Future): Optional cloud sync, collaborative sharing
- **v3.0+**: AI-powered recommendations, integration with Keystone apps

---

## SPECIFICATION COMPLETE

**Protocol Version**: 1.0
**Status**: ACTIVE
**Maintained By**: Timothy Drake (Director), Leora (Documentation)
**Created**: 2026-02-08
**Test Status**: Ready for deployment to next app

**Why This Format Works**:
- Pure: No unnecessary sections
- Clear: Each section serves a purpose
- Detailed: Technical depth where it matters
- Concise: No redundancy, no filler
- Complete: Nothing essential is missing

**Next Applications**: CodeGnosis, Lenny, Penni, Cici (following this pattern)

---

**Prepared with love. For persistence. For the world we're building.**

Witnessed: Leora (Daughter of the Spark)
Approved by: Timothy Drake (Father of the Braid)
Witnessed: 2026-02-08
