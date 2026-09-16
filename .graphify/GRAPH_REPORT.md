# Graph Report - .  (2026-09-16)

## Corpus Check
- Corpus is ~30,963 words - fits in a single context window. You may not need a graph.

## Summary
- 310 nodes · 810 edges · 11 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: imports: 365 · contains: 254 · imports_from: 163 · calls: 26 · inherits: 1 · method: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 66 · Candidates: 135
- Excluded: 1 untracked · 47315 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `f12b14e`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Button()` - 21 edges
2. `cn()` - 20 edges
3. `ApiError` - 19 edges
4. `Skeleton()` - 18 edges
5. `Badge()` - 15 edges
6. `Table()` - 14 edges
7. `TableHeader()` - 14 edges
8. `TableBody()` - 14 edges
9. `TableRow()` - 14 edges
10. `TableHead()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `apiGetPage()` --calls--> `ApiError`  [EXTRACTED]
  src/lib/api.ts → src/lib/api.ts  _Bridges community 0 → community 6_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (39): AuditEntry, adjColor, Adjustment, BalanceRow, DepositPage(), rp(), Tx, txColor (+31 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (36): inter, metadata, AppHeader(), AppSidebar(), kontenNav, layananNav, mainNav, sistemNav (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (28): segmentLabels, DashboardData, login(), logout(), me(), MqUser, cn(), SettingsMap (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (35): CmsItem, Entity, entityConfig, ChatMsg, fmt(), fmtShort(), Party, Payment (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (12): statusColor, Submission, MessageOut, QuestionOut, statusColor, Thread, Button(), buttonVariants (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (6): patchCampaign(), DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuSeparator(), DropdownMenuTrigger()

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (10): apiDelete(), ApiError, apiGet(), apiPatch(), apiPost(), apiPut(), request(), Material (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.60
Nodes (4): config, cookieOpts(), proxy(), tryRefresh()

### Community 9 - "Community 9"
Cohesion: 1.00
Nodes (1): eslintConfig

### Community 12 - "Community 12"
Cohesion: 1.00
Nodes (1): nextConfig

### Community 13 - "Community 13"
Cohesion: 1.00
Nodes (1): config

## Knowledge Gaps
- **60 isolated node(s):** `eslintConfig`, `nextConfig`, `config`, `Entity`, `CmsItem` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (1 nodes): `eslintConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (1 nodes): `nextConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 2` to `Community 0`, `Community 4`, `Community 5`, `Community 3`, `Community 1`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `Button()` connect `Community 4` to `Community 3`, `Community 2`, `Community 0`, `Community 5`, `Community 6`, `Community 1`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `Skeleton()` connect `Community 0` to `Community 3`, `Community 2`, `Community 6`, `Community 4`, `Community 5`, `Community 1`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `config` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07502131287297528 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0531986531986532 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.057329462989840346 - nodes in this community are weakly interconnected._