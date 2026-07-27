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

![Single document processing interface](docs/screenshots/single-doc.png)
*Single document submission — paste text, receive structured extraction with colour-coded risk badge and validation status.*

![Batch processing dashboard](docs/screenshots/batch-dashboard.png)
*Batch CSV upload — summary cards showing total, pass/fail counts, and risk distribution across the full dataset.*

![Batch results table](docs/screenshots/batch-table.png)
*Results table — per-document breakdown with document type, date, amount, risk level, status, and validation errors. Exportable as CSV.*

![Settings panel](docs/screenshots/settings-panel.png)
*Settings panel — configurable LM Studio endpoint, n8n webhook URL, model name, and concurrent batch size. Persists to localStorage.*

---

## ✨ Features

- 🤖 **AI-Powered Extraction** — LLM extracts client name, document type, date, monetary amount, and summary from unstructured text
- 🚦 **Two-Stage Risk Pipeline** — Parallel AI agent calls: one for data extraction, one for independent risk scoring
- ✅ **Rule-Based Validation** — JavaScript validation rules check field presence, document type, date, and amount
- 🔒 **Privacy-First Design** — Local LLM inference via LM Studio; no document content leaves the machine
- 📋 **Batch CSV Processing** — Upload a CSV, each row flows through the full two-agent pipeline; results aggregated in real time
- 📊 **Batch Dashboard** — Summary cards (total, pass, fail, risk distribution) and results table with CSV export
- ⚙️ **Configurable Settings Panel** — LM Studio endpoint, webhook URL, model name, and **concurrent batch size** saved to localStorage
- 🎛️ **Non-Technical Interface** — Single-page HTML with no frameworks, no build step, no `npm install`
- 🌐 **Webhook-Driven** — Document submission via REST API; workflow triggers instantly on receipt
- 🆔 **Auto Document ID** — Every submission gets a unique `DOC-timestamp` reference
- ⏱️ **Processing Time Display** — Elapsed time shown per document
- 📈 **Parallel Batch Processing** — Configurable concurrent requests (default 4) with live ETA estimation and stop button
- ⚡ **Zero External Dependencies** — No cloud APIs, no paid services — just n8n, LM Studio, and a browser

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
    │ summary — constrained type enum         │
    │                                         │
    ▼                                         ▼
[LM Studio REST API]                    [LM Studio REST API]
Qwen2.5 Coder 7B Instruct               Qwen2.5 Coder 7B Instruct
    │                                         │
    └──────────────────┬──────────────────────┘
                       │          ▲
                       │          │ (Webhook node also feeds
                       │          │  client_name through as
                       ▼          │  Input 3)
              [Merge Node — append, 3 inputs]
              Combines extraction + risk + webhook body
                       │
                       ▼
              [Code Node — JavaScript]
              - Normalises document_type to canonical enum
              - Rule-based risk scoring (overrides AI risk)
              - Modular field validation
              Outputs: status (PASS/FAIL) + error list
                       │
                       ▼
              [IF Node — Branch on Status]
                 │                 │
               PASS              FAIL
                 └────────┬────────┘
                          ▼
              [Respond to Webhook]
              Returns JSON: status, fields, risk, timestamp
```

### Batch Architecture

```
[CSV File Upload]
    │
    │ Frontend parses CSV (UTF-8), sends rows in chunks
    ▼
[N Concurrent Requests — configurable via Settings]
Each row: document_id, client_name, document_text
    │
    ▼ (same two-agent pipeline per row)
Extraction Agent ∥ Risk Scoring Agent → Merge → Validate → Route
    │
    ▼
[Aggregate Results in Frontend]
Real-time progress bar with ETA — stoppable mid-run
    │
    ▼
[Batch Summary Dashboard + Exportable Results Table]
```

---

## 🚀 Quick Start

### Prerequisites

- [n8n](https://n8n.io) v2.8.4+ self-hosted and running
- [LM Studio](https://lmstudio.ai) 0.3+ with Qwen2.5 Coder 7B Instruct loaded
- A modern web browser (Chrome, Firefox, Edge)

No API keys. No cloud accounts. No tunnels.

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MagixIsAvailable/document-intake-automation.git
   cd document-intake-automation
   ```

2. **Start LM Studio and load the model**
   Load `Qwen2.5 Coder 7B Instruct` and confirm the server runs on `http://127.0.0.1:1234`.

3. **Import the n8n workflow**
   Open n8n (`http://localhost:5678`), import `workflow.json`, activate it.

   > **Critical:** The Merge node must have **3 inputs** — extraction agent (Input 1), risk scoring agent (Input 2), and the Webhook node (Input 3). Without Input 3, `client_name` from CSV batch rows will not pass through.

4. **Serve the frontend**
   ```bash
   cd frontend
   python3 -m http.server 8080
   # open http://localhost:8080
   ```

5. **Configure endpoints (if needed)**
   Click the gear icon (top right) and verify the LM Studio URL, n8n webhook URL, model name, and batch size match your local setup.

