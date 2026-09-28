# Graph Report - .  (2026-09-28)

## Corpus Check
- Corpus is ~36,266 words - fits in a single context window. You may not need a graph.

## Summary
- 339 nodes · 982 edges · 19 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: imports: 486 · contains: 278 · imports_from: 187 · calls: 29 · inherits: 1 · method: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 73 · Candidates: 150
- Excluded: 82 untracked · 47358 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `2bb2fec`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `cn()` - 21 edges
2. `Button()` - 19 edges
3. `apiGet()` - 18 edges
4. `Table()` - 15 edges
5. `TableHeader()` - 15 edges
6. `TableBody()` - 15 edges
7. `TableRow()` - 15 edges
8. `TableCell()` - 15 edges
9. `ApiError` - 14 edges
10. `PageHeader()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `SantriDetailPage()` --calls--> `fmt()`  [EXTRACTED]
  src/app/(dashboard)/santri/[id]/page.tsx → src/app/(dashboard)/visits/[id]/page.tsx
- `SantriDetailPage()` --calls--> `rp()`  [EXTRACTED]
  src/app/(dashboard)/santri/[id]/page.tsx → src/app/(dashboard)/visits/[id]/page.tsx
- `UstadzDetailPage()` --calls--> `fmt()`  [EXTRACTED]
  src/app/(dashboard)/ustadz/[id]/page.tsx → src/app/(dashboard)/visits/[id]/page.tsx
- `UstadzDetailPage()` --calls--> `rp()`  [EXTRACTED]
  src/app/(dashboard)/ustadz/[id]/page.tsx → src/app/(dashboard)/visits/[id]/page.tsx

## Communities

### Community 18 - "Community 18"
Cohesion: 1.00
Nodes (1): eslintConfig

### Community 21 - "Community 21"
Cohesion: 1.00
Nodes (1): nextConfig

### Community 22 - "Community 22"
Cohesion: 1.00
Nodes (1): config

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (14): BalanceRow, Tx, Adjustment, txLabel, txCredit, ADJ_STATUS, buttonVariants, Button() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (19): Submission, detailBadge, AuditEntry, Review, QuestionOut, MessageOut, Thread, PageHeader() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (14): DashboardData, SettingsMap, Card(), CardHeader(), CardTitle(), CardContent(), Skeleton(), ApiError (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (18): UstadzOption, Tx, Khatmil, Santri, VisitRow, statusVariant, visitStatusColor, txLabel (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (20): Campaign, GroupProgress, groupProgressList(), JuzSlot, GroupLite, GroupJuzMap, CampaignDetail, JuzActive (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (3): STATUS_ORDER, RefreshButton(), apiGet()

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (35): inter, metadata, AppHeader(), mainNav, layananNav, sistemNav, AppSidebar(), Sheet() (+27 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (7): Payment, STATUS_ORDER, jenisLabel, TONE, MAP, StatusPill(), statusLabel()

### Community 11 - "Community 11"
Cohesion: 0.28
Nodes (5): Payout, STATUS_ORDER, rp(), fmtDateTime(), fmtDateInput()

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (8): AdminUser, Visit, STATUS_ORDER, SelectValue(), SelectTrigger(), SelectContent(), SelectItem(), useAdminList()

### Community 14 - "Community 14"
Cohesion: 0.47
Nodes (6): rp(), fmt(), SantriDetailPage(), UstadzDetailPage(), fmtShort(), VisitDetailPage()

### Community 9 - "Community 9"
Cohesion: 0.23
Nodes (8): Santri, Ustadz, SortHead(), Table(), TableHeader(), TableRow(), TableCell(), UserAvatar()

### Community 12 - "Community 12"
Cohesion: 0.32
Nodes (3): loginSchema, Input(), Label()

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (22): segmentLabels, Avatar(), AvatarFallback(), Breadcrumb(), BreadcrumbList(), BreadcrumbItem(), BreadcrumbPage(), THEMES (+14 more)

### Community 15 - "Community 15"
Cohesion: 0.40
Nodes (5): Tabs(), tabsListVariants, TabsList(), TabsTrigger(), TabsContent()

### Community 16 - "Community 16"
Cohesion: 0.60
Nodes (4): cookieOpts(), tryRefresh(), proxy(), config

## Knowledge Gaps
- **69 isolated node(s):** `eslintConfig`, `nextConfig`, `config`, `BalanceRow`, `Tx` (+64 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 18`** (1 nodes): `eslintConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `nextConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 1` to `Community 2`, `Community 5`, `Community 8`, `Community 12`, `Community 7`, `Community 0`, `Community 4`, `Community 9`, `Community 15`, `Community 3`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `Button()` connect `Community 5` to `Community 1`, `Community 2`, `Community 6`, `Community 13`, `Community 3`, `Community 12`, `Community 11`, `Community 4`, `Community 7`, `Community 0`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `Input()` connect `Community 12` to `Community 2`, `Community 5`, `Community 6`, `Community 3`, `Community 4`, `Community 0`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `config` to the rest of the system?**
  _69 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.1341991341991342 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._