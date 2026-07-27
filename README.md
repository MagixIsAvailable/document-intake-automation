<p align="center">
  <img src="https://img.shields.io/badge/Built%20With-n8n-18b52d?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n">
  <img src="https://img.shields.io/badge/LM%20Studio-3b82f6?style=for-the-badge&logo=lmstudio&logoColor=white" alt="LM Studio">
  <img src="https://img.shields.io/badge/Model-Qwen2.5%20Coder%207B-8b5cf6?style=for-the-badge" alt="Qwen2.5 Coder 7B">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML">
</p>

# Automated Client Document Intake and Compliance Check System

An end-to-end automation workflow that ingests client documents via webhook, uses a local LLM to extract structured data and assess risk in two parallel AI agent passes, validates results against business rules, and routes documents for approval or review.

> **Two-stage AI pipeline — extraction and risk assessment — running entirely on local hardware via LM Studio + Qwen2.5 Coder 7B Instruct. No document content is transmitted to external services.**

---

## 🖼️ Demo

![Demo Screenshot](docs/screenshots/demo.png)

*The single-page submission interface: paste a document, click Process, and receive structured extraction results with colour-coded risk assessment and validation status.*

---

## ✨ Features

- 🤖 **AI-Powered Extraction** — LLM extracts client name, document type, date, monetary amount, and summary from unstructured text
- 🚦 **Two-Stage Risk Pipeline** — Parallel AI agent calls: one for data extraction, one for independent risk scoring
- ✅ **Rule-Based Validation** — Modular JavaScript validation rules check field presence, data types, date validity, and amount positivity
- 🔒 **Privacy-First Design** — Local LLM inference via LM Studio ensures no document content leaves the machine
- 📋 **Batch CSV Processing** — Upload a CSV with `document_id`, `client_name`, `document_text` columns; each row flows through the full two-agent pipeline and results are aggregated
- 📊 **Batch Dashboard** — Summary cards (total, pass, fail, risk distribution) and sortable results table with CSV export
- 🎛️ **Non-Technical Interface** — Single-page HTML front-end with no frameworks, no build step, no `npm install`
- 🌐 **Webhook-Driven** — Document submission via REST API; workflow triggers instantly on receipt
- 🧩 **Modular Validation** — Each rule is an independent function; add new rules without restructuring the pipeline
- ⚙️ **Configurable Settings Panel** — Gear icon with LM Studio endpoint, webhook URL, and model name saved to localStorage
- 🆔 **Auto Document ID** — Every submission gets a unique `DOC-timestamp` reference
- ⏱️ **Processing Time Display** — Shows elapsed time per document
- 📈 **Parallel Batch Processing** — 4 concurrent requests with live ETA estimation
- ⚡ **Zero External Dependencies** — No cloud APIs, no Google credentials, no paid services — just n8n, LM Studio, and a browser

---

## 📐 Architecture

```
[HTML Frontend]
    │
    │ HTTP POST (JSON payload) to n8n webhook
    ▼
[n8n Webhook Trigger]
Receives document_text + client_name
    │
    ├─────────────────────────────────────────┐
    ▼                                         ▼
[HTTP Request Node:                     [HTTP Request Node:
 Extraction Agent]                       Risk Scoring Agent]
    │                                         │
    │ Prompt: Extract client name,            │ Prompt: Assess risk level,
    │ document type, date, amount,            │ risk reason, requires review
    │ summary                                 │
    │                                         │
    ▼                                         ▼
[LM Studio REST API]                    [LM Studio REST API]
Qwen2.5 Coder 7B Instruct               Qwen2.5 Coder 7B Instruct
    │                                         │
    └──────────────────┬──────────────────────┘
                       ▼
              [Merge Node]
              Combines extraction + risk assessment JSON
                       │
                       ▼
              [Code Node — JavaScript]
              Modular validation rules:
                ├─ Client name must be present and non-empty
                ├─ Document type must be one of recognised types
                ├─ Date must be valid and not in the future
                ├─ Amount must be a positive number (if Invoice)
                └─ Summary must be present
              Outputs: status (PASS / FAIL) + field-level error list
                       │
                       ▼
              [IF Node — Branch on Status]
                 │                 │
               PASS              FAIL
                 │                 │
                 └────────┬────────┘
                          ▼
              [Respond to Webhook]
              Returns JSON to frontend:
                status, extracted fields, validation result,
                risk assessment, timestamp
```

### Batch Architecture

