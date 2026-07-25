<p align="center">
  <img src="https://img.shields.io/badge/Built%20With-n8n-18b52d?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n">
  <img src="https://img.shields.io/badge/LM%20Studio-3b82f6?style=for-the-badge&logo=lmstudio&logoColor=white" alt="LM Studio">
  <img src="https://img.shields.io/badge/Model-Gemma%204%2012B-8b5cf6?style=for-the-badge" alt="Gemma 4 12B">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML">
  <img src="https://img.shields.io/badge/Gemini%20API-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini API">
</p>

# Automated Client Document Intake and Compliance Check System

An end-to-end automation workflow that ingests client documents via webhook, uses an LLM to extract structured data, validates it against business rules, logs results to a spreadsheet, and triggers alerts on exceptions.

> **Two-stage AI pipeline — extraction and risk assessment — running entirely on local hardware via LM Studio + Gemma 4 12B. No document content is transmitted to external services.**

---

## 🖼️ Demo

![Demo Screenshot](docs/screenshots/demo.png)

*The single-page submission interface: paste a document, click Process, and receive structured extraction results with colour-coded risk assessment and validation status.*

---

## ✨ Features

- 🤖 **AI-Powered Extraction** — LLM extracts client name, document type, date, monetary amount, and summary from unstructured text
- ✅ **Rule-Based Validation** — Modular validation rules check field presence, data types, date validity, and amount positivity
- 🚦 **Two-Stage Risk Pipeline** — Separate extraction and risk assessment stages with independent AI agent calls
- 📊 **Audit Trail** — Every processed document is logged to Google Sheets with full metadata regardless of outcome
- 📧 **Exception Alerting** — Email notifications triggered automatically for any document that fails validation
- 🔒 **Privacy-First Design** — Local LLM inference via LM Studio ensures no document content leaves the machine
- 🎛️ **Non-Technical Interface** — Single-page HTML front-end with no frameworks, no build step, no `npm install`
- 🌐 **Webhook-Driven** — Document submission via REST API; workflow triggers instantly on receipt
- 🧩 **Modular Validation** — Each rule is an independent function; add new rules without restructuring the pipeline
- 🔄 **Dual Backend Support** — Supports both local LM Studio (Gemma 4 12B) and Gemini 1.5 Flash for cloud processing

---

## 📐 Architecture

```
[HTML Front-End]
User pastes document text → clicks Process Document
        │
        │ HTTP POST (JSON payload)
        ▼
[n8n Webhook Trigger]
Receives document_text + client_name
        │
        ▼
[Node 1: LLM — Data Extraction]
Sends document to LLM via REST API (LM Studio or Gemini)
Structured prompt instructs the model to extract:
  ├─ Client name
  ├─ Document type (Invoice / Statement / Letter / Form / Other)
  ├─ Document date
  ├─ Monetary amount (if present)
  └─ One-sentence summary
Returns structured JSON
        │
        ▼
[Node 2: LLM — Risk Assessment]
Independent second pass evaluates:
  ├─ Risk level (Low / Medium / High)
  ├─ Risk reason (natural language explanation)
  └─ Requires review flag (Yes / No)
        │
        ▼
[Node 3: Code Node — Data Validation]
JavaScript validation rules:
  ├─ Client name must be present and non-empty
  ├─ Document type must be one of the recognised types
  ├─ Date must be valid and not in the future
  ├─ Amount must be a positive number (if document type is Invoice)
  └─ Summary must be present
Outputs: status (PASS / FAIL) + field-level error list
        │
        ▼
[Node 4: IF Node — Branch on Status]
        │                    │
      PASS                 FAIL
        │                    │
        ▼                    ▼
[Google Sheets:         [Google Sheets:
 Log → Approved]         Log → Flagged]
                              │
                              ▼
                     [Email Alert Node]
                     Sends alert via Gmail:
                     Subject: "Document Flagged — {Client} — {Type}"
                     Body: error list + timestamp
        │
        ▼
[Response Node]
Returns JSON to front-end:
  status, extracted fields, validation result, risk assessment
```

---

## 🚀 Quick Start

### Prerequisites

