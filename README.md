<p align="center">
  <img src="https://img.shields.io/badge/Built%20With-n8n-18b52d?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n">
  <img src="https://img.shields.io/badge/LM%20Studio-3b82f6?style=for-the-badge&logo=lmstudio&logoColor=white" alt="LM Studio">
  <img src="https://img.shields.io/badge/Model-Gemma%204%2012B-8b5cf6?style=for-the-badge" alt="Gemma 4 12B">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML">
</p>

# Automated Client Document Intake and Compliance Check System

An end-to-end automation workflow that ingests client documents via webhook, uses an LLM to extract structured data, validates it against business rules, logs results to a spreadsheet, and triggers alerts on exceptions.

> **Two-stage AI pipeline — extraction and risk assessment — running entirely on local hardware via LM Studio + Gemma 4 12B. No document content is transmitted to external services.**

---

## Demo

![Demo Screenshot](docs/screenshots/demo.png)

*The single-page submission interface: paste a document, click Process, and receive structured extraction results with colour-coded risk assessment and validation status.*

---

## Features

- 🤖 **AI-Powered Extraction** — LLM extracts client name, document type, date, monetary amount, and summary from unstructured text
- ✅ **Rule-Based Validation** — Modular validation rules check field presence, data types, date validity, and amount positivity
- 🚦 **Two-Stage Risk Pipeline** — Separate extraction and risk assessment stages with independent AI agent calls
- 📊 **Audit Trail** — Every processed document is logged to Google Sheets with full metadata regardless of outcome
- 📧 **Exception Alerting** — Email notifications triggered automatically for any document that fails validation
- 🔒 **Privacy-First Design** — Local LLM inference via LM Studio ensures no document content leaves the machine
- 🎛️ **Non-Technical Interface** — Single-page HTML front-end with no dependencies; usable by non-technical staff
- 🌐 **Webhook-Driven** — Document submission via REST API; workflow triggers instantly on receipt

---

## Architecture

```
[HTML Front-End]
User pastes document text and clicks Submit
        |
        | HTTP POST (JSON payload)
        v
[n8n Webhook Trigger]
Receives document content and metadata
        |
        v
[Node 1: LLM — Data Extraction]
Sends document to Gemini 1.5 Flash / Gemma 4 12B via REST API
Prompt instructs the model to extract:
  - Client name
  - Document type (invoice, statement, letter, form)
  - Date
  - Monetary amount (if present)
  - Summary (one sentence)
Returns structured JSON
        |
        v
[Node 2: LLM — Risk Assessment]
Independent second pass evaluates:
  - Risk level (low / medium / high)
  - Risk reason (natural language explanation)
  - Requires review flag
        |
        v
[Node 3: Code Node — Data Validation]
JavaScript validation rules:
  - Client name must be present and non-empty
  - Document type must be one of the recognised types
  - Date must be valid and not in the future
  - Amount must be a positive number if document type is invoice
  - Summary must be present
Outputs: status (PASS or FAIL), field-level error list
        |
        v
[Node 4: IF Node — Branch on status]
        |                    |
      PASS                 FAIL
        |                    |
        v                    v
[Google Sheets:         [Google Sheets:
 Log row — Approved]     Log row — Flagged]
                             |
                             v
                    [Email Alert Node]
                    Sends alert email:
                    Subject: Document flagged
                    Body: client name, document type,
                    list of validation errors, timestamp
        |
        v
[Response Node]
Returns JSON confirmation to front-end:
  status, extracted data, validation result, risk assessment
```

---

## Quick Start

### Prerequisites

