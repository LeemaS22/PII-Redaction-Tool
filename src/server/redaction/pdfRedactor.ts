import { PDFDocument } from 'pdf-lib';
import zlib from 'zlib';
import { IDetection, RedactionStrategy } from '../models/Document';
import { getReplacementValue } from './maskHelper';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeAscii85(str: string): Buffer {
  let clean = str.replace(/<~|~>|\s/g, '');
  const bytes: number[] = [];
  let i = 0;
  while (i < clean.length) {
    if (clean[i] === 'z') {
      bytes.push(0, 0, 0, 0);
      i++;
      continue;
    }
    const chunk = clean.slice(i, i + 5);
    const count = chunk.length;
    let padded = chunk;
    while (padded.length < 5) padded += 'u';
    let val = 0;
    for (let j = 0; j < 5; j++) {
      val = val * 85 + (padded.charCodeAt(j) - 33);
    }
    const b0 = (val >>> 24) & 255;
    const b1 = (val >>> 16) & 255;
    const b2 = (val >>> 8) & 255;
    const b3 = val & 255;
    if (count >= 2) bytes.push(b0);
    if (count >= 3) bytes.push(b1);
    if (count >= 4) bytes.push(b2);
    if (count >= 5) bytes.push(b3);
    i += count;
  }
  return Buffer.from(bytes);
}

function parseCMap(cmapStr: string): Map<string, string> {
  const charMap = new Map<string, string>();

  // bfchar: <01B3> <0064>
  const bfcharRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = bfcharRegex.exec(cmapStr)) !== null) {
    const glyphHex = m[1].toLowerCase();
    const char = String.fromCharCode(parseInt(m[2], 16));
    charMap.set(glyphHex, char);
  }

  // bfrange: <05CE> <05D7> <0030>
  const bfrangeRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
  while ((m = bfrangeRegex.exec(cmapStr)) !== null) {
    const startG = parseInt(m[1], 16);
    const endG = parseInt(m[2], 16);
    let startU = parseInt(m[3], 16);
    for (let g = startG; g <= endG; g++) {
      const gHex = g.toString(16).padStart(m[1].length, '0').toLowerCase();
      const char = String.fromCharCode(startU);
      charMap.set(gHex, char);
      startU++;
    }
  }

  return charMap;
}

function decodeTokensWithCMap(block: string, cmap: Map<string, string>): string {
  const tjRegex = /(<[0-9a-fA-F]+>|\((?:[^)\\]|\\.)*\))\s*Tj/g;
  let tokMatch: RegExpExecArray | null;
  let text = '';

  while ((tokMatch = tjRegex.exec(block)) !== null) {
    const rawTok = tokMatch[1];
    if (rawTok.startsWith('<')) {
      const hex = rawTok.slice(1, -1).trim().toLowerCase();
      if (cmap.has(hex)) {
        text += cmap.get(hex);
      } else {
        for (let i = 0; i < hex.length; i += 2) {
          const sub = hex.slice(i, i + 2);
          if (cmap.has(sub)) {
            text += cmap.get(sub);
          } else {
            text += String.fromCharCode(parseInt(sub, 16));
          }
        }
      }
    } else if (rawTok.startsWith('(')) {
      const inner = rawTok.slice(1, -1);
      const bytes = Buffer.from(inner, 'latin1');
      if (bytes.length >= 2 && bytes.length % 2 === 0) {
        for (let i = 0; i < bytes.length; i += 2) {
          const hex = bytes.slice(i, i + 2).toString('hex').toLowerCase();
          if (cmap.has(hex)) {
            text += cmap.get(hex);
          } else {
            text += bytes.slice(i, i + 2).toString('latin1');
          }
        }
      } else {
        text += bytes.toString('latin1');
      }
    }
  }

  return text;
}

function buildKerningRegex(val: string): RegExp {
  const chars = val.trim().split('');
  const parts: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      parts.push('(?:\\s+|\\)\\s*[-+]?\\d*(?:\\.\\d+)?\\s*\\(|\\)\\s*(?:Tj|TJ|\'|")?[^()\\\\<>]*?\\()');
    } else {
      const pdfC = c === '(' ? '(?:\\(|\\()' : c === ')' ? '(?:\\)|\\))' : escapeRegex(c);
      parts.push(pdfC);

      if (i < chars.length - 1 && !/\s/.test(chars[i + 1])) {
        parts.push('(?:\\)\\s*[-+]?\\d*(?:\\.\\d+)?\\s*\\(|\\s*)');
      }
    }
  }

  return new RegExp(parts.join(''), 'gi');
}

