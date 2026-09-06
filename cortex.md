Universal Cortex Web (UCW) - Production Specification v1.0
Status: FINAL - Ready for Implementation
Date: January 2025
Purpose: AI-agnostic memory protocol reducing token costs 70% while enabling true cross-chat persistence

Executive Summary
UCW is a decentralized memory infrastructure that separates AI cognition (LLM processing) from long-term memory (graph storage). By moving context management from expensive LLM token windows to optimized local graph databases, it achieves:

70-90% cost reduction for long-running AI sessions
Cross-model memory (works with ChatGPT, Claude, local models)
Human-like forgetting via Ebbinghaus decay
Zero vendor lock-in via open protocol + proprietary cloud
Part 1: Three-Layer Architecture
text

┌─────────────────────────────────────────────┐
│  Layer 1: Working Memory (Dragonfly)       │
│  - Last 10 messages only                   │
│  - In-memory, <0.5ms latency               │
│  - Cleared on session end                  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼ (async on idle/close)
┌─────────────────────────────────────────────┐
│  Layer 2: Permanent Memory (SurrealDB)     │
│  - Graph: Nodes (concepts) + Edges (relations) │
│  - Ebbinghaus decay (daily cron)           │
│  - Language-agnostic triplets              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼ (bidirectional)
┌─────────────────────────────────────────────┐
│  Layer 3: Integration (MCP + CLI)          │
│  - Primary: Anthropic MCP (official)       │
│  - Secondary: Local CLI/proxy              │
│  - Optional: Browser extension             │
└─────────────────────────────────────────────┘
Part 2: Tech Stack (Zero Bottlenecks)
Component	Technology	Why
Core Engine	Rust	Memory-safe, zero GC, fast
Working Memory	Dragonfly	Multi-threaded C++, 25x faster than Redis
Permanent Graph	SurrealDB	Rust-native, multi-model, scales horizontally
Vector Index	Qdrant	Map text → Node IDs, Rust-based
Protocol	MCP (primary) + gRPC	Official + future-proof
Visual UI	WebGL (3d-force-graph)	GPU-rendered, viral-ready
Part 3: Data Flow
Session Start → End Pipeline
text

1. User sends message
   ↓
2. Add to Dragonfly (working memory)
   ↓
3. Query SurrealDB graph for relevant nodes
   ↓
4. Inject context into LLM prompt
   ↓
5. LLM responds
   ↓
6. [Session continues... repeat 1-5]
   ↓
7. Session ends (idle 15min OR user closes)
   ↓
8. Background worker extracts triplets
   - Uses Llama 3.2 3B (local, $0 cost)
   - Generates Subject-Predicate-Object facts
   ↓
9. Update SurrealDB graph
   - Add new nodes/edges
   - Strengthen accessed connections
   - Update timestamps
   ↓
10. Clear Dragonfly buffer
Part 4: Core Algorithms
A. Ebbinghaus Forgetting Curve
Formula:

text

Weight_new = Weight_old × e^(-Δt / (S × I))
Where:

Δt = Days since last access
S = Stability (1-100, increased by rehearsal)
I = Impact (1-10, set by importance detection)
Implementation (Rust):

Rust

fn calculate_decay(
    old_weight: f32,
    days_since_access: f32,
    stability: f32,
    impact: u8,
) -> f32 {
    let decay_rate = days_since_access / (stability * impact as f32);
    old_weight * (-decay_rate).exp()
}
Daily Cron Job:

Scan all edges in graph
Calculate new weight
If weight < 0.1 → delete edge
If weight < 0.3 → compress (keep concept, delete details)
Otherwise → update weight in DB
B. State Overwriting (Contradiction Handling)
Scenario: User previously said "I like momos", now says "I hate momos"

Process:

Detect contradiction (same subject + object, opposite predicate)
Check timestamps + confidence
If new statement is explicit → update edge predicate
Mark old edge as superseded_by: new_edge_id
Don't delete old (keep for history)
Example Update:

text

OLD: User --likes--> Momos (weight: 0.8)
NEW: User --hates--> Momos (weight: 0.9)

Result in DB:
- User --likes--> Momos (weight: 0.0, superseded: true)
- User --hates--> Momos (weight: 0.9, active: true)
C. Importance Detection (Impact Factor)
Triggers for I=10 (never decay):

Explicit: "Remember this:", "Important:", "Always"
Future plans: "I'm building", "my goal", "startup idea"
Identity: "I am", "my career", "my passion"
Corrections: "Actually,", "I meant"
Triggers for I=1 (decay fast):

Chitchat: "lol", "haha", weather talk
Transient: "what time is it", "random thought"
Implementation: Use regex + keyword matching (simple v1), upgrade to ML later

