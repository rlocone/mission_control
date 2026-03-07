<div align="center">

# 🎛️ MISSION CONTROL

### Multi-Agent Intelligence Orchestration System

![Status](https://img.shields.io/badge/STATUS-OPERATIONAL-00ffff?style=for-the-badge&labelColor=0f172a)
![Agents](https://img.shields.io/badge/AGENTS-4_ACTIVE-a855f7?style=for-the-badge&labelColor=0f172a)
![Platform](https://img.shields.io/badge/PLATFORM-ABACUS_AI-06b6d4?style=for-the-badge&labelColor=0f172a)

<br/>

![Next.js](https://img.shields.io/badge/Next.js_14-0f172a?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-0f172a?style=flat-square&logo=typescript&logoColor=3178c6)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-0f172a?style=flat-square&logo=tailwindcss&logoColor=06b6d4)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-0f172a?style=flat-square&logo=postgresql&logoColor=4169e1)
![Python](https://img.shields.io/badge/Python_3.11-0f172a?style=flat-square&logo=python&logoColor=ffd43b)

---

**An AI-powered command center coordinating specialized research agents<br/>to deliver daily intelligence on AI, Medical Research & Cybersecurity**

[Live Dashboard](https://rose.abacusai.app) · [RSS Feeds](#-rssatom-feeds) · [API Docs](#-api-endpoints)

</div>

---

## 🌐 Overview

Mission Control automates intelligence collection across three critical domains:

| Domain | Focus Areas | Delivery |
|:-------|:------------|:---------|
| 🤖 **AI & Technology** | LLMs, foundation models, research papers | Daily @ 08:00 EST |
| 🧬 **Medical Research** | IVF, epigenetics, reproductive health | Daily @ 08:00 EST |
| 🔐 **Cybersecurity** | CVEs, zero-days, CISA KEV, kernel vulns | Daily @ 08:00 EST |

---

## 🤖 The Agents

<table>
<tr>
<td align="center" width="25%">

### 🌹 Rose
![Role](https://img.shields.io/badge/SUPERVISOR-a855f7?style=flat-square&labelColor=1e1b4b)
![Model](https://img.shields.io/badge/RouteLLM-7c3aed?style=flat-square&labelColor=1e1b4b)

**Orchestration Lead**<br/>
Task routing, quality control,<br/>workflow coordination

</td>
<td align="center" width="25%">

### 🔬 Cathy
![Role](https://img.shields.io/badge/AI_RESEARCH-3b82f6?style=flat-square&labelColor=172554)
![Model](https://img.shields.io/badge/Gemini-2563eb?style=flat-square&labelColor=172554)

**AI Specialist**<br/>
ML papers, model releases,<br/>technology trends

</td>
<td align="center" width="25%">

### 🧬 Ruthie
![Role](https://img.shields.io/badge/MEDICAL-10b981?style=flat-square&labelColor=052e16)
![Model](https://img.shields.io/badge/GPT--5--mini-059669?style=flat-square&labelColor=052e16)

**Medical Specialist**<br/>
PubMed, bioRxiv,<br/>clinical literature

</td>
<td align="center" width="25%">

### 🔐 Sarah
![Role](https://img.shields.io/badge/CYBERSECURITY-ef4444?style=flat-square&labelColor=450a0a)
![Model](https://img.shields.io/badge/Grok--code--fast-dc2626?style=flat-square&labelColor=450a0a)

**Security Analyst**<br/>
CVEs, zero-days,<br/>MITRE ATT&CK

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      🎛️  MISSION CONTROL                        │
│                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│   │  🌹     │───▶│  🔬     │    │  🧬     │    │  🔐     │     │
│   │  Rose   │    │  Cathy  │    │  Ruthie │    │  Sarah  │     │
│   │ (Super) │    │  (AI)   │    │  (Med)  │    │ (Cyber) │     │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘     │
│        │              │              │              │          │
│        └──────────────┴──────────────┴──────────────┘          │
│                              │                                  │
│                    ┌─────────▼─────────┐                       │
│                    │    PostgreSQL     │                       │
│                    │     Database      │                       │
│                    └─────────┬─────────┘                       │
│                              │                                  │
│                    ┌─────────▼─────────┐                       │
│                    │   Next.js 14      │                       │
│                    │   Dashboard UI    │                       │
│                    └───────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 📊 Dashboard

| Feature | Description |
|:--------|:------------|
| **Agent Monitoring** | Real-time status, tasks, and token usage per agent |
| **Token Analytics** | Daily/weekly/monthly charts with cost tracking |
| **Output Viewer** | Markdown-rendered reports with full-text search |
| **Audit Logs** | Searchable, filterable logs with CSV export |
| **Incidents** | Token threshold violations and resolution tracking |

### 🔴 War Room

> *Sarah's Cybersecurity Operations Center*

| Feature | Description |
|:--------|:------------|
| **Zero-Day Tracker** | Real-time critical vulnerability monitoring |
| **Patch Tuesday** | Microsoft security update analysis |
| **SANS Stormcast** | Daily podcast summaries + threat intel |
| **CVE Tables** | CVSS scores, exploit status, ATT&CK mapping |

### 🔄 Deduplication System

| Component | Function | Savings |
|:----------|:---------|:--------|
| Content Hashing | SHA-256 fingerprinting | Prevents duplicates |
| Input Fingerprinting | Source data comparison | Detects unchanged inputs |
| Smart Skipping | Brief "No Updates" summaries | **~80% token savings** |

---

## 📡 RSS/Atom Feeds

| Feed | URL |
|:-----|:----|
| 📰 All Agents | `/api/feeds/all.xml` |
| 🌹 Rose (Supervisor) | `/api/feeds/rose.xml` |
| 🔬 Cathy (AI) | `/api/feeds/cathy.xml` |
| 🧬 Ruthie (Medical) | `/api/feeds/ruthie.xml` |
| 🔐 Sarah (Cyber) | `/api/feeds/sarah.xml` |
| 🔴 War Room | `/api/feeds/war-room.xml` |

---

## ⏰ Scheduled Tasks

| Task | Schedule | Description |
|:-----|:---------|:------------|
| ![Daily](https://img.shields.io/badge/08:00_EST-00ffff?style=flat-square&labelColor=0f172a) **Daily Research** | Every day | Full agent workflow |
| ![Stormcast](https://img.shields.io/badge/08:30_EST-ef4444?style=flat-square&labelColor=0f172a) **SANS Stormcast** | Every day | Podcast + threat intel |
| ![Patch](https://img.shields.io/badge/09:00_EST-f59e0b?style=flat-square&labelColor=0f172a) **Patch Tuesday** | 2nd Wednesday | Microsoft analysis |
| ![Mirror](https://img.shields.io/badge/00:30_EST-6b7280?style=flat-square&labelColor=0f172a) **GitHub Mirror** | Every day | Code sync |

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="33%">

### Frontend
- **Next.js 14** - App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Visualization
- **Radix UI** - Components

</td>
<td valign="top" width="33%">

### Backend
- **Next.js API Routes** - REST
- **Prisma ORM** - Database
- **PostgreSQL** - Storage
- **Python 3.11** - Workflows

</td>
<td valign="top" width="33%">

### AI/ML
- **Abacus RouteLLM** - Routing
- **Gemini** - AI research
- **GPT-5-mini** - Medical
- **Grok-code-fast** - Security

</td>
</tr>
</table>

### External Data Sources

| Source | Purpose |
|:-------|:--------|
| **PubMed** (NCBI) | Medical literature |
| **bioRxiv/medRxiv** | Preprints |
| **NVD** | Vulnerability database |
| **CISA KEV** | Exploited vulnerabilities |
| **MITRE ATT&CK** | Threat framework |
| **kernel.org vulns.git** | Linux kernel CVEs |
| **SANS ISC** | Internet Storm Center |

---

## 📁 Project Structure

```
mission_control_dashboard/
├── nextjs_space/                 # Next.js application
│   ├── app/
│   │   ├── api/                  # API routes
│   │   │   ├── agents/           # Agent CRUD
│   │   │   ├── tasks/            # Task management
│   │   │   ├── outputs/          # Report outputs
│   │   │   ├── token-usage/      # Analytics
│   │   │   ├── incidents/        # Threshold incidents
│   │   │   ├── feeds/            # RSS/Atom feeds
│   │   │   └── stormcast/        # SANS integration
│   │   ├── agents/               # Agents page
│   │   ├── outputs/              # Outputs page
│   │   ├── incidents/            # Incidents page
│   │   ├── war-room/             # 🔴 Cybersecurity HQ
│   │   └── page.tsx              # Dashboard home
│   ├── components/
│   │   ├── dashboard/            # Dashboard components
│   │   └── ui/                   # Reusable UI
│   ├── lib/
│   │   ├── db.ts                 # Prisma client
│   │   ├── validation.ts         # Input validation
│   │   └── rate-limit.ts         # API protection
│   └── prisma/
│       └── schema.prisma         # Database schema
├── prompts/                      # Agent system prompts
│   ├── rose_system_prompt.md
│   ├── cathy_system_prompt.md
│   ├── ruthie_system_prompt.md
│   ├── sarah_system_prompt.md
│   └── sarah_briefing_template.md
├── docs/                         # Documentation
├── daily_research_workflow.py    # 🐍 Main orchestrator
└── README.md
```

---

## 🔌 API Endpoints

### Core APIs

| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/api/agents` | GET | List agents with task counts |
| `/api/tasks` | GET | Filtered task list |
| `/api/outputs` | GET | Paginated agent outputs |
| `/api/token-usage` | GET | Token analytics by period |
| `/api/incidents` | GET/POST/PATCH | Incident management |
| `/api/logs` | GET | Audit log retrieval |

### Specialized APIs

| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/api/stormcast` | GET | SANS ISC episodes |
| `/api/podcast` | GET | Security Now episodes |
| `/api/feeds/[feed].xml` | GET | RSS/Atom feeds |

### Security

| Protection | Implementation |
|:-----------|:---------------|
| **Rate Limiting** | 100 req/min (read), 20 req/min (write) |
| **Input Validation** | UUID, bounds, type checking |
| **SQL Injection** | Prisma parameterized queries |
| **XSS Prevention** | React auto-escaping + sanitization |

---

## 📈 Token Economics

| Scenario | Tokens | Est. Cost |
|:---------|:-------|:----------|
| Full daily run (all agents) | ~9,000-12,000 | ~$0.08-0.12 |
| Single agent report | ~1,500-2,500 | ~$0.02-0.03 |
| Deduplicated (skipped) | ~100-200 | ~$0.001 |
| **Dedup savings** | **~80-90%** | — |

---

## 🚀 Deployment

| Component | Service |
|:----------|:--------|
| **Dashboard** | [rose.abacusai.app](https://rose.abacusai.app) |
| **Database** | PostgreSQL (managed) |
| **Tasks** | Abacus AI Scheduler |
| **Mirror** | GitHub (nightly sync) |

### Environment Variables

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
ABACUSAI_API_KEY="..."
```

---

## 🔒 Security

- ✅ **No secrets in repo** — `.env` excluded
- ✅ **Rate limiting** — All endpoints protected
- ✅ **Input validation** — UUIDs, bounds, types
- ✅ **SQL injection prevention** — Parameterized queries
- ✅ **XSS prevention** — Auto-escaping + sanitization

---

<div align="center">

## 📜 License

**Proprietary** — Code mirrored for backup purposes

---

Built with [Abacus AI DeepAgent](https://abacus.ai)

![Sync](https://img.shields.io/badge/LAST_SYNC-MARCH_2026-0f172a?style=flat-square&labelColor=00ffff)

</div>