- [n8n](https://n8n.io) installed and running (local, self-hosted, or cloud)
- [LM Studio](https://lmstudio.ai) with Gemma 4 12B loaded (or Gemini API key for cloud extraction)
- [ngrok](https://ngrok.com) (for local development webhook exposure)
- A Google Cloud project with Sheets and Gmail APIs enabled

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MagixIsAvailable/document-intake-automation.git
   cd document-intake-automation
   ```

2. **Start LM Studio and load the model**
   Launch LM Studio, load `gemma-4-12b-it`, and confirm the local server runs on `http://localhost:1234`.

3. **Import the n8n workflow**
   Open n8n, import `workflow.json`, and configure credentials: Google Sheets OAuth2, Gmail OAuth2, and the LLM API endpoint.

4. **Expose the webhook (development only)**
   ```bash
   ngrok http 5678
   ```
   Copy the ngrok forwarding URL and update the Webhook node in n8n.

5. **Open the front-end**
   Open `frontend/index.html` in any browser. The page sends POST requests to `http://localhost:5678/webhook/document-intake`.

6. **Test with a sample document**
   Paste a test document from the [Test Documents](#-test-documents) section and click **Process Document**.

---

## 📁 Project Structure

```
document-intake-automation/
├── index.html                 # Original single-file version (standalone)
├── frontend/
│   ├── index.html             # HTML structure only (links to CSS + JS)
│   ├── css/
│   │   └── styles.css         # All styles extracted
│   └── js/
│       └── app.js             # All JavaScript extracted
├── workflow.json              # Exported n8n workflow (7 nodes)
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
**Expected:** All fields extracted correctly. Validation: **PASS**. Risk: **Low**. Logged to Sheets without alert.

### 2. ❌ FAIL — Missing Required Fields
```
Letter regarding the quarterly review.
No date, no amount, incomplete client reference.
```
**Expected:** Partial extraction. Validation: **FAIL** (missing client name, date, amount). Risk: **Medium**. Email alert triggered.

### 3. 🔴 HIGH RISK — Suspicious Amount
```
Invoice from XYZ Corp dated 01/01/2027 for £500,000
for "miscellaneous services" with no further detail.
```
**Expected:** Extraction succeeds but future date and unusually high amount with vague description. Validation: **FAIL** (future date). Risk: **High**. Flagged for immediate review.

---

## 🔐 Why Local AI

This project runs LLM inference entirely on local hardware via LM Studio + Gemma 4 12B. This decision was driven by the confidentiality requirements of professional services:

| Concern | Local AI Approach | Benefit |
|---------|-------------------|---------|
| **Data confidentiality** | Document content never transmitted to external APIs | Zero risk of third-party data exposure |
| **GDPR compliance** | No third-party data processing; all data stays on-premises | Regulatory compliance by design |
| **Audit trail integrity** | No risk of data leakage through API logging or training | Chain of custody preserved |
| **Client trust** | Audit firms handle sensitive financial data | Local processing is non-negotiable |
| **Cost predictability** | No API usage billing; fixed hardware cost | Unlimited documents at no additional cost |
| **Offline capability** | Works without internet connectivity | Resilient to network outages |

The system also supports **Gemini 1.5 Flash** as an alternative extraction backend when cloud processing is acceptable for non-sensitive workloads.

---

## 🧱 Components

### 1. HTML Front-End (`frontend/index.html`)

Single-page application with a dark-themed professional UI. Features include:

- **Text area** for pasting document content
- **Input field** for optional client name override
- **Submit button** that fires a POST request to the n8n webhook
- **Animated gradient background** with pulsing accents
- **Sidebar workflow timeline** that animates through processing stages
- **Stat cards** displaying key metrics (2 AI Agents, Never Leaves Machine, ~15s Processing)
- **Results panel** with slide-in animation, colour-coded risk badges, and structured field cards
- **Loading spinner** and button disabled state during processing
- **Connection error panel** with clear troubleshooting guidance
- **Responsive design** — adapts from sidebar layout to stacked layout on smaller screens

Zero frameworks, zero build step, zero dependencies — plain HTML, CSS, and JavaScript only.

### 2. n8n Workflow (`workflow.json`)

Seven nodes exported as JSON from n8n for version control and portability. Hosted locally and exposed via ngrok tunnel during development. Designed to be deployable to n8n Cloud or self-hosted server in production.

### 3. LLM Integration

**Primary:** LM Studio running Gemma 4 12B (local, private).  
**Alternative:** Gemini 1.5 Flash (fast, cost-efficient for structured extraction when cloud is acceptable).

- **Authentication:** API key passed as query parameter (Gemini); local port (LM Studio).
- **Prompt engineering:** Structured prompt instructing the model to return only valid JSON with defined field names.
- **Error handling:** Malformed JSON responses are caught and the document is flagged for manual review.

### 4. Validation Layer (Code Node — JavaScript)

Rule-based validation with modular architecture:

- Each rule is a named function returning `{ pass: boolean, reason: string }`.
- New rules can be added without restructuring the workflow.
- Output is a structured object: overall `status`, array of failed rules with field names and reasons.

### 5. Google Sheets Log

**Sheet:** Document Intake Log  
**Columns:** Timestamp, Client Name, Document Type, Date, Amount, Risk Level, Summary, Status, Validation Errors  
**Behaviour:** Every document processed creates a new row regardless of pass/fail — providing a full audit trail.

### 6. Email Alert

Triggered only on **FAIL**.  
**Subject:** `Document Intake Alert — {Client Name} — {Document Type}`  
**Body:** Plain text listing each validation error with field name and reason.  
Sent via Gmail node using OAuth2 authentication.

---

## 🛠️ Technologies

| Tool | Purpose | Version |
|------|---------|---------|
| [n8n](https://n8n.io) | Workflow automation engine | Latest |
| [LM Studio](https://lmstudio.ai) | Local LLM inference server | 0.3+ |
| Gemma 4 12B | Structured data extraction & risk assessment | 12B Instruct |
| Gemini 1.5 Flash | Alternative cloud-based extraction | `gemini-1.5-flash` |
| JavaScript | Front-end logic & validation (Code node) | ES2022 |
| Google Sheets | Audit log and reporting | API v4 |
| Gmail | Alert delivery | API v1 |
| HTML / CSS / JS | Front-end submission interface | — |
| [ngrok](https://ngrok.com) | Local tunnel for webhook development | Latest |
| VS Code | Code editing | — |
| Git / GitHub | Version control | — |
| Python | Supporting scripts | 3.11+ |

---

## 🛡️ Data Protection and Security

All data used in development is **synthetic** — no real client documents or personal data are processed.

- **API keys** are stored as n8n credentials, never hardcoded in any node.
- The **ngrok tunnel** is used for development only — in production the workflow runs behind an authenticated endpoint.
- The **Google Sheet** is private and accessible only to the authenticated Google account.
- When running in **local-only mode** with LM Studio, document content is never transmitted outside the machine — eliminating the risk of third-party data exposure entirely.

These design decisions reflect GDPR best practice and the confidentiality requirements of an audit environment.

---

## 📋 Project Context

This project was built as a technical demonstration for the **Digital Transformation Assistant** role at **Hall Morrice**, a UK-based audit and advisory firm.

The role specification called for nine core competencies, all addressed by this system:

| # | Requirement | How This Project Delivers |
|---|-------------|---------------------------|
| 1 | Webhook-driven automation with alerting | n8n Webhook trigger → validation → Gmail alerts |
| 2 | AI-powered document processing with LLMs | Two-stage pipeline: extraction + risk assessment |
| 3 | JSON handling and data transformation | Structured prompts, Code node transforms, API responses |
| 4 | REST API integration with external services | Google Sheets API, Gmail API, Gemini API, LM Studio API |
| 5 | Validation logic and data quality checks | Five modular validation rules in JavaScript |
| 6 | End-to-end workflows across multiple platforms | n8n orchestrates 7 nodes across 5 services |
| 7 | Front-end interfaces for non-technical users | Single-page HTML with zero technical prerequisites |
| 8 | GDPR and confidentiality compliance by design | Local AI processing, synthetic data, encrypted credentials |
| 9 | Agentic AI within human-supervised workflows | Two AI agents extract + assess; human reviews flagged items |

---

## ✅ Deliverables

- [x] Working n8n workflow exported as `workflow.json`
- [x] Single-page HTML front-end with modular file structure (`frontend/`)
- [x] Extracted CSS and JavaScript in separate files
- [x] GitHub repository with full version history
- [ ] One-page PDF project summary with workflow diagram and UI screenshots
- [ ] Obsidian documentation exported as PDF (if required)

---

<p align="center">
  <sub>Built for Hall Morrice — Digital Transformation Assistant role application</sub>
</p>
