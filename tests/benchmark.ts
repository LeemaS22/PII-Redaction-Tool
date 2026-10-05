import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const BASE_URL = 'http://localhost:3000';

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

async function benchmark() {
  console.log('--- RUNNING REAL PERFORMANCE BENCHMARK (3 ITERATIONS) ---');

  const txtContent = `CONFIDENTIAL CLIENT DOSSIER
Client Name: Meera Nambiar
Address: 14 KBR Park Road, Jubilee Hills, Hyderabad, Telangana - 500033
Email: meera.nambiar@clientcorp.in
Phone: +91 98490 55432
Aadhaar: 8492 1102 9384
Credit Card: 5105 1051 0510 5100
Bank Account: 4092182049182
DOB: 12/04/1988
IP Address: 172.16.254.1
Passport: M4928172`;

  const pdfBuffer = await createSyntheticPdf(txtContent);

  // 1. TXT Benchmark
  console.log('\n[1] TXT Document Pipeline Performance:');
  const txtUploadTimes: number[] = [];
  const txtScanTimes: number[] = [];
  const txtReviewTimes: number[] = [];
  const txtRedactionTimes: number[] = [];
  const txtDownloadTimes: number[] = [];

  for (let i = 0; i < 3; i++) {
    // Upload
    let t0 = performance.now();
    const form = new FormData();
    form.append('document', new Blob([txtContent], { type: 'text/plain' }), `bench_txt_${i}.txt`);
    const upRes = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    const upData = await upRes.json();
    txtUploadTimes.push(performance.now() - t0);
    const docId = upData.data.documentId;

    // Scan
    t0 = performance.now();
    const scanRes = await fetch(`${BASE_URL}/api/documents/${docId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detectionTypes: ['ALL'] }),
    });
    const scanData = await scanRes.json();
    txtScanTimes.push(performance.now() - t0);

    // Review
    const decisions = scanData.data.detections.map((d: any) => ({
      detectionId: d.id,
      decision: 'REDACT',
    }));
    t0 = performance.now();
    await fetch(`${BASE_URL}/api/documents/${docId}/detections/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions }),
    });
    txtReviewTimes.push(performance.now() - t0);

    // Redaction
    t0 = performance.now();
    await fetch(`${BASE_URL}/api/documents/${docId}/redact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'STANDARD' }),
    });
    txtRedactionTimes.push(performance.now() - t0);

    // Download
    t0 = performance.now();
    const downRes = await fetch(`${BASE_URL}/api/documents/${docId}/download`);
    await downRes.text();
    txtDownloadTimes.push(performance.now() - t0);
  }

  const avg = (arr: number[]) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

  console.log(`- Upload average:   ${avg(txtUploadTimes)} ms`);
  console.log(`- Scan average:     ${avg(txtScanTimes)} ms`);
  console.log(`- Review average:   ${avg(txtReviewTimes)} ms`);
  console.log(`- Redact average:   ${avg(txtRedactionTimes)} ms`);
  console.log(`- Download average: ${avg(txtDownloadTimes)} ms`);

  // 2. PDF Benchmark
  console.log('\n[2] PDF Document Pipeline Performance:');
  const pdfUploadTimes: number[] = [];
  const pdfScanTimes: number[] = [];
  const pdfReviewTimes: number[] = [];
  const pdfRedactionTimes: number[] = [];
  const pdfDownloadTimes: number[] = [];

  for (let i = 0; i < 3; i++) {
    // Upload
    let t0 = performance.now();
    const form = new FormData();
    form.append('document', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), `bench_pdf_${i}.pdf`);
    const upRes = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST', body: form });
    const upData = await upRes.json();
    pdfUploadTimes.push(performance.now() - t0);
    const docId = upData.data.documentId;

    // Scan
    t0 = performance.now();
    const scanRes = await fetch(`${BASE_URL}/api/documents/${docId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detectionTypes: ['ALL'] }),
    });
    const scanData = await scanRes.json();
    pdfScanTimes.push(performance.now() - t0);

    // Review
    const decisions = scanData.data.detections.map((d: any) => ({
      detectionId: d.id,
      decision: 'REDACT',
    }));
    t0 = performance.now();
    await fetch(`${BASE_URL}/api/documents/${docId}/detections/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions }),
    });
    pdfReviewTimes.push(performance.now() - t0);

    // Redaction
    t0 = performance.now();
    await fetch(`${BASE_URL}/api/documents/${docId}/redact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'STANDARD' }),
    });
    pdfRedactionTimes.push(performance.now() - t0);

    // Download
    t0 = performance.now();
    const downRes = await fetch(`${BASE_URL}/api/documents/${docId}/download`);
    await downRes.arrayBuffer();
    pdfDownloadTimes.push(performance.now() - t0);
  }

  console.log(`- Upload average:   ${avg(pdfUploadTimes)} ms`);
  console.log(`- Scan average:     ${avg(pdfScanTimes)} ms`);
  console.log(`- Review average:   ${avg(pdfReviewTimes)} ms`);
  console.log(`- Redact average:   ${avg(pdfRedactionTimes)} ms`);
  console.log(`- Download average: ${avg(pdfDownloadTimes)} ms`);
}

benchmark().catch(console.error);