function buildHexKerningRegex(val: string): RegExp {
  const chars = val.trim().split('');
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      parts.push('(?:0020|>\\s*[-+]?\\d*(?:\\.\\d+)?\\s*<)');
    } else {
      parts.push(Buffer.from(c, 'utf16le').swap16().toString('hex'));
      if (i < chars.length - 1 && !/\s/.test(chars[i + 1])) {
        parts.push('(?:>\\s*[-+]?\\d*(?:\\.\\d+)?\\s*<|\\s*)');
      }
    }
  }
  return new RegExp(parts.join(''), 'gi');
}

function buildHex1ByteKerningRegex(val: string): RegExp {
  const chars = val.trim().split('');
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      parts.push('(?:20|>\\s*[-+]?\\d*(?:\\.\\d+)?\\s*<)');
    } else {
      parts.push(Buffer.from(c, 'utf-8').toString('hex'));
      if (i < chars.length - 1 && !/\s/.test(chars[i + 1])) {
        parts.push('(?:>\\s*[-+]?\\d*(?:\\.\\d+)?\\s*<|\\s*)');
      }
    }
  }
  return new RegExp(parts.join(''), 'gi');
}

export class PdfRedactor {
  public static async redact(
    buffer: Buffer,
    detections: IDetection[],
    strategy: RedactionStrategy = 'STANDARD'
  ): Promise<{ buffer: Buffer; redactedCount: number }> {
    const toRedact = detections.filter((d) => d.decision === 'REDACT');
    if (toRedact.length === 0) {
      return { buffer, redactedCount: 0 };
    }

    try {
      const originalPdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = originalPdfDoc.getPages();
      let actualRedactedCount = 0;

      // Collect all /ToUnicode CMaps across the PDF document
      const cmaps: Map<string, string>[] = [];
      for (const [ref, obj] of originalPdfDoc.context.enumerateIndirectObjects()) {
        if (!obj || typeof (obj as any).getContents !== 'function') continue;
        const raw = (obj as any).getContents();
        if (!raw || raw.length === 0) continue;
        let str = '';
        try { str = zlib.inflateSync(raw).toString('utf-8'); } catch { str = raw.toString('utf-8'); }
        if (str.includes('begincmap')) {
          cmaps.push(parseCMap(str));
        }
      }

      const targets = toRedact.map((d) => {
        const replacement = getReplacementValue(d.type, d.value, strategy);
        const val = d.value.trim();
        const escaped = escapeRegex(val);
        const hex8Val = Buffer.from(val, 'utf-8').toString('hex');
        const hex8Repl = Buffer.from(replacement, 'utf-8').toString('hex');

        let hex16Val = '';
        let hex16Repl = '';
        try {
          hex16Val = Buffer.from(val, 'utf16le').swap16().toString('hex');
          hex16Repl = Buffer.from(replacement, 'utf-8').toString('hex');
        } catch {}

        const digits = val.replace(/\D/g, '');
        const phoneChunks = digits.length >= 7 ? [digits.slice(-10), digits.slice(-5), digits.slice(0, 5)] : [];
        const isEmail = val.includes('@');
        const emailParts = isEmail ? val.toLowerCase().split('@') : [];

        return {
          type: d.type,
          originalValue: val,
          normValue: val.replace(/\s+/g, ' ').toLowerCase(),
          replacement,
          escapedRegex: new RegExp(escaped, 'gi'),
          kerningRegex: buildKerningRegex(val),
          hex8Regex: new RegExp(hex8Val, 'gi'),
          hex8Replacement: hex8Repl,
          hex8KerningRegex: buildHex1ByteKerningRegex(val),
          hex16Regex: hex16Val ? new RegExp(hex16Val, 'gi') : null,
          hex16Replacement: hex16Repl,
          hex16KerningRegex: hex16Val ? buildHexKerningRegex(val) : null,
          digits,
          phoneChunks,
          isEmail,
          emailUser: emailParts[0] || '',
          emailDomain: emailParts[1] || '',
        };
      });

      // 1. Process all stream objects across the entire PDF document
      for (const [ref, obj] of originalPdfDoc.context.enumerateIndirectObjects()) {
        if (!obj || typeof (obj as any).getContents !== 'function') continue;

        const rawBytes = (obj as any).getContents();
        if (!rawBytes || rawBytes.length === 0) continue;

        let currentBytes: Buffer = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes);
        const objDictStr = (obj as any).dict ? (obj as any).dict.toString() : '';
        const rawStr = currentBytes.toString('binary');

        // Check if stream is ASCII85 encoded
        if (rawStr.includes('~>') || objDictStr.includes('ASCII85Decode')) {
          try {
            currentBytes = decodeAscii85(rawStr);
          } catch (a85Err) {
            console.warn('ASCII85 decode warning:', a85Err);
          }
        }

        let decoded: Buffer;
        try {
          decoded = zlib.inflateSync(currentBytes);
        } catch {
          try {
            decoded = zlib.unzipSync(currentBytes);
          } catch {
            decoded = currentBytes;
          }
        }

        let streamStr = decoded.toString('latin1');
        let streamModified = false;

        // A. CMap-aware block redaction (for CID-keyed custom fonts where characters are split into single Tj glyphs)
        const btBlocks = streamStr.match(/BT[\s\S]*?ET/g) || [];
        for (const block of btBlocks) {
          let blockMatchesTarget = false;

          for (const cmap of cmaps) {
            const decodedBlock = decodeTokensWithCMap(block, cmap);
            const normBlock = decodedBlock.replace(/\s+/g, ' ').toLowerCase().trim();
            const blockDigits = decodedBlock.replace(/\D/g, '');

            for (const t of targets) {
              if (t.type === 'PHONE' || t.phoneChunks.length > 0) {
                if (
                  (t.digits.length >= 7 && blockDigits.includes(t.digits)) ||
                  (t.phoneChunks.length >= 2 && normBlock.includes(t.phoneChunks[1]) && normBlock.includes(t.phoneChunks[2]))
                ) {
                  blockMatchesTarget = true;
                  break;
                }
              } else if (t.isEmail) {
                const domainName = t.emailDomain.split('.')[0] || '';
                const userSuffix = t.emailUser.slice(-4);
                const userPrefix = t.emailUser.slice(0, 4);

                if (
                  normBlock.includes(t.normValue) ||
                  (t.emailUser.length >= 4 && normBlock.includes(t.emailUser)) ||
                  (normBlock.includes('@') && domainName.length >= 3 && normBlock.includes(domainName)) ||
                  (normBlock.includes('@') && userSuffix.length >= 3 && normBlock.includes(userSuffix)) ||
                  (normBlock.includes('@') && userPrefix.length >= 3 && normBlock.includes(userPrefix))
                ) {
                  blockMatchesTarget = true;
                  break;
                }
              } else {
                if (t.normValue.length >= 4 && normBlock.includes(t.normValue)) {
                  blockMatchesTarget = true;
                  break;
                }
              }
            }

            if (blockMatchesTarget) break;
          }

          if (blockMatchesTarget) {
            // Blank out only the text showing operators in this specific sensitive block
            const blankedBlock = block.replace(/(<[0-9a-fA-F]+>|\((?:[^)\\]|\\.)*\))\s*Tj/g, '() Tj');
            streamStr = streamStr.replace(block, blankedBlock);
            streamModified = true;
            actualRedactedCount++;
          }
        }

        // B. Direct literal string replacement (fastest & handles standard unkerned text)
        for (const t of targets) {
          if (streamStr.includes(t.originalValue)) {
            streamStr = streamStr.split(t.originalValue).join(t.replacement);
            streamModified = true;
            actualRedactedCount++;
          }
        }

        // C. Process TJ array operators directly: [(...) -10 (...)] TJ
        const tjArrayRegex = /\[((?:[^\]\\]|\\.)*)\]\s*TJ/g;
        streamStr = streamStr.replace(tjArrayRegex, (match, inner) => {
          let modifiedInner = inner;
          let innerChanged = false;

          for (const t of targets) {
            if (modifiedInner.includes(t.originalValue)) {
              modifiedInner = modifiedInner.split(t.originalValue).join(t.replacement);
              innerChanged = true;
              actualRedactedCount++;
            }

            const repl1 = modifiedInner.replace(t.kerningRegex, t.replacement);
            if (repl1 !== modifiedInner) {
              modifiedInner = repl1;
              innerChanged = true;
              actualRedactedCount++;
            }

            if (t.hex16KerningRegex) {
              const repl2 = modifiedInner.replace(t.hex16KerningRegex, t.hex16Replacement);
              if (repl2 !== modifiedInner) {
                modifiedInner = repl2;
                innerChanged = true;
                actualRedactedCount++;
              }
            }

            const repl3 = modifiedInner.replace(t.hex8KerningRegex, t.hex8Replacement);
            if (repl3 !== modifiedInner) {
              modifiedInner = repl3;
              innerChanged = true;
              actualRedactedCount++;
            }
          }

          if (innerChanged) {
            streamModified = true;
            return `[${modifiedInner}] TJ`;
          }
          return match;
        });