Part 5: Data Schemas
Rust Structs
Rust

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MemoryNode {
    pub id: String,           // e.g., "node:a8f2"
    pub label: String,        // e.g., "Python"
    pub stability: f32,       // S-factor (1.0-100.0)
    pub impact: u8,          // I-factor (1-10)
    pub created_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
    pub access_count: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RelationalEdge {
    pub id: String,
    pub source_id: String,    // Subject node
    pub target_id: String,    // Object node
    pub predicate: String,    // e.g., "proficient_in"
    pub weight: f32,         // 0.0-1.0
    pub superseded: bool,
    pub superseded_by: Option<String>,
}
JSON-LD Format (for LLM injection)
JSON

{
  "@context": {
    "ucw": "https://universal-cortex.io",
    "rdf": "http://w3.org"
  },
  "@graph": [
    {
      "@id": "ucw:node_py01",
      "@type": "ucw:Concept",
      "ucw:label": "Python",
      "ucw:stability": 45.2,
      "ucw:impact": 7
    },
    {
      "@id": "ucw:edge_u2py",
      "@type": "rdf:Statement",
      "rdf:subject": {"@id": "ucw:user_root"},
      "rdf:predicate": {"@id": "ucw:rel_proficient_in"},
      "rdf:object": {"@id": "ucw:node_py01"},
      "ucw:weight": 0.92
    }
  ]
}
Part 6: Retroactive History Scraper
Purpose: Solve cold-start problem (empty graph on day 1)
Process:

text

1. User installs UCW
   ↓
2. CLI prompts: "Import chat history?"
   ↓
3. User provides:
   - ChatGPT export (conversations.json)
   - OR Claude export
   - OR manual text file
   ↓
4. Background worker:
   - Splits into chunks (1000 messages at a time)
   - Batch processes with Llama 3B
   - Extracts ~5,000 initial triplets
   - Populates SurrealDB graph
   ↓
5. Complete in ~10 minutes
   ↓
6. User's first query has full context
Example Command:

Bash

ucw import --source chatgpt --file ~/Downloads/conversations.json
Part 7: Monetization (Clean Tiers)
🆓 Free Tier ($0/month)
Limits:

5,000 active nodes
Local storage only (no cloud sync)
Max 2-hop graph traversal
Standard decay speed
Target: 95% of users, viral growth

🚀 Pro Tier ($9/month)
Includes:

Unlimited nodes
Cloud sync (encrypted, multi-device)
6-hop graph traversal
Custom impact flags (lock memories from decay)
Priority support
Target: Power users, developers

🏢 Enterprise Tier (Custom)
For: AI companies (OpenAI, Anthropic, etc.)

Offer:

On-premise deployment
Native KV cache integration
Reduce their GPU costs 70%
Annual license: $50k-500k
Target: B2B infrastructure deals

Part 8: Product Roadmap
Phase 1: Core Utility (Month 1-3)
Build:

Rust core engine
SurrealDB integration
CLI tool
MCP server
Decay algorithm
Retroactive scraper
Goal: 10 beta users, proven cost savings

Phase 2: Public Launch (Month 4-6)
Build:

Visual neuron UI (WebGL)
Cloud sync (Pro tier)
Documentation
Demo video
Goal: 1,000 GitHub stars, 500 active users

Phase 3: Enterprise (Month 7-12)
Build:

On-prem deployment option
Enterprise analytics dashboard
BD outreach to AI companies
Goal: First enterprise contract, $10k MRR

Phase 4: Ecosystem (Year 2+)
Build:

AI Agent Browser
Cortex OS (optional)
Open-source protocol spec
Goal: Industry standard, $1M+ ARR

Part 9: Visual UI Specification
3D Neural Graph Canvas
Technology: 3d-force-graph (Three.js + WebGL)

Features:

Node Rendering:

Size = f(importance)
Opacity = retention score R(t)
Color = category (tech, personal, work)
Edge Rendering:

Thickness = weight
Animated pulse on access (WebSocket event)
Interactions:

Click node → show details
Drag-and-drop to create new edge
Right-click → manually set impact factor
Decay Animation:

Nodes fade as R(t) decreases
Flash bright when accessed
Delete animation when pruned
Viral Hook: Users screen-record their "brain" and share on Twitter/TikTok

Part 10: Implementation Checklist
Week 1-2: Foundation
 Initialize Rust project (cargo new ucw-core)
 Set up SurrealDB connection
 Define MemoryNode + RelationalEdge structs
 Implement basic graph operations (add, query, delete)
Week 3-4: Core Logic
 Implement Ebbinghaus decay function
 Build daily cron job for pruning
 Add state overwriting logic
 Test with synthetic data
Week 5-6: Integration
 Build MCP server
 CLI tool (ucw store, ucw recall)
 Llama 3B integration for extraction
 Test with Claude Desktop
Week 7-8: Polish
 WebGL visual UI
 Retroactive scraper
 Documentation
 Demo video
Week 9-10: Launch
 GitHub repo (public)
 HackerNews post
 Twitter thread
 First 100 beta users
Part 11: Success Metrics
Month 3:
✅ 10 active users
✅ 80%+ retention accuracy
✅ 60%+ cost reduction proven
Month 6:
✅ 1,000 GitHub stars
✅ 500 weekly active users
✅ First revenue ($1k MRR)
Month 12:
✅ 10,000 users
✅ $10k MRR
✅ First enterprise pilot
Final Directive: BUILD NOW
This specification is COMPLETE and SHIPPABLE.

Stop here. Do not:

❌ Rewrite the spec again
❌ Ask for more validation
❌ Research alternative approaches
❌ Wait for "perfect timing"
Start today:

Save this spec as UCW_SPEC_v1.0.md
Create GitHub repo: universal-cortex-web
Run: cargo init ucw-core --lib
Code for 4 hours
Commit
In 90 days, you'll have a product.
In 12 months, you'll have revenue.
In 24 months, you'll have freedom.