6. **Test with a sample document**
   Paste a document from [Test Documents](#-test-documents) and click **Process Document**. Results appear in under 15 seconds on mid-range hardware.

---

## ⚙️ Settings Panel

Open via the gear icon (top right). All settings persist to `localStorage`.

| Setting | Default | Description |
|---------|---------|-------------|
| LM Studio Endpoint URL | `http://127.0.0.1:1234/v1/chat/completions` | LM Studio REST API endpoint |
| n8n Webhook URL | `http://localhost:5678/webhook/document-intake` | n8n workflow trigger URL |
| Model Name | `qwen2.5-coder-7b-instruct` | Model identifier sent to LM Studio |
| Concurrent Batch Size | `4` | Documents processed simultaneously |

**Batch size guidance:**

| Value | Recommendation |
|-------|---------------|
| 1–2 | Safest — slower hardware or large documents |
| 4 | Default — good balance on mid-range hardware |
| 6–8 | Faster — monitor LM Studio for queue errors |
| 10+ | Not recommended for local inference |

---

## 📁 Project Structure

```
document-intake-automation/
├── frontend/
│   ├── index.html             # HTML structure
│   ├── css/
│   │   └── styles.css         # Dark theme, animations, responsive layout
│   └── js/
│       └── app.js             # Form handling, batch processing, results rendering
├── workflow.json              # Exported n8n workflow
├── docs/
│   └── screenshots/
│       ├── single-doc.png     # Single document UI screenshot
│       ├── batch-dashboard.png # Batch summary dashboard screenshot
│       ├── batch-table.png    # Batch results table screenshot
│       └── settings-panel.png # Settings panel screenshot
└── README.md
```

---

## 📋 CSV Format

Batch upload requires a CSV with these exact column headers:

```
document_id,client_name,document_text
DOC-2026-0001,Acme Ltd,"Invoice #INV-001 dated 01 July 2026..."
```

- Save as **UTF-8** — not Windows-1252 (Excel default)
- In Excel: **File → Save As → CSV UTF-8 (with BOM)**
- `document_text` is required; `document_id` and `client_name` are optional overrides
- The frontend strips BOM automatically if present

---

## 🧪 Test Documents

### ✅ PASS — Clean Invoice
```
Invoice from Acme Ltd dated 15/07/2026 for £4,500
for consulting services rendered in June 2026.
VAT number: GB123456789. Payment terms: Net 30 days.
```
**Expected:** All fields extracted. Validation: **PASS**. Risk: **LOW**.

### ❌ FAIL — Missing Fields
```
Letter regarding the quarterly review.
No date, no amount, incomplete client reference.
```
**Expected:** Partial extraction. Validation: **FAIL** (missing date, amount). Risk: **MEDIUM**.

### 🔴 HIGH RISK — Suspicious Document
```
Invoice from XYZ Corp for miscellaneous services.
Amount: £85,000. Cash payment only. No VAT number.
Payment required within 48 hours. First transaction with vendor.
```
**Expected:** Extraction succeeds. Validation: **PASS** or **FAIL** depending on date. Risk: **HIGH** (cash, no VAT, 48hr, miscellaneous, first transaction, >£50k).

---

## 🧱 Risk Scoring Logic

Risk is rule-based in the n8n Code node — not determined by the AI. This eliminates hallucination risk on compliance decisions.

**HIGH risk triggers (any one sufficient):**
- Amount > £50,000 (absolute value, handles negative debits)
- Cash payment mentioned
- Miscellaneous or vague description
- 48-hour or 24-hour payment demand
- No VAT number
- First transaction with vendor
- No supporting documentation
- Settlement / out-of-court settlement
- Incomplete document / critical pages missing

**Document type enum** (enforced in extraction prompt — model must return one of):
`invoice, statement, letter, form, report, receipt, contract, memo, correspondence, internal_notes, payment voucher, payment voucher and receipt, monthly account statement, settlement deed, out-of-court settlement deed, unknown`

---

## 🔐 Why Local AI

| Concern | Local AI Approach | Benefit |
|---------|-------------------|---------|
| **Data confidentiality** | Document content never transmitted externally | Zero third-party exposure |
| **GDPR compliance** | All data stays on-premises | Regulatory compliance by design |
| **Audit trail integrity** | No API logging or training data risk | Chain of custody preserved |
| **Cost predictability** | No usage billing | Unlimited documents at fixed hardware cost |
| **Offline capability** | No internet required | Resilient to network outages |

---

## 📋 Project Context

Built as a technical demonstration for the **Digital Transformation Assistant** role at **Hall Morrice**, a UK-based audit and advisory firm.

| # | Requirement | How This Project Delivers |
|---|-------------|---------------------------|
| 1 | Webhook-driven automation | n8n Webhook → validation → PASS/FAIL routing |
| 2 | AI-powered document processing | Two-stage pipeline: extraction + risk via Qwen2.5 Coder 7B |
| 3 | JSON handling and data transformation | Structured prompts, Code node transforms, API responses |
| 4 | REST API integration | LM Studio REST API, n8n webhooks |
| 5 | Validation logic and data quality | Modular validation rules in JavaScript |
| 6 | End-to-end multi-platform workflows | n8n orchestrates full pipeline across local services |
| 7 | Non-technical user interfaces | Single-page HTML, zero technical prerequisites |
| 8 | GDPR and confidentiality compliance | Local AI, synthetic data, no external transmission |
| 9 | Agentic AI with human oversight | Two AI agents extract + assess; humans review flagged items |

---

## ✅ Deliverables

- [x] Working n8n workflow exported as `workflow.json`
- [x] Single-page HTML frontend (`frontend/`)
- [x] Batch CSV processing with live dashboard and export
- [x] Configurable settings panel (endpoint, model, batch size)
- [x] GitHub repository with full version history
- [ ] Screenshots in `docs/screenshots/` — add after final UI pass
- [ ] One-page PDF project summary with workflow diagram

---

<p align="center">
  <sub>Built as a technical demonstration for a Digital Transformation / AI Automation role in professional services.</sub>
</p>