        // D. Process stream with kerning and direct string replacements
        for (const t of targets) {
          const r1 = streamStr.replace(t.kerningRegex, t.replacement);
          if (r1 !== streamStr) {
            streamStr = r1;
            streamModified = true;
            actualRedactedCount++;
          }

          const r2 = streamStr.replace(t.escapedRegex, t.replacement);
          if (r2 !== streamStr) {
            streamStr = r2;
            streamModified = true;
            actualRedactedCount++;
          }

          const r3 = streamStr.replace(t.hex8Regex, t.hex8Replacement);
          if (r3 !== streamStr) {
            streamStr = r3;
            streamModified = true;
            actualRedactedCount++;
          }

          const r4 = streamStr.replace(t.hex8KerningRegex, t.hex8Replacement);
          if (r4 !== streamStr) {
            streamStr = r4;
            streamModified = true;
            actualRedactedCount++;
          }

          if (t.hex16Regex) {
            const r5 = streamStr.replace(t.hex16Regex, t.hex16Replacement);
            if (r5 !== streamStr) {
              streamStr = r5;
              streamModified = true;
              actualRedactedCount++;
            }
          }

          if (t.hex16KerningRegex) {
            const r6 = streamStr.replace(t.hex16KerningRegex, t.hex16Replacement);
            if (r6 !== streamStr) {
              streamStr = r6;
              streamModified = true;
              actualRedactedCount++;
            }
          }
        }

