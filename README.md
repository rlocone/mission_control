# 🎛️ Mission Control Dashboard

**A Multi-Agent Orchestration System for Automated Research & Intelligence**

Mission Control is an AI-powered command center that coordinates specialized research agents to deliver daily intelligence briefings on AI developments, medical research, and cybersecurity threats. Built on [Abacus AI](https://abacus.ai) with a Next.js dashboard.

![Dashboard](https://img.shields.io/badge/Dashboard-Live-brightgreen) ![Agents](https://img.shields.io/badge/Agents-4-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue) ![Python](https://img.shields.io/badge/Python-3.11-yellow)

---

## 🌟 Overview

Mission Control automates the collection, synthesis, and delivery of research intelligence across three domains:

- **AI & Technology** — Latest developments in LLMs, foundational models, and AI research
- **Medical Research** — IVF, epigenetics, reproductive health from PubMed & bioRxiv
- **Cybersecurity** — CVEs, zero-days, CISA KEV, kernel vulnerabilities, and threat intelligence

Reports are generated daily at 08:00 AM EST and delivered via email with full dashboard visualization.

---

## 🤖 The Agents

| Agent | Role | Model | Specialty |
|-------|------|-------|----------|
| 🌹 **Rose** | Supervisor | RouteLLM | Orchestration, task routing, quality control |
| 🔬 **Cathy** | AI Research Specialist | Gemini | AI/ML papers, model releases, tech trends |
| 🧬 **Ruthie** | Medical Research Specialist | GPT-5-mini | PubMed/bioRxiv literature, clinical research |
| 🔐 **Sarah** | Cybersecurity Intelligence | Grok-code-fast | CVEs, zero-days, MITRE ATT&CK, kernel security |

### Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MISSION CONTROL                          │
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  Rose   │───▶│  Cathy  │    │ Ruthie  │    │  Sarah  │  │
│  │ (Super) │    │  (AI)   │    │ (Med)   │    │ (Cyber) │  │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘  │
│       │              │              │              │        │
│       └──────────────┴──────────────┴──────────────┘        │
│                          │                                  │
│                    ┌─────▼─────┐                            │
│                    │  Database │                            │
│                    │ PostgreSQL│                            │
│                    └─────┬─────┘                            │
│                          │                                  │
│              ┌───────────┴───────────┐                      │
│              │     Dashboard UI      │                      │
│              │      (Next.js)        │                      │
│              └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 📊 Dashboard
- **Real-time Agent Monitoring** — Status, tasks, and token usage per agent
- **Token Usage Analytics** — Daily/weekly/monthly consumption charts with cost tracking
- **Output Viewer** — Markdown-rendered research reports with full-text search
- **Audit Logs** — Searchable, filterable system logs with CSV export
- **Incident Management** — Token threshold violations and resolution tracking

### 🔴 War Room (Cybersecurity HQ)
- **Zero-Day Tracker** — Real-time critical vulnerability monitoring
- **Patch Tuesday Analysis** — Microsoft security update breakdowns
- **SANS ISC Stormcast** — Daily podcast summaries with threat intelligence
- **Security Now Podcast** — Weekly episode tracking and analysis
- **CVE Tables** — CVSS scores, exploit status, MITRE ATT&CK mapping

### 📡 RSS/Atom Feeds
- `/api/feeds/all.xml` — Combined feed from all agents
- `/api/feeds/rose.xml` — Supervisor summaries
- `/api/feeds/cathy.xml` — AI research updates
- `/api/feeds/ruthie.xml` — Medical literature
- `/api/feeds/sarah.xml` — Cybersecurity briefings
- `/api/feeds/war-room.xml` — Security-focused feed

### 🔄 Deduplication System
- **Content Hashing** — SHA-256 fingerprinting prevents duplicate reports
- **Input Fingerprinting** — Detects when source data hasn't changed
- **Smart Skipping** — Generates brief "No Updates" summaries (~80% token savings)
- **Chain Prevention** — Forces fresh generation after skipped reports

### ⏰ Scheduled Tasks
| Task | Schedule | Description |
|------|----------|-------------|
| Daily Research | 08:00 AM EST | Full agent workflow execution |
| SANS Stormcast | 08:30 AM EST | Podcast fetch and summarization |
| Patch Tuesday | 09:00 AM 2nd Wed | Microsoft security analysis |
| GitHub Mirror | 00:30 AM EST | Code sync to repository |

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** — React framework with App Router
- **TypeScript** — Type-safe development
- **Tailwind CSS** — Utility-first styling
- **Framer Motion** — Smooth animations
- **Recharts** — Data visualization
- **Radix UI** — Accessible components

### Backend
- **Next.js API Routes** — RESTful endpoints with rate limiting
- **Prisma ORM** — Database access layer
- **PostgreSQL** — Persistent data storage
- **Python 3.11** — Workflow orchestration

### AI/ML
- **Abacus AI RouteLLM** — Multi-model routing
- **Gemini** — AI research agent
- **GPT-5-mini** — Medical research agent
- **Grok-code-fast** — Cybersecurity agent

### External Data Sources
- **PubMed** (NCBI E-utilities API)
- **bioRxiv/medRxiv** — Preprint servers
- **NVD** — National Vulnerability Database
- **CISA KEV** — Known Exploited Vulnerabilities
- **MITRE ATT&CK** — Threat framework
- **kernel.org vulns.git** — Linux kernel CVEs
- **SANS ISC** — Internet Storm Center

---

## 📁 Project Structure

```
mission_control_dashboard/
├── nextjs_space/                 # Next.js application
│   ├── app/                      # App Router pages
│   │   ├── api/                  # API routes
│   │   │   ├── agents/           # Agent CRUD
│   │   │   ├── tasks/            # Task management
│   │   │   ├── outputs/          # Report outputs
│   │   │   ├── token-usage/      # Analytics
│   │   │   ├── incidents/        # Threshold incidents
│   │   │   ├── feeds/            # RSS/Atom feeds
│   │   │   ├── stormcast/        # SANS ISC integration
│   │   │   └── podcast/          # Security Now
│   │   ├── agents/               # Agents page
│   │   ├── outputs/              # Outputs page
│   │   ├── incidents/            # Incidents page
│   │   ├── war-room/             # Cybersecurity HQ
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Dashboard home
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── dashboard/            # Dashboard components
│   │   │   ├── agent-card.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── token-usage-chart.tsx
│   │   │   ├── log-viewer.tsx
│   │   │   ├── markdown-renderer.tsx
│   │   │   └── system-clock.tsx
│   │   └── ui/                   # Reusable UI components
│   ├── lib/
│   │   ├── db.ts                 # Prisma client
│   │   ├── utils.ts              # Utilities
│   │   ├── validation.ts         # Input validation
│   │   └── rate-limit.ts         # API rate limiting
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   ├── public/
│   │   └── avatars/              # Agent avatars
│   └── scripts/
│       └── seed.ts               # Database seeding
├── prompts/                      # Agent system prompts
│   ├── rose_system_prompt.md
│   ├── cathy_system_prompt.md
│   ├── ruthie_system_prompt.md
│   ├── sarah_system_prompt.md
│   └── sarah_briefing_template.md
├── docs/                         # Documentation
│   └── war_room_overview.md
├── daily_research_workflow.py    # Main workflow orchestrator
└── README.md
```

---

## 🔌 API Endpoints

### Core APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents with task counts |
| `/api/tasks` | GET | Filtered task list |
| `/api/outputs` | GET | Paginated agent outputs |
| `/api/token-usage` | GET | Token analytics by period |
| `/api/incidents` | GET/POST/PATCH | Incident management |
| `/api/logs` | GET | Audit log retrieval |

### Specialized APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stormcast` | GET | SANS ISC episodes |
| `/api/podcast` | GET | Security Now episodes |
| `/api/feeds/[feed].xml` | GET | RSS/Atom feeds |

### Security Features
- **Rate Limiting** — Prevents abuse (standard: 100 req/min, write: 20 req/min)
- **Input Validation** — UUID, bounds checking, type validation
- **Sanitization** — String truncation, array limits

---

## 📈 Database Schema

```prisma
model Agent {
  id        String   @id @default(uuid())
  name      String   @unique
  role      String
  appId     String
  status    String   @default("active")
  tasks     Task[]
  outputs   Output[]
}

model Output {
  id          String   @id @default(uuid())
  content     String
  summary     String?
  contentHash String?  // SHA-256 deduplication
  inputHash   String?  // Input fingerprint
  wasSkipped  Boolean  @default(false)
  agent       Agent    @relation(...)
  task        Task     @relation(...)
}

model TokenUsage {
  id         String   @id @default(uuid())
  tokensUsed Int
  cost       Float
  agent      Agent    @relation(...)
}

model ThresholdIncident {
  id              String   @id @default(uuid())
  incidentType    String
  thresholdLimit  Int
  actualValue     Int
  resolved        Boolean  @default(false)
}

model SansStormcast {
  id          String   @id @default(uuid())
  episodeDate DateTime @unique
  title       String
  audioUrl    String?
  summary     String?
  topics      String[]
}
```

---

## 🚀 Deployment

This project is deployed on **Abacus AI** infrastructure:

- **Dashboard**: [https://rose.abacusai.app](https://rose.abacusai.app)
- **Database**: PostgreSQL (managed)
- **Scheduled Tasks**: Abacus AI Task Manager

### Environment Variables
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
ABACUSAI_API_KEY="..."
```

---

## 📊 Token Economics

| Scenario | Tokens | Est. Cost |
|----------|--------|----------|
| Full daily run (all agents) | ~9,000-12,000 | ~$0.08-0.12 |
| Single agent report | ~1,500-2,500 | ~$0.02-0.03 |
| Deduplicated (skipped) | ~100-200 | ~$0.001 |
| **Dedup savings** | **~80-90%** | — |

---

## 🔒 Security Considerations

- **No secrets in repo** — `.env` excluded from sync
- **Rate limiting** — All endpoints protected
- **Input validation** — UUIDs, bounds, types checked
- **SQL injection prevention** — Prisma parameterized queries
- **XSS prevention** — React auto-escaping + sanitization

---

## 📜 License

This project is proprietary. Code is mirrored for backup purposes.

---

## 👤 Author

Built with [Abacus AI DeepAgent](https://abacus.ai) — Multi-Agent Orchestration Platform

---

*Last synced: March 2026*
