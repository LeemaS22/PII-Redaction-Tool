import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import AdmZip from 'adm-zip';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: any;
}

const BASE_URL = 'http://localhost:3000';
const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ category, name, passed: true, durationMs });
    console.log(`  ✓ [${category}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ category, name, passed: false, durationMs, error: err.message || String(err) });
    console.error(`  ✗ [${category}] ${name} (${durationMs}ms):`, err.message || err);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Generate sample synthetic PDF
async function createSyntheticPdf(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([595.28, 841.89]);
  
  const lines = text.split('\n');
  let y = 800;
  for (const line of lines) {
    if (y < 40) break;
    page.drawText(line.replace(/[^\x20-\x7E]/g, ' '), {
      x: 50,
      y,
      size: 11,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 16;
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Generate sample synthetic DOCX
function createSyntheticDocx(textContent: string): Buffer {
  const zip = new AdmZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
  zip.addFile('word/document.xml', Buffer.from(documentXml, 'utf-8'));
  return zip.toBuffer();
}

async function main() {
  console.log('====================================================');
  console.log('   REDACTX PHASE 11 FULL SYSTEM TEST RUNNER');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: HEALTH CHECK & ENVIRONMENT
  // ----------------------------------------------------
  await runTest('HEALTH', 'API health endpoint responds with 200 OK', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected data.success === true');
  });

  await runTest('HEALTH', 'Upload configuration endpoint responds with limits', async () => {
    const res = await fetch(`${BASE_URL}/api/config/upload`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.maxFileSizeMB === 50, 'Expected 50MB limit');
    assert(Array.isArray(data.allowedExtensions), 'Expected allowedExtensions array');
  });

  // ----------------------------------------------------
  // SECTION 2: DOCUMENT UPLOAD TESTING
  // ----------------------------------------------------
  let uploadedTxtDocId = '';
  let uploadedPdfDocId = '';
  let uploadedDocxDocId = '';

  await runTest('UPLOAD', 'Upload valid Plain Text document (.txt)', async () => {
    const content = `CONFIDENTIAL HR RECORD
Patient Name: Rahul Verma
Address: 42 Palm Grove Avenue, Chennai, Tamil Nadu - 600028
Email: rahul.verma@example.com
Phone: +91 95662 33743
Aadhaar: 5489 1234 5678
Credit Card: 4532 0156 7892 4112
Bank Account: 987654321098
DOB: 15/08/1990
IP Address: 192.168.1.45
Passport: J8374621`;

    const form = new FormData();
    form.append('document', new Blob([content], { type: 'text/plain' }), 'employee_record.txt');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Upload failed');
    assert(Boolean(data.data.documentId), 'Expected documentId in response');
    assert(data.data.status === 'UPLOADED', 'Expected status to be UPLOADED');
    uploadedTxtDocId = data.data.documentId;
  });

  await runTest('UPLOAD', 'Upload valid PDF document (.pdf)', async () => {
    const pdfText = `MEDICAL CONSULTATION SUMMARY
Doctor Name: Dr. Ananya Iyer
Patient Name: Priya Sharma
Address: Flat 4B, Silver Heights, MG Road, Bangalore, Karnataka - 560001
Email: ananya.iyer@healthlens.io
Phone: +91 98450 12345
Aadhaar: 4123 4567 8901
Credit Card: 4111 2222 3333 4444
Bank Account: 1234567890123
DOB: 24/11/1985
IP Address: 10.0.0.1
Passport: K9283746`;

    const pdfBuffer = await createSyntheticPdf(pdfText);
    const form = new FormData();
    form.append('document', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), 'medical_summary.pdf');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'PDF upload failed');
    uploadedPdfDocId = data.data.documentId;
  });

  await runTest('UPLOAD', 'Upload valid Word document (.docx)', async () => {
    const docxText = 'Consultant: Vikram Seth\nEmail: vikram.seth@corporate.org\nPhone: +91 97112 34567\nAddress: 10 Marine Drive, Mumbai - 400020';
    const docxBuffer = createSyntheticDocx(docxText);
    const form = new FormData();
    form.append('document', new Blob([new Uint8Array(docxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'contract.docx');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'DOCX upload failed');
    uploadedDocxDocId = data.data.documentId;
  });

  await runTest('UPLOAD', 'Reject unsupported executable or binary file', async () => {
    const form = new FormData();
    form.append('document', new Blob(['MZ\x90\x00\x03\x00\x00\x00'], { type: 'application/x-msdownload' }), 'malicious.exe');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    assert(res.status === 400, `Expected 400 for unsupported file, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Expected rejection of unsupported file');
  });

  await runTest('UPLOAD', 'Reject upload request without any file', async () => {
    const form = new FormData();
    const res = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    assert(res.status === 400, `Expected 400 for empty upload, got ${res.status}`);
  });

  await runTest('UPLOAD', 'Sanitize and safely handle suspicious filenames', async () => {
    const form = new FormData();
    form.append('document', new Blob(['Sample safe text content'], { type: 'text/plain' }), '../../../../etc/shadow.txt');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(!data.data.filename.includes('../'), 'Path traversal characters must be neutralized in filename');
  });

  // ----------------------------------------------------
  // SECTION 3: PII DETECTION & INVARIANCE TESTING
  // ----------------------------------------------------
  let scannedDetections: any[] = [];

  await runTest('DETECTION', 'Scan Plain Text document and detect all 10 entity types', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detectionTypes: ['ALL'] }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Scan failed');
    assert(data.data.status === 'SCANNED', 'Document status should be SCANNED');
    assert(data.data.piiCount >= 9, `Expected at least 9 PII entities, found ${data.data.piiCount}`);

    scannedDetections = data.data.detections;
    const detectedTypes = new Set(scannedDetections.map((d: any) => d.type));

    // Verify all structured & NLP types are present
    assert(detectedTypes.has('EMAIL'), 'Missing EMAIL detection');
    assert(detectedTypes.has('PHONE'), 'Missing PHONE detection');
    assert(detectedTypes.has('AADHAAR'), 'Missing AADHAAR detection');
    assert(detectedTypes.has('CREDIT_CARD'), 'Missing CREDIT_CARD detection');
    assert(detectedTypes.has('BANK_ACCOUNT'), 'Missing BANK_ACCOUNT detection');
    assert(detectedTypes.has('IP_ADDRESS'), 'Missing IP_ADDRESS detection');
    assert(detectedTypes.has('DATE_OF_BIRTH'), 'Missing DATE_OF_BIRTH detection');
    assert(detectedTypes.has('PASSPORT'), 'Missing PASSPORT detection');
    assert(detectedTypes.has('PERSON_NAME'), 'Missing PERSON_NAME detection');
    assert(detectedTypes.has('ADDRESS'), 'Missing ADDRESS detection');
  });

  await runTest('DETECTION', 'Verify Span Substring Invariance: text.slice(startIndex, endIndex) === value', async () => {
    const docRes = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}`);
    const docData = await docRes.json();
    
    // Retrieve source text
    const sampleText = `CONFIDENTIAL HR RECORD
Patient Name: Rahul Verma
Address: 42 Palm Grove Avenue, Chennai, Tamil Nadu - 600028
Email: rahul.verma@example.com
Phone: +91 95662 33743
Aadhaar: 5489 1234 5678
Credit Card: 4532 0156 7892 4112
Bank Account: 987654321098
DOB: 15/08/1990
IP Address: 192.168.1.45
Passport: J8374621`;

    for (const det of scannedDetections) {
      assert(det.startIndex >= 0, `startIndex must be non-negative for ${det.type}`);
      assert(det.endIndex > det.startIndex, `endIndex must be greater than startIndex for ${det.type}`);
      const slice = sampleText.slice(det.startIndex, det.endIndex);
      assert(
        slice === det.value,
        `Span mismatch for ${det.type}: slice '${slice}' !== value '${det.value}'`
      );
      assert(det.confidence >= 0.5 && det.confidence <= 1.0, `Invalid confidence score: ${det.confidence}`);
      assert(['REGEX', 'RULE', 'NLP'].includes(det.source), `Invalid source: ${det.source}`);
    }
  });

  await runTest('DETECTION', 'Scan PDF document and verify extraction and detection', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedPdfDocId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detectionTypes: ['ALL'] }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'PDF scan failed');
    assert(data.data.piiCount >= 5, `Expected at least 5 entities in PDF, got ${data.data.piiCount}`);
  });

  // ----------------------------------------------------
  // SECTION 4: SELECTIVE DETECTION OPTIONS
  // ----------------------------------------------------
  await runTest('DETECTION', 'Reject false positives (MS SQL, AR Flappy Bird, Detection Systems)', async () => {
    const resumeText = `EXPERIENCE
- Developed an AR Flappy Bird game and created basic gameplay logic.
- Built a CNN-Based Keratoconus Detection System for clinical research.
Skills: MS SQL, React, Node.js, Python

CONTACT
Candidate Name: Rahul Verma
Address: 42 Palm Grove Avenue, Chennai, Tamil Nadu - 600028`;

    const form = new FormData();
    form.append('document', new Blob([resumeText], { type: 'text/plain' }), 'test_resume_fp.txt');
    const upRes = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    const upData = await upRes.json();
    const docId = upData.data.documentId;

    const scanRes = await fetch(`${BASE_URL}/api/documents/${docId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detectionTypes: ['PERSON_NAME', 'ADDRESS'] }),
    });
    const scanData = await scanRes.json();
    const detections = scanData.data.detections;
    const values = detections.map((d: any) => d.value);

    // Verify false positives are completely rejected
    assert(!values.some((v: string) => v.toLowerCase().includes('flappy')), 'Flappy Bird should not be detected as Address');
    assert(!values.some((v: string) => v.toLowerCase().includes('keratoconus')), 'Keratoconus should not be detected as Person Name');
    assert(!values.some((v: string) => v.toLowerCase().includes('sql')), 'MS SQL should not be detected as Person Name');

    // Verify true positives are kept
    assert(values.includes('Rahul Verma'), 'Rahul Verma should be detected as Person Name');
    assert(values.some((v: string) => v.includes('Palm Grove Avenue')), 'Palm Grove Avenue should be detected as Address');
  });

  await runTest('OPTIONS', 'Scan respects selective detection options (EMAIL only)', async () => {
    // Upload fresh document
    const form = new FormData();
    form.append('document', new Blob(['Contact: Arun Kumar\nEmail: arun.k@domain.com\nPhone: +91 91234 56789'], { type: 'text/plain' }), 'test_options.txt');
    const upRes = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    const upData = await upRes.json();
    const docId = upData.data.documentId;

    // Scan ONLY for EMAIL
    const scanRes = await fetch(`${BASE_URL}/api/documents/${docId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detectionTypes: ['EMAIL'] }),
    });
    const scanData = await scanRes.json();
    assert(scanData.success === true, 'Selective scan failed');
    const detections = scanData.data.detections;
    assert(detections.length === 1, `Expected exactly 1 EMAIL detection, got ${detections.length}`);
    assert(detections[0].type === 'EMAIL', `Expected type EMAIL, got ${detections[0].type}`);
  });

  await runTest('OPTIONS', 'Scan respects selective NLP options (PERSON_NAME and ADDRESS only)', async () => {
    const form = new FormData();
    form.append('document', new Blob(['Patient Name: Sunita Rao\nAddress: 15 Lake View Road, Hyderabad\nEmail: sunita@example.com'], { type: 'text/plain' }), 'test_nlp_opt.txt');
    const upRes = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    const upData = await upRes.json();
    const docId = upData.data.documentId;

    const scanRes = await fetch(`${BASE_URL}/api/documents/${docId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detectionTypes: ['PERSON_NAME', 'ADDRESS'] }),
    });
    const scanData = await scanRes.json();
    assert(scanData.success === true, 'NLP selective scan failed');
    const types = scanData.data.detections.map((d: any) => d.type);
    assert(types.includes('PERSON_NAME'), 'Expected PERSON_NAME');
    assert(types.includes('ADDRESS'), 'Expected ADDRESS');
    assert(!types.includes('EMAIL'), 'EMAIL must not be returned when not requested');
  });

  // ----------------------------------------------------
  // SECTION 5: HUMAN REVIEW WORKFLOW
  // ----------------------------------------------------
  await runTest('REVIEW', 'Prevent redaction confirmation when PENDING decisions remain', async () => {
    // Attempt redaction before completing review
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/redact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'STANDARD' }),
    });
    assert(res.status === 400, `Expected 400 for incomplete review, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Redaction must be blocked before review is completed');
  });

  await runTest('REVIEW', 'Update single detection review decision to KEEP', async () => {
    const firstDetection = scannedDetections[0];
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/detections/${firstDetection.id}/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'KEEP' }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Failed to update single decision');
    assert(data.data.decision === 'KEEP', 'Expected decision to be KEEP');
  });

  await runTest('REVIEW', 'Submit complete mixed review decisions (REDACT and KEEP)', async () => {
    // Make first 2 KEEP, rest REDACT
    const decisions = scannedDetections.map((d, idx) => ({
      detectionId: d.id,
      decision: idx < 2 ? 'KEEP' : 'REDACT',
    }));

    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/detections/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Review submission failed');
    assert(data.data.reviewStatus === 'COMPLETED', 'reviewStatus should be COMPLETED');
    assert(data.data.status === 'REVIEWED', 'Document status should be REVIEWED');
    assert(data.data.pendingCount === 0, 'No pending items should remain');
    assert(data.data.keepCount === 2, 'Expected 2 items kept');
    assert(data.data.redactCount === scannedDetections.length - 2, 'Expected remaining items marked REDACT');
  });

  await runTest('REVIEW', 'Verify review decisions persisted accurately in MongoDB', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/detections`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    const loadedDetections = data.data.detections;
    const kept = loadedDetections.filter((d: any) => d.decision === 'KEEP');
    const redacted = loadedDetections.filter((d: any) => d.decision === 'REDACT');
    assert(kept.length === 2, `Expected 2 kept detections in DB, found ${kept.length}`);
    assert(redacted.length === scannedDetections.length - 2, 'Expected redacted detections in DB');
  });

  // ----------------------------------------------------
  // SECTION 6: REDACTION & PROTECTED DOCUMENT
  // ----------------------------------------------------
  await runTest('REDACTION', 'Generate protected Plain Text document (STANDARD strategy)', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/redact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'STANDARD' }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Redaction failed');
    assert(data.data.redactionStatus === 'COMPLETED', 'Redaction status must be COMPLETED');
    assert(data.data.protectedFileName.includes('_redacted'), 'Protected filename should have _redacted suffix');
  });

  await runTest('REDACTION', 'Download protected document and verify PII removal and kept content retention', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/download`);
    assert(res.status === 200, `Expected 200 on download, got ${res.status}`);
    const protectedText = await res.text();

    // Verify [REDACTED] tags are present
    assert(protectedText.includes('[REDACTED]'), 'Protected document must contain [REDACTED] tokens');

    // Verify REDACT values are removed
    for (let i = 2; i < scannedDetections.length; i++) {
      const val = scannedDetections[i].value;
      assert(!protectedText.includes(val), `Protected document must NOT contain redacted value: ${val}`);
    }

    // Verify KEEP values remain intact
    for (let i = 0; i < 2; i++) {
      const keptVal = scannedDetections[i].value;
      assert(protectedText.includes(keptVal), `Protected document must retain KEEP value: ${keptVal}`);
    }

    // Verify non-sensitive contextual structure remains
    assert(protectedText.includes('CONFIDENTIAL HR RECORD'), 'Unrelated template text must remain');
  });

  await runTest('REDACTION', 'Verify PDF redaction generates true sanitized PDF without sensitive text in stream', async () => {
    // First review all PDF detections as REDACT
    const detRes = await fetch(`${BASE_URL}/api/documents/${uploadedPdfDocId}/detections`);
    const detData = await detRes.json();
    const pdfDetections = detData.data.detections;

    const decisions = pdfDetections.map((d: any) => ({
      detectionId: d.id,
      decision: 'REDACT',
    }));

    await fetch(`${BASE_URL}/api/documents/${uploadedPdfDocId}/detections/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions }),
    });

    // Redact PDF
    const redactRes = await fetch(`${BASE_URL}/api/documents/${uploadedPdfDocId}/redact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'STANDARD' }),
    });
    assert(redactRes.status === 200, `Expected 200, got ${redactRes.status}`);

    // Download protected PDF
    const downRes = await fetch(`${BASE_URL}/api/documents/${uploadedPdfDocId}/download`);
    assert(downRes.status === 200, `Expected 200, got ${downRes.status}`);
    const pdfArrayBuffer = await downRes.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // Verify header
    assert(pdfBuffer.slice(0, 5).toString() === '%PDF-', 'Must be valid PDF');

    // Parse sanitized PDF to confirm sensitive text is genuinely stripped
    const pdfModule: any = await import('pdf-parse');
    const PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse || pdfModule.default;
    const parser = new PDFParseClass({ data: pdfBuffer });
    await parser.load();
    const parsed = await parser.getText();
    const sanitizedPdfText = typeof parsed === 'string' ? parsed : (parsed as any).text;

    assert(!sanitizedPdfText.includes('Priya Sharma'), 'Original sensitive name must NOT exist in sanitized PDF stream');
    assert(!sanitizedPdfText.includes('ananya.iyer@healthlens.io'), 'Original email must NOT exist in sanitized PDF stream');
    assert(!sanitizedPdfText.includes('4123 4567 8901'), 'Aadhaar must NOT exist in sanitized PDF stream');
    assert(sanitizedPdfText.includes('[REDACTED]'), 'Sanitized PDF must contain [REDACTED] text');
  });

  // ----------------------------------------------------
  // SECTION 7: AUDIT TRAIL
  // ----------------------------------------------------
  await runTest('AUDIT', 'Retrieve document audit history and verify chronological event sequence', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/history`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Failed to fetch history');

    const history = data.data.history;
    assert(Array.isArray(history), 'History must be an array');
    assert(history.length >= 6, `Expected at least 6 audit events, got ${history.length}`);

    const actions = history.map((h: any) => h.action);
    assert(actions.includes('DOCUMENT_UPLOADED'), 'Missing DOCUMENT_UPLOADED audit log');
    assert(actions.includes('PII_SCAN_STARTED'), 'Missing PII_SCAN_STARTED audit log');
    assert(actions.includes('PII_SCAN_COMPLETED'), 'Missing PII_SCAN_COMPLETED audit log');
    assert(actions.includes('PII_REVIEW_COMPLETED'), 'Missing PII_REVIEW_COMPLETED audit log');
    assert(actions.includes('REDACTION_STARTED'), 'Missing REDACTION_STARTED audit log');
    assert(actions.includes('REDACTION_COMPLETED'), 'Missing REDACTION_COMPLETED audit log');
    assert(actions.includes('PROTECTED_DOCUMENT_GENERATED'), 'Missing PROTECTED_DOCUMENT_GENERATED audit log');
    assert(actions.includes('PROTECTED_DOCUMENT_DOWNLOADED'), 'Missing PROTECTED_DOCUMENT_DOWNLOADED audit log');
  });

  await runTest('AUDIT', 'Verify raw PII is NOT stored in audit log records', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDocId}/history`);
    const data = await res.json();
    const history = data.data.history;

    for (const log of history) {
      assert(Boolean(log.timestamp), 'Every audit log must have a timestamp');
      assert(log.status === 'SUCCESS' || log.status === 'FAILED', 'Audit status must be valid');
      
      const metaString = JSON.stringify(log.metadata || {});
      // Ensure raw values from the document are not present in audit logs
      assert(!metaString.includes('5489 1234 5678'), 'Aadhaar must not be stored in audit metadata');
      assert(!metaString.includes('4532 0156 7892 4112'), 'Credit card must not be stored in audit metadata');
      assert(!metaString.includes('rahul.verma@example.com'), 'Email must not be stored in audit metadata');
    }
  });

  // ----------------------------------------------------
  // SECTION 8: REAL DASHBOARD ANALYTICS
  // ----------------------------------------------------
  await runTest('DASHBOARD', 'GET /api/dashboard/stats reflects real MongoDB metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/stats`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Dashboard stats API failed');
    const stats = data.data;

    assert(typeof stats.totalDocuments === 'number' && stats.totalDocuments >= 3, 'Invalid totalDocuments');
    assert(typeof stats.scannedDocuments === 'number' && stats.scannedDocuments >= 2, 'Invalid scannedDocuments');
    assert(typeof stats.reviewedDocuments === 'number' && stats.reviewedDocuments >= 2, 'Invalid reviewedDocuments');
    assert(typeof stats.redactedDocuments === 'number' && stats.redactedDocuments >= 2, 'Invalid redactedDocuments');
    assert(typeof stats.totalPII === 'number' && stats.totalPII > 0, 'Invalid totalPII');
    assert(typeof stats.totalRedacted === 'number' && stats.totalRedacted > 0, 'Invalid totalRedacted');
    assert(typeof stats.sanitizationRate === 'number' && stats.sanitizationRate > 0, 'Invalid sanitizationRate');
  });

  await runTest('DASHBOARD', 'GET /api/dashboard/pii-breakdown returns live category counts', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/pii-breakdown`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.data), 'Expected array for pii-breakdown');
    assert(data.data.length > 0, 'Breakdown must contain items');
    for (const item of data.data) {
      assert(Boolean(item.category), 'Breakdown item must have category');
      assert(typeof item.detected === 'number', 'detected must be a number');
      assert(typeof item.redacted === 'number', 'redacted must be a number');
    }
  });

  await runTest('DASHBOARD', 'GET /api/dashboard/document-status returns status distributions', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/document-status`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.data), 'Expected array for document-status');
    const statuses = data.data.map((d: any) => d.status);
    assert(statuses.includes('REDACTED'), 'Should include REDACTED status');
  });

  await runTest('DASHBOARD', 'GET /api/dashboard/recent-activity returns chronological audit feed', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/recent-activity?limit=10`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.data), 'Recent activity must be an array');
    assert(data.data.length > 0, 'Recent activity should contain entries');
  });

  // ----------------------------------------------------
  // SECTION 9: ERROR STATES & SECURITY
  // ----------------------------------------------------
  await runTest('SECURITY', 'Handle non-existent document ID with clean 404 (no stack trace)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/api/documents/${fakeId}`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Expected success === false');
    assert(!JSON.stringify(data).includes('at Object.'), 'Stack traces must never leak to API consumers');
  });

  await runTest('SECURITY', 'Handle invalid API routes with structured 404 JSON', async () => {
    const res = await fetch(`${BASE_URL}/api/non_existent_endpoint`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Expected success === false');
    assert(data.error.includes('API route not found'), 'Expected clean error message');
  });

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n====================================================');
  console.log(`PHASE 11 TEST SUITE COMPLETED: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('====================================================\n');

  if (failed > 0) {
    console.error('Failed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(`- [${r.category}] ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