- [n8n](https://n8n.io) installed and running (local, self-hosted, or cloud)
- [LM Studio](https://lmstudio.ai) with Gemma 4 12B (or Gemini API key for cloud-based extraction)
- [ngrok](https://ngrok.com) (for local development webhook exposure)
- A Google Cloud project with Sheets and Gmail APIs enabled

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MagixIsAvailable/document-intake-automation.git
   cd document-intake-automation
   ```

2. **Start LM Studio and load the model**
   - Launch LM Studio and load `gemma-4-12b-it`
   - Confirm the local server is running on `http://localhost:1234`

3. **Import the n8n workflow**
   - Open n8n and import `workflow.json`
   - Configure credentials: Google Sheets OAuth2, Gmail OAuth2, and LLM API endpoint

4. **Expose the webhook (development only)**
   ```bash
   ngrok http 5678
   ```
   - Copy the ngrok forwarding URL and update the Webhook node in n8n

5. **Open the front-end**
   - Open `index.html` in any browser
   - The page sends POST requests to `http://localhost:5678/webhook/document-intake`

6. **Test with a sample document**
   - Paste a test invoice from the [Test Documents](#test-documents) section
   - Click "Process Document" and verify the structured response

---

## Project Structure

```
document-intake-automation/
├── index.html                 # Single-page submission interface
├── workflow.json              # Exported n8n workflow (7 nodes)
├── docs/
│   └── screenshots/
│       └── demo.png           # Application screenshot
└── README.md
```

---

## Test Documents

The system handles three categories of test input:

### 1. PASS — Clean Invoice
```
Invoice from Acme Ltd dated 15/07/2026 for £4,500
for consulting services rendered in June 2026.
```
**Expected result:** All fields extracted correctly. Validation status: **PASS**. Risk level: **Low**. Logged to Sheets without alert.

### 2. FAIL — Missing Required Fields
```
Letter regarding the quarterly review.
No date, no amount, incomplete client reference.
```
**Expected result:** Extraction returns partial data. Validation status: **FAIL** (missing client name, missing date, missing amount). Risk level: **Medium**. Email alert triggered.

### 3. HIGH RISK — Suspicious Amount
```
Invoice from XYZ Corp dated 01/01/2027 for £500,000
for "miscellaneous services" with no further detail.
```
**Expected result:** Extraction succeeds but date is in the future and amount is unusually high with vague description. Validation status: **FAIL** (future date). Risk level: **High**. Flagged for immediate review.

---

## Why Local AI

This project runs LLM inference entirely on local hardware via LM Studio + Gemma 4 12B. This architecture decision was deliberate:

| Concern | Local AI Approach |
|---------|-------------------|
| **Data confidentiality** | Document content never transmitted to external APIs |
| **GDPR compliance** | No third-party data processing; all data stays on-premises |
| **Audit trail integrity** | No risk of data leakage through API logging or training |
| **Client trust** | Audit firms handle sensitive financial data — local processing is non-negotiable |
| **Cost predictability** | No API usage billing; fixed hardware cost |
| **Offline capability** | Works without internet connectivity |

The system also supports Gemini 1.5 Flash as an alternative extraction backend when cloud processing is acceptable for non-sensitive workloads.

---

## Components

### 1. HTML Front-End (`index.html`)
Single-page application. Text area for document content. Input field for client name override. Submit button that fires a POST request to the n8n webhook URL. Response panel displaying extraction, validation, and risk assessment results. Dark-themed professional UI with animated gradient background, sidebar workflow timeline, and colour-coded status badges. No frameworks — plain HTML, CSS, and JavaScript only.

### 2. n8n Workflow (`workflow.json`)
Seven nodes exported as JSON from n8n for version control and portability. Hosted locally and exposed via ngrok tunnel during development. Designed to be deployable to n8n Cloud or self-hosted server in production.

### 3. LLM Integration
**Primary:** LM Studio running Gemma 4 12B (local, private).  
**Alternative:** Gemini 1.5 Flash (fast, cost-efficient for structured extraction tasks when cloud processing is acceptable).

Authentication: API key passed as query parameter (Gemini). Prompt engineering: structured prompt instructing the model to return only valid JSON with defined field names. Error handling: if the model returns malformed JSON, the workflow catches the error and flags the document for manual review.

### 4. Validation Layer (Code Node — JavaScript)
Rule-based validation. Each rule is a named function returning pass or fail with a reason. Rules are modular so new ones can be added without restructuring the workflow. Output is a structured object: overall status, array of failed rules with field names and reasons.

### 5. Google Sheets Log
One sheet: **Document Intake Log**. Columns: Timestamp, Client Name, Document Type, Date, Amount, Risk Level, Summary, Status, Validation Errors. Every document processed creates a new row regardless of pass or fail. Provides a full audit trail.

### 6. Email Alert
Triggered only on FAIL. Subject line: `Document Intake Alert — [Client Name] — [Document Type]`. Body: plain text listing each validation error with the field name and reason. Sent via Gmail node using OAuth2 authentication.

---

## Technologies

| Tool | Purpose | Version |
|------|---------|---------|
| [n8n](https://n8n.io) | Workflow automation engine | Latest |
| [LM Studio](https://lmstudio.ai) | Local LLM inference server | 0.3+ |
| Gemma 4 12B | Structured data extraction & risk assessment | 12B Instruct |
| Gemini 1.5 Flash | Alternative cloud-based extraction | `gemini-1.5-flash` |
| JavaScript | Validation logic (Code node) | ES2022 |
| Google Sheets | Audit log and reporting | API v4 |
| Gmail | Alert delivery | API v1 |
| HTML / CSS / JS | Front-end submission interface | — |
| [ngrok](https://ngrok.com) | Local tunnel for webhook development | Latest |
| VS Code | Code editing | — |
| Git / GitHub | Version control | — |
| Python | Supporting scripts | 3.11+ |

---

## Data Protection and Security

All data used in development is synthetic — no real client documents or personal data are processed. API keys are stored as n8n credentials, never hardcoded in any node. The ngrok tunnel is used for development only — in a production deployment the workflow runs behind an authenticated endpoint. The Google Sheet is private and accessible only to the authenticated Google account. These design decisions reflect GDPR best practice and the confidentiality requirements of an audit environment.

When running in local-only mode with LM Studio, document content is never transmitted outside the machine — eliminating the risk of third-party data exposure entirely.

---

## Project Context

This project was built as a technical demonstration for the **Digital Transformation Assistant** role at **Hall Morrice**, a UK-based audit and advisory firm. The role specification called for:

- Webhook-driven automation that monitors business data and delivers alerts
- AI-powered document processing with LLM integration
- JSON handling and data transformation across systems
- REST API integration with external services
- Validation logic and data quality checks
- End-to-end workflows connecting multiple platforms
- Front-end interfaces accessible to non-technical users
- GDPR and confidentiality compliance by design
- Agentic AI framing within human-supervised workflows

This system addresses all nine requirements in a single, demonstrable workflow — combining n8n automation, LLM-powered extraction, rule-based validation, spreadsheet logging, email alerting, and a clean HTML front-end suitable for audit staff with no technical background.

---

## Deliverables

- [x] Working n8n workflow exported as `workflow.json`
- [x] Single-page HTML front-end (`index.html`)
- [x] GitHub repository with full version history
- [ ] One-page PDF project summary with workflow and UI screenshots
- [ ] Obsidian documentation exported as PDF (if required)