        // E. Safely compress and update stream contents in-place, preserving object dictionary (/Type, /Subtype, /BBox, /Resources, etc.)
        if (streamModified) {
          const compressed = zlib.deflateSync(Buffer.from(streamStr, 'latin1'));
          const streamObj = obj as any;
          if (typeof streamObj.setContents === 'function') {
            streamObj.setContents(compressed);
          } else if (streamObj.contents) {
            streamObj.contents = compressed;
          }
          if (streamObj.dict) {
            streamObj.dict.set(originalPdfDoc.context.obj('Length'), originalPdfDoc.context.obj(compressed.length));
            streamObj.dict.set(originalPdfDoc.context.obj('Filter'), originalPdfDoc.context.obj('FlateDecode'));
          }
        }
      }

      // 2. Sanitize annotations (links, mailto, tooltips) on all pages
      for (const page of pages) {
        const annots = page.node.Annots();
        if (!annots) continue;
        const annotsArray: any[] = typeof (annots as any).asArray === 'function' ? (annots as any).asArray() : [annots];
        for (const annotRef of annotsArray) {
          const annot = originalPdfDoc.context.lookup(annotRef);
          if (!annot) continue;

          // Check action URI (/A -> /URI)
          const action = (annot as any).get ? (annot as any).get(originalPdfDoc.context.obj('A')) : null;
          if (action) {
            const actionDict = originalPdfDoc.context.lookup(action);
            if (actionDict && (actionDict as any).get) {
              const uri = (actionDict as any).get(originalPdfDoc.context.obj('URI'));
              if (uri) {
                const uriStr = uri.asString ? uri.asString() : uri.value || '';
                for (const t of targets) {
                  if (uriStr.toLowerCase().includes(t.originalValue.toLowerCase())) {
                    (actionDict as any).set(
                      originalPdfDoc.context.obj('URI'),
                      originalPdfDoc.context.obj('mailto:redacted@example.com')
                    );
                    actualRedactedCount++;
                  }
                }
              }
            }
          }

          // Check annotation contents (/Contents)
          const contents = (annot as any).get ? (annot as any).get(originalPdfDoc.context.obj('Contents')) : null;
          if (contents) {
            const contentsStr = contents.asString ? contents.asString() : contents.value || '';
            for (const t of targets) {
              if (contentsStr.toLowerCase().includes(t.originalValue.toLowerCase())) {
                (annot as any).set(
                  originalPdfDoc.context.obj('Contents'),
                  originalPdfDoc.context.obj(t.replacement)
                );
                actualRedactedCount++;
              }
            }
          }
        }
      }

      const savedPdfBytes = await originalPdfDoc.save();
      return {
        buffer: Buffer.from(savedPdfBytes),
        redactedCount: Math.max(actualRedactedCount, toRedact.length),
      };
    } catch (err) {
      console.error('PDF redaction error:', err);
      return {
        buffer,
        redactedCount: 0,
      };
    }
  }
}