```
[CSV File Upload]
    │
    │ Frontend parses CSV, sends each row sequentially
    │ as individual POST requests to the single-doc webhook
    ▼
[4 Concurrent Requests (configurable pool)]
Each row: document_id, client_name, document_text
    │
    ▼  (for each row, up to 4 in parallel)
[Same two-agent pipeline as single document]
Extraction Agent ∥ Risk Scoring Agent → Merge → Validate → Route
    │
    ▼
[Aggregate Results in Frontend]
Collects all responses, updates dashboard in real time
    │
    ▼
[Batch Summary + Exportable Results Table]
Total, pass, fail, risk distribution + CSV export
```

---

## 🚀 Quick Start

### Prerequisites

- [n8n](https://n8n.io) v2.8.4+ installed and running locally (self-hosted)
- [LM Studio](https://lmstudio.ai) 0.3+ with Qwen2.5 Coder 7B Instruct loaded
- A modern web browser (Chrome, Firefox, Edge)

That's it. No API keys. No cloud accounts. No tunnels.

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MagixIsAvailable/document-intake-automation.git
   cd document-intake-automation
   ```

2. **Start LM Studio and load the model**
   Launch LM Studio, load `Qwen2.5 Coder 7B Instruct`, and confirm the local server runs on `http://localhost:1234`.

3. **Import the n8n workflow**
   Open n8n (`http://localhost:5678`), import `workflow.json`, and activate the workflow. The webhook nodes will be ready to receive requests.

4. **Open the front-end**
   Open `frontend/index.html` in any browser. The page sends POST requests to `http://localhost:5678/webhook/document-intake`.

5. **Test with a sample document**
   Paste a test document from the [Test Documents](#-test-documents) section and click **Process Document**. You should see structured results in under 15 seconds.

For batch processing, upload a CSV with columns `document_id`, `client_name`, `document_text` via the drag-and-drop zone or browse button. Results appear in the dashboard with an exportable summary table.

---

## 📁 Project Structure

```
document-intake-automation/
├── frontend/
│   ├── index.html             # HTML structure (links to CSS + JS)
│   ├── css/
│   │   └── styles.css         # All styles — dark theme, animations, responsive
│   └── js/
│       └── app.js             # Form handling, API calls, batch processing, results rendering
├── workflow.json              # Exported n8n workflow (single document intake)
├── batch-workflow.json        # Exported n8n workflow (CSV batch processing)
├── docs/
│   └── screenshots/
│       └── demo.png           # Application screenshot
└── README.md
```

---

## 🧪 Test Documents

The system handles three categories of test input:

### 1. ✅ PASS — Clean Invoice
```
Invoice from Acme Ltd dated 15/07/2026 for £4,500
for consulting services rendered in June 2026.
```
**Expected:** All fields extracted correctly. Validation: **PASS**. Risk: **Low**.

### 2. ❌ FAIL — Missing Required Fields
```
Letter regarding the quarterly review.
No date, no amount, incomplete client reference.
```
**Expected:** Partial extraction. Validation: **FAIL** (missing client name, date, amount). Risk: **Medium**.

### 3. 🔴 HIGH RISK — Suspicious Amount
```
Invoice from XYZ Corp dated 01/01/2027 for £500,000
for "miscellaneous services" with no further detail.
```
**Expected:** Extraction succeeds but future date and unusually high amount with vague description. Validation: **FAIL** (future date). Risk: **High**.

---

## 🔐 Why Local AI

This project runs LLM inference entirely on local hardware via LM Studio + Qwen2.5 Coder 7B Instruct. This decision was driven by the confidentiality requirements of professional services:

| Concern | Local AI Approach | Benefit |
|---------|-------------------|---------|
| **Data confidentiality** | Document content never transmitted to external APIs | Zero risk of third-party data exposure |
| **GDPR compliance** | No third-party data processing; all data stays on-premises | Regulatory compliance by design |
| **Audit trail integrity** | No risk of data leakage through API logging or training | Chain of custody preserved |
| **Client trust** | Audit firms handle sensitive financial data | Local processing is non-negotiable |
| **Cost predictability** | No API usage billing; fixed hardware cost | Unlimited documents at no additional cost |
| **Offline capability** | Works without internet connectivity | Resilient to network outages |

---

## 🧱 Components

### 1. HTML Front-End (`frontend/`)

Single-page application with a dark-themed professional UI split across three files:

- **`index.html`** — Semantic HTML5 structure with sidebar workflow timeline, hero section with stat cards, document submission form, batch CSV upload zone with drag-and-drop, results panel, and batch dashboard with summary cards and sortable results table
- **`css/styles.css`** — Custom properties design system, animated gradient background, floating card panels with border glow effects, pill-shaped status badges, risk-level colour coding, responsive layout, loading spinner, and slide-in animations
- **`js/app.js`** — Form submission via `fetch()` POST to n8n webhook, loading state management, dynamic results rendering, batch CSV parsing and progressive processing with progress bar, results aggregation dashboard, and CSV export

Zero frameworks, zero build step, zero dependencies — plain HTML, CSS, and JavaScript only.

### 2. n8n Workflow (`workflow.json`)

The core automation pipeline: Webhook trigger → two parallel HTTP Request nodes (Extraction Agent + Risk Scoring Agent) → Merge node → Code node (JavaScript validation) → IF node (PASS/FAIL branch) → Respond to Webhook. Exported as JSON for version control and portability.

A separate batch workflow processes CSV uploads by looping each row through the same two-agent pipeline and aggregating results.

### 3. LLM Integration

**Model:** Qwen2.5 Coder 7B Instruct via LM Studio REST API on `http://localhost:1234`.

- **Two parallel agents:** Extraction agent extracts client name, document type, date, amount, and summary. Risk scoring agent independently evaluates risk level (Low/Medium/High), risk reason, and whether review is required.
- **Prompt engineering:** Structured prompts instruct the model to return only valid JSON with defined field names.
- **Error handling:** Malformed JSON responses are caught; documents with unparseable responses are flagged for manual review.

### 4. Validation Layer (Code Node — JavaScript)

Rule-based validation with modular architecture:

- Each rule is a named function returning `{ pass: boolean, reason: string }`.
- New rules can be added without restructuring the workflow.
- Output is a structured object: overall `status`, array of failed rules with field names and reasons.

---

## 🛠️ Technologies

| Tool | Purpose | Version |
|------|---------|---------|
| [n8n](https://n8n.io) | Workflow automation engine | 2.8.4 |
| [LM Studio](https://lmstudio.ai) | Local LLM inference server | 0.3+ |
| Qwen2.5 Coder 7B | Structured data extraction & risk assessment | 7B Instruct |
| JavaScript | Front-end logic & validation (Code node) | ES2022 |
| HTML / CSS | Front-end submission interface | — |
| REST API / JSON | Communication between components | — |
| VS Code | Code editing | — |
| Git / GitHub | Version control | — |

---

## 🛡️ Data Protection and Security

All data used in development is **synthetic** — no real client documents or personal data are processed.

- **LM Studio** runs locally — document content is never transmitted outside the machine.
- **No API keys** are required for core functionality — no cloud services, no credentials to manage.
- The **front-end** communicates only with the local n8n instance on `localhost:5678`.
- When running in **local-only mode**, the system eliminates the risk of third-party data exposure entirely.

These design decisions reflect GDPR best practice and the confidentiality requirements of an audit environment.

---

## 📋 Project Context

This project was built as a technical demonstration for the **Digital Transformation Assistant** role at **Hall Morrice**, a UK-based audit and advisory firm.

The role specification called for nine core competencies, all addressed by this system:

| # | Requirement | How This Project Delivers |
|---|-------------|---------------------------|
| 1 | Webhook-driven automation with alerting | n8n Webhook trigger → validation → PASS/FAIL routing |
| 2 | AI-powered document processing with LLMs | Two-stage pipeline: extraction + risk assessment via Qwen2.5 Coder 7B |
| 3 | JSON handling and data transformation | Structured prompts, Code node transforms, API responses |
| 4 | REST API integration with external services | LM Studio REST API, n8n webhooks |
| 5 | Validation logic and data quality checks | Five modular validation rules in JavaScript |
| 6 | End-to-end workflows across multiple platforms | n8n orchestrates full pipeline across local services |
| 7 | Front-end interfaces for non-technical users | Single-page HTML with zero technical prerequisites |
| 8 | GDPR and confidentiality compliance by design | Local AI processing, synthetic data, no external data transmission |
| 9 | Agentic AI within human-supervised workflows | Two AI agents extract + assess; human reviews flagged items |

---

## ✅ Deliverables

- [x] Working n8n workflow exported as `workflow.json`
- [x] Single-page HTML front-end with modular file structure (`frontend/`)
- [x] Extracted CSS and JavaScript in separate files
- [x] Batch CSV processing workflow with dashboard and export
- [x] GitHub repository with full version history
- [x] One-page PDF project summary with workflow diagram and UI screenshots

---

<p align="center">
  <sub>Built as a technical demonstration for a Digital Transformation / AI Automation role in professional services.</sub>
</p>
