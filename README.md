Automated Client Document Intake and Compliance Check System

ONE LINE SUMMARY
An end-to-end automation workflow that ingests client documents via webhook, uses an LLM to extract structured data, validates it against business rules, logs results to a spreadsheet, and triggers alerts on exceptions — built with n8n, Gemini API, Python, and JavaScript.

PROBLEM STATEMENT
Audit and advisory firms receive large volumes of client documents: invoices, engagement letters, financial statements, compliance forms. Processing these manually is slow, error-prone, and creates bottlenecks. Staff spend time extracting data that could be extracted automatically, and exceptions that require human review are often caught late. This project automates the intake, extraction, validation, and triage of incoming documents so that only flagged exceptions require human attention.

SOLUTION OVERVIEW
A webhook-triggered n8n workflow receives a document payload, sends the content to the Gemini API for structured data extraction, runs the extracted data through a validation layer, logs every result to Google Sheets, and sends an email alert for any document that fails validation. A simple HTML front-end allows a user to submit a document without needing technical knowledge of the underlying system.

SYSTEM ARCHITECTURE

[HTML Front-End]
User pastes document text and clicks Submit
        |
        | HTTP POST (JSON payload)
        v
[n8n Webhook Trigger]
Receives document content and metadata
        |
        v
[Node 1: Gemini API — Data Extraction]
Sends document to Gemini 1.5 Flash via REST API
Prompt instructs Gemini to extract:
  - Client name
  - Document type (invoice, statement, letter, form)
  - Date
  - Monetary amount (if present)
  - Summary (one sentence)
Returns structured JSON
        |
        v
[Node 2: Code Node — Data Validation]
JavaScript validation rules:
  - Client name must be present and non-empty
  - Document type must be one of the recognised types
  - Date must be valid and not in the future
  - Amount must be a positive number if document type is invoice
  - Summary must be present
Outputs: status (PASS or FAIL), field-level error list
        |
        v
[Node 3: IF Node — Branch on status]
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
  status, extracted data, validation result

COMPONENTS

1. HTML Front-End (index.html)
Single page. Text area for document content. Input field for client name override. Submit button that fires a POST request to the ngrok webhook URL. Response panel that displays the extraction and validation result returned by n8n. Styled with basic CSS. No frameworks — plain HTML, CSS, JavaScript only.

2. n8n Workflow (workflow.json)
Seven nodes. Exported as JSON from n8n for version control and portability. Hosted locally, exposed via ngrok tunnel during development. Designed to be deployable to n8n Cloud or self-hosted server in production.

3. Gemini API Integration
Model: gemini-1.5-flash (fast, cost-efficient for structured extraction tasks). Authentication: API key passed as query parameter. Prompt engineering: structured prompt instructing Gemini to return only valid JSON with defined field names. Error handling: if Gemini returns malformed JSON, workflow catches the error and flags the document for manual review.

4. Validation Layer (Code Node — JavaScript)
Rule-based validation. Each rule is a named function returning pass or fail with a reason. Rules are modular so new ones can be added without restructuring the workflow. Output is a structured object: overall status, array of failed rules with field names and reasons.

5. Google Sheets Log
One sheet: Document Intake Log. Columns: Timestamp, Client Name, Document Type, Date, Amount, Summary, Status, Validation Errors. Every document processed creates a new row regardless of pass or fail. Provides a full audit trail.

6. Email Alert
Triggered only on FAIL. Subject line: Document Intake Alert, [Client Name], [Document Type]. Body: plain text listing each validation error with the field name and reason. Sent via Gmail node using OAuth2 authentication.

DATA PROTECTION AND SECURITY
All data used in development is synthetic — no real client documents or personal data are processed. The API key is stored as an n8n credential, not hardcoded in any node. The ngrok tunnel is used for development only — in a production deployment the workflow would run behind an authenticated endpoint. The Google Sheet is private and accessible only to the authenticated Google account. These design decisions reflect GDPR best practice and the confidentiality requirements of an audit environment.

TECHNOLOGIES USED

| Tool | Purpose |
| n8n | Workflow automation engine |
| Gemini API (gemini-1.5-flash) | LLM for document data extraction |
| JavaScript (Code node) | Validation logic |
| Google Sheets | Audit log and reporting |
| Gmail | Alert delivery |
| HTML, CSS, JavaScript | Front-end submission interface |
| ngrok | Local tunnel for webhook development |
| VS Code | Code editing |
| Git/GitHub | Version control for HTML front-end and workflow JSON |
| Obsidian | Project documentation |
| Python | Supporting scripts if needed |

WHAT THIS DEMONSTRATES

Against the Hall Morrice JD specifically:

Webhook-driven automation that monitors business data and delivers alerts: covered by the webhook trigger and email alert node
AI-powered document processing with LLM: covered by Gemini API extraction node
JSON handling and data transformation: covered throughout
REST API integration: covered by Gemini API HTTP Request node
Validation logic and data quality checks: covered by Code node
End-to-end workflow connecting multiple systems: webhook, Gemini API, Google Sheets, Gmail
Front-end interface for non-technical users: covered by HTML page
GDPR and confidentiality compliance by design: documented in architecture decisions
Agentic AI framing: Gemini acts as an autonomous extraction agent within a human-supervised workflow

DELIVERABLES FOR MONDAY

Working n8n workflow exported as workflow.json
HTML front-end (index.html, style.css, script.js)
GitHub repository containing both
One-page PDF project summary with screenshots of the workflow, the front-end, a successful result, and a flagged result
Obsidian documentation exported as PDF if needed
