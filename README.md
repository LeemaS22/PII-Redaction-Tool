# RedactX: Intelligent PII Detection & Document Privacy Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/Runtime-Node.js%20v20%2B-green.svg)](https://nodejs.org)
[![Framework](https://img.shields.io/badge/Frontend-React%2019-sky.svg)](https://react.dev)
[![Engine](https://img.shields.io/badge/Detection-Regex%20%2B%20Compromise%20NLP-purple.svg)](https://github.com/spencermountain/compromise)

---

## 1. Project Title
**RedactX** — Intelligent PII Detection & Document Privacy Platform

---

## 2. Project Description
RedactX is an enterprise-grade document privacy engineering platform designed to identify, review, and safely redact Personally Identifiable Information (PII) across multi-format documents (PDF, DOCX, TXT). It combines deterministic regex rule engines with local Natural Language Processing (NLP) Named Entity Recognition (NER), providing a human-in-the-loop review interface, permanent redaction sanitization, an immutable audit log, and real-time MongoDB analytics.

---

## 3. Problem Statement
Modern enterprises, healthcare providers, and legal institutions process massive volumes of unstructured documents containing high-risk sensitive data (Aadhaar IDs, credit card numbers, personal addresses, emails, phone numbers, and full names). Accidental leakage or partial redactions (such as drawing visual black rectangles over text while leaving underlying text streams readable) lead to catastrophic privacy violations and regulatory penalties under GDPR, HIPAA, and DPDP. 

RedactX solves this by:
1. Extracting glyph-aware raw text from multi-page PDFs, Word documents, and text files.
2. Detecting both structured PII and contextual natural entities with zero external network reliance.
3. Enabling granular human-in-the-loop decisions (`REDACT` vs `KEEP`).
4. Rebuilding clean, sanitized document binaries where sensitive characters are genuinely removed.
5. Tracking every stage in an immutable audit ledger without exposing sensitive raw values.

---

## 4. Main Features
- **Multi-Format Ingestion**: Supports `.pdf`, `.docx`, `.txt`, `.md`, `.csv`, and `.rtf` files up to 50 MB.
- **Unified Detection Pipeline**:
  - **Structured PII**: Email, phone numbers (international/Indian formats), 12-digit Aadhaar numbers, credit/debit cards (with Luhn checksum validation), bank accounts, IP addresses, dates of birth, and passport numbers.
  - **Contextual NLP NER**: Person names and physical addresses using Compromise NLP and contextual boundary markers.
- **Configurable Scan Options**: Granular toggles allowing users to select exact entity categories to detect.
- **Human Review & Decision Engine**: Interactive interface supporting individual entity decisions (`REDACT` or `KEEP`), batch operations ("Redact All", "Keep All"), and state persistence.
- **True Binary Redaction**:
  - **PDF**: Reconstructs a clean vector PDF without the original sensitive text stream, ensuring no visual overlay can be removed to expose underlying text.
  - **Word (DOCX)**: Re-encodes OpenXML document XML runs without sensitive character strings.
  - **Text (TXT)**: Exact span substitution from right-to-left offsets.
- **Multiple Redaction Strategies**:
  - `STANDARD`: Replaces sensitive values with `[REDACTED]`.
  - `MASK`: Replaces values with type-aware partial masks (e.g. `**** **** 1234`, `j****@domain.com`).
  - `STRICT`: Complete uniform block removal.
- **Immutable Audit Trail**: Full lifecycle tracking (`DOCUMENT_UPLOADED`, `PII_SCAN_STARTED`, `PII_SCAN_COMPLETED`, `PII_REVIEW_COMPLETED`, `REDACTION_COMPLETED`, `PROTECTED_DOCUMENT_DOWNLOADED`) with zero raw PII persistence in logs.
- **Live Dashboard Analytics**: Dynamic computation of document counts, PII category shares, sanitization rates, and chronological activity feeds.

---

## 5. Technology Stack
- **Frontend**: React 19, React Router v7, Tailwind CSS v4, Lucide React icons, Framer Motion, Recharts.
- **Backend**: Node.js, Express.js 4, Multer (memory storage with 50 MB limits).
- **Text & PDF Processing**: `pdf-parse` (v2 class-based parser), `pdf-lib` (pure vector PDF synthesis), `mammoth` (DOCX raw extraction), `adm-zip` (DOCX OpenXML re-packaging).
- **NLP & NER**: `compromise` (offline local rule-based entity extraction).
- **Database & Storage**: MongoDB / Mongoose collection architecture with in-memory persistence and zero external downtime.
- **Build & Development**: Vite 8, TypeScript 5, `tsx` runner.

---

## 6. System Architecture

```
   [ Client Browser ]
           │
           ▼
    [ Vite / React ]  <─── SPA Navigation & UI State
           │
           │  REST API Calls (/api/*)
           ▼
   [ Express.js Server ] (server.ts)
     ├── Middleware: Multer (50 MB limit, fileFilter)
     ├── API Router: documentRoutes.ts & dashboardRoutes.ts
     │
     ├── Ingestion & Extraction Layer:
     │     └── TextExtractor (PDFParse, Mammoth, UTF-8 decoders)
     │
     ├── Detection Service:
     │     ├── PiiDetector (Regex, Luhn algorithm, Aadhaar Verhoeff)
     │     └── NlpDetector (Compromise local NER, Address matcher)
     │
     ├── Review & State Layer:
     │     └── DocumentController (REDACT vs. KEEP verification)
     │
     ├── Safe Redaction Pipeline:
     │     ├── PdfRedactor (pdf-lib stream regeneration)
     │     ├── DocxRedactor (adm-zip OpenXML sanitizer)
     │     └── TxtRedactor (descending span replacement)
     │
     └── Persistence & Audit:
           ├── DocumentModel & DetectionModel (MongoDB-compatible)
           └── AuditLogModel (Sanitized audit events)
```

---

## 7. Project Structure

```
redactx/
├── server.ts                       # Express server entry point & middleware mounting
├── vite.config.ts                  # Vite build and proxy configuration
├── package.json                    # Project dependencies and npm scripts
├── tsconfig.json                   # TypeScript configuration
├── metadata.json                   # Applet metadata and capabilities
├── .env.example                    # Environment variable documentation
├── tests/
│   ├── phase11_test_suite.ts       # 28-test comprehensive verification suite
│   └── benchmark.ts                # Real pipeline performance timing suite
├── src/
│   ├── main.tsx                    # React client entry point
│   ├── App.jsx                     # Route definitions and layout nesting
│   ├── index.css                   # Tailwind CSS global styles
│   ├── layouts/
│   │   └── DashboardLayout.jsx     # Master layout with responsive sidebar and header
│   ├── components/
│   │   ├── FileDropzone.jsx        # Drag-and-drop file upload zone
│   │   ├── SelectedFile.jsx        # File card with size and metadata
│   │   ├── DetectionOptions.jsx    # Configurable detection toggles
│   │   ├── RedactionModeSelector.jsx # Redaction mode selector (Standard / Mask / Strict)
│   │   ├── StatCard.jsx            # KPI cards for metrics
│   │   ├── PiiChart.jsx            # Recharts bar and distribution visualizers
│   │   ├── RecentActivity.jsx      # Live audit event timeline feed
│   │   ├── PrivacyScore.jsx        # Document sanitization rating gauge
│   │   ├── Header.jsx              # Navigation header bar
│   │   └── Sidebar.jsx             # Left-hand navigation bar
│   ├── pages/
│   │   ├── Dashboard.jsx           # Main metrics, charts, and document list
│   │   ├── ScanDocument.jsx        # Upload document and scan configuration page
│   │   ├── ScanResults.jsx         # Summary of detected PII entities
│   │   ├── PiiReviewPage.jsx       # Human review, decisions, and redaction execution
│   │   ├── DocumentsPage.jsx       # Document repository and status overview
│   │   ├── DocumentHistoryPage.jsx # Document-specific audit trail timeline
│   │   └── PlaceholderPage.jsx     # Future expansion placeholders
│   ├── services/
│   │   └── dashboardApi.js         # Frontend fetch client for analytics endpoints
│   └── server/
│       ├── controllers/
│       │   ├── documentController.ts   # Document upload, scan, review, and history handlers
│       │   ├── redactionController.ts  # Redaction execution and download streaming
│       │   └── dashboardController.ts  # Analytics metrics and activity feeds
│       ├── models/
│       │   ├── Document.ts         # Document and Detection models & persistence
│       │   └── AuditLog.ts         # AuditLog model & persistent collection
│       ├── redaction/
│       │   ├── pdfRedactor.ts      # Pure vector PDF re-builder without sensitive text
│       │   ├── docxRedactor.ts     # OpenXML XML run sanitizer
│       │   ├── txtRedactor.ts      # Span-based text sanitizer
│       │   ├── imageRedactor.ts    # Image rejection safety guard
│       │   └── maskHelper.ts       # Type-specific masking transforms
│       ├── routes/
│       │   ├── documentRoutes.ts   # /api/documents routes
│       │   └── dashboardRoutes.ts  # /api/dashboard routes
│       └── services/
│           ├── auditService.ts     # Audit logger with raw PII filter
│           ├── dashboardService.ts # Analytics aggregator
│           ├── detectionService.ts # Unified Regex + NLP orchestrator
│           ├── nlpDetector.ts      # Compromise NER and address detector
│           ├── piiDetector.ts      # Structured Regex detector with Luhn checks
│           ├── redactionService.ts # Multi-format redaction coordinator
│           ├── scanService.ts      # Scan runner and MongoDB updater
│           └── textExtractor.ts    # Multi-format raw text extraction
```

---

## 8. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended).
- **npm**: v9.0.0 or higher.
- **Git**: For version control.

---

## 9. Installation
Clone the repository and install all dependencies:

```bash
# 1. Clone repository
git clone https://github.com/example/redactx.git
cd redactx

# 2. Install dependencies
npm install
```

---

## 10. Environment Variables
Create a local `.env` file using `.env.example`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|:---|:---|:---|
| `PORT` | Port for the Express server | `3000` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `VITE_API_URL` | Base API URL (leave empty for same origin) | `""` |
| `MONGODB_URI` | MongoDB database URI | `mongodb://localhost:27017/redactx` |

---

## 11. MongoDB Setup
The application features a built-in MongoDB/Mongoose document engine with persistent collections (`DocumentModel`, `DetectionModel`, and `AuditLogModel`). If connecting to an external MongoDB instance:
1. Start your local MongoDB daemon: `mongod --dbpath /data/db`
2. Configure `MONGODB_URI=mongodb://localhost:27017/redactx` in `.env`.

---

## 12. Backend Setup
The backend runs through Express with integrated Vite middleware:
```bash
# Compile and start server with TypeScript execution
npm run dev
```
The server will start at `http://localhost:3000`.

---

## 13. Frontend Setup
In development mode, Vite middleware is automatically mounted on the Express server (`server.ts`). You access both frontend and backend through `http://localhost:3000`.

To build a standalone production bundle:
```bash
npm run build
```

---

## 14. How to Run the Project
```bash
# Run in development mode
npm run dev

# Run full Phase 11 test suite
npx tsx tests/phase11_test_suite.ts

# Run performance benchmarks
npx tsx tests/benchmark.ts
```

---

## 16. Production Deployment

### 1. Required services
- Node.js (v18+)
- MongoDB (v6+)

### 2. Environment variables
See `.env.example` for the required variables. Do not commit `.env`.

### 3. MongoDB configuration
Ensure `MONGODB_URI` points to a secure, persistent MongoDB instance.

### 4. Build and run
```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start backend
NODE_ENV=production PORT=3000 CORS_ORIGIN=https://yourdomain.com MONGODB_URI=your_db_uri npm start
```

### 5. Deployment
- The backend serves the production build from the `dist` directory.
- Ensure persistent storage for MongoDB is configured.
- Ensure the API URL is set correctly in the frontend build (`VITE_API_URL`).

### 6. Full application verification
Run the full system test runner:
```bash
npx tsx tests/phase11_test_suite.ts
```

---

## 15. API Overview

### Document Endpoints (`/api/documents`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/documents/upload` | Upload document (`.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.rtf`, max 50 MB) |
| `GET` | `/api/documents` | List uploaded documents |
| `GET` | `/api/documents/:id` | Get document details and detection list |
| `POST` | `/api/documents/:id/scan` | Trigger PII scan with optional `detectionTypes` |
| `GET` | `/api/documents/:id/detections` | Retrieve all detections for document |
| `PUT` | `/api/documents/:id/detections/review` | Submit batch review decisions (`REDACT` or `KEEP`) |
| `PUT` | `/api/documents/:id/detections/:detectionId/decision` | Update a single detection decision |
| `POST` | `/api/documents/:id/redact` | Execute safe redaction and create protected file |
| `GET` | `/api/documents/:id/download` | Download the generated protected document |
| `GET` | `/api/documents/:id/preview` | Preview protected document (sanitized text JSON or raw stream with `?raw=true`) |
| `GET` | `/api/documents/:id/history` | Retrieve chronological audit events for document |

### Dashboard Analytics (`/api/dashboard`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/dashboard/stats` | Aggregated metrics (total documents, PII counts, sanitization rate) |
| `GET` | `/api/dashboard/pii-breakdown` | PII count and percentage share by category |
| `GET` | `/api/dashboard/document-status` | Distribution of documents across workflow states |
| `GET` | `/api/dashboard/recent-documents` | Recent documents with status badges |
| `GET` | `/api/dashboard/recent-activity` | Chronological audit activity feed |

---

## 16. PII Detection Types

| Entity Type | Category | Engine | Validation Technique |
|:---|:---|:---|:---|
| `EMAIL` | Structured | Regex | RFC-compliant standard pattern |
| `PHONE` | Structured | Regex | International and domestic patterns (10-15 digits) |
| `AADHAAR` | Structured | Regex + Rule | 12-digit format (`\d{4} \d{4} \d{4}`), repetition filter |
| `CREDIT_CARD` | Structured | Regex + Rule | Luhn checksum algorithm (Mod-10), brand prefixes |
| `BANK_ACCOUNT` | Structured | Regex + Context | Account prefix matching, length validation (9-18 digits) |
| `IP_ADDRESS` | Structured | Regex | IPv4 octet bounds (0-255), version number exclusion |
| `DATE_OF_BIRTH` | Structured | Regex + Context | Context label matching (`DOB:`, `Born:`) with date formats |
| `PASSPORT` | Structured | Regex | Letter prefix followed by 7-8 numeric digits |
| `PERSON_NAME` | NLP | Local Compromise NER | Context prefixes (`Dr.`, `Mr.`, `Patient Name:`) + NER |
| `ADDRESS` | NLP | Heuristic Pattern | Physical address syntax, city, postal code format |

---

## 17. NLP Detection
RedactX implements fully offline, zero-network NLP extraction using `Compromise`:
- **Contextual Prefix Matching**: Identifies titles (`Dr.`, `Prof.`, `Mr.`, `Ms.`) and label markers (`Patient Name:`, `Client Name:`).
- **False-Positive Mitigation**: Maintains a filter list preventing common words (e.g. `Hospital`, `Clinic`, `RedactX`, `Developer`, `Department`, `January`) from being flagged as names.
- **Span Substring Invariance**: Guarantees that `text.slice(startIndex, endIndex) === value` for every detected name and address.

---

## 18. Human Review Workflow
1. Following a document scan, detections are initialized with `decision = 'PENDING'`.
2. The user reviews each entity in the Human Review interface:
   - Click **Redact** (`REDACT`): Entity will be removed/masked in the protected file.
   - Click **Keep** (`KEEP`): Entity will be preserved in its original form.
   - Batch buttons allow **Redact All** or **Keep All** in one click.
3. Decisions are synchronized in real-time to MongoDB.
4. **Validation Guard**: Redaction cannot be triggered if any detection remains `PENDING`.

---

## 19. Redaction Workflow
- **Original Preservation**: The original file buffer in MongoDB is **never** modified or overwritten.
- **True PDF Sanitization**: Instead of drawing black visual rectangles over text (which can easily be selected or removed in PDF viewers), `PdfRedactor` recreates a completely fresh PDF stream containing only sanitized text.
- **Word Document (DOCX) Sanitization**: Re-encodes XML text elements inside `word/document.xml` using `adm-zip`.
- **Text (TXT) Sanitization**: Executes string slicing in descending order of `startIndex` to prevent offset drift.

---

## 20. Audit Trail
Every significant document event is recorded in MongoDB:
- `DOCUMENT_UPLOADED`
- `PII_SCAN_STARTED`
- `PII_SCAN_COMPLETED`
- `PII_REVIEW_STARTED`
- `PII_REVIEW_COMPLETED`
- `REDACTION_STARTED`
- `REDACTION_COMPLETED`
- `PROTECTED_DOCUMENT_GENERATED`
- `PROTECTED_DOCUMENT_DOWNLOADED`

**Security Rule**: Audit metadata never logs raw sensitive values (credit card numbers, Aadhaar IDs, emails, phone numbers, or passwords).

---

## 21. Dashboard Analytics
The dashboard is powered by MongoDB aggregations:
- **Sanitization Rate**: Calculated dynamically as `(totalRedacted / totalPII) * 100`.
- **PII Distribution**: Real-time breakdown of detected vs. redacted quantities across all 10 categories.
- **Document Status Funnel**: Distribution across `UPLOADED`, `SCANNED`, `REVIEWED`, and `REDACTED`.
- **Recent Activity Feed**: Real-time audit events formatted with human-readable relative timestamps.

---

## 22. Security Features
- **Path Traversal Protection**: Uploaded filenames are stripped of `../` and special characters.
- **Strict File Type Filtering**: Multer enforces both file extension and MIME type allowlists.
- **Memory Buffer Processing**: Uploaded documents are processed in memory and never written to temporary unencrypted disk locations.
- **Data Protection in Logs**: Server logs contain only HTTP method and path; sensitive request payloads are never output to standard logs.
- **Controlled Error Responses**: Unhandled exceptions produce clean structured JSON error messages; stack traces are never exposed to clients.

---

## 23. Testing Instructions
RedactX includes an automated test runner covering all endpoints and security checks:

```bash
# Execute Phase 11 Test Suite (28 tests)
npx tsx tests/phase11_test_suite.ts

# Execute Performance Benchmark
npx tsx tests/benchmark.ts

# Run TypeScript Lint Check
npm run lint

# Run Production Build Check
npm run build
```

---

## 24. Known Limitations
1. **Scanned Image-Only PDFs**: RedactX extracts text from vector/text-layer PDFs. PDFs consisting solely of scanned raster images without embedded OCR text layers require an OCR preprocessing step.
2. **Direct Image Redaction**: Uploading standalone raster image files (`.png`, `.jpg`) for image-coordinate pixel redaction is intentionally blocked with code `IMAGE_REDACTION_UNSUPPORTED` in favor of secure vector and document sanitization.
3. **Complex Nested Word Tables**: In `.docx` documents containing highly complex nested XML tables, PII spanning across split run tags (`<w:r>`) is replaced at the run level.

---

## Safe Synthetic Test Data Guide

To safely test the platform without using real personal data, use the following synthetic values:

```
CONFIDENTIAL CLIENT RECORD [SYNTHETIC TEST DOCUMENT]
Patient Name: Rahul Verma
Address: 42 Palm Grove Avenue, Chennai, Tamil Nadu - 600028
Email: rahul.verma@example.com
Phone: +91 95662 33743
Aadhaar: 5489 1234 5678
Credit Card: 4532 0156 7892 4112
Bank Account: 987654321098
DOB: 15/08/1990
IP Address: 192.168.1.45
Passport: J8374621
```

All values in this sample are synthetic and comply with verification algorithms (e.g., Luhn checksum for credit cards) without corresponding to any real individual.
