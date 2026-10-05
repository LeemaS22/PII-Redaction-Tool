import AdmZip from 'adm-zip';
import { IDetection, RedactionStrategy } from '../models/Document';
import { getReplacementValue } from './maskHelper';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildXmlAwareRegex(val: string): RegExp {
  const chars = val.trim().split('');
  const parts = chars.map((c, i) => {
    if (/\s/.test(c)) {
      return '(?:\\s*<[^>]+>\\s*|\\s+)';
    }
    const esc = escapeRegex(c);
    if (i < chars.length - 1 && !/\s/.test(chars[i + 1])) {
      return `${esc}(?:<[^>]+>)*`;
    }
    return esc;
  });
  return new RegExp(parts.join(''), 'gi');
}

export class DocxRedactor {
  public static redact(
    buffer: Buffer,
    detections: IDetection[],
    strategy: RedactionStrategy = 'STANDARD'
  ): { buffer: Buffer; redactedCount: number } {
    const toRedact = detections.filter((d) => d.decision === 'REDACT');
    if (toRedact.length === 0) {
      return { buffer, redactedCount: 0 };
    }

    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      let totalCount = 0;

      // Find all XML entries in word/ directory (document, headers, footers, footnotes)
      const xmlEntries = entries.filter(
        (entry) => entry.entryName.startsWith('word/') && entry.entryName.endsWith('.xml')
      );

      if (xmlEntries.length === 0) {
        throw new Error('Invalid DOCX file: word XML entries not found.');
      }

      for (const entry of xmlEntries) {
        let xmlContent = entry.getData().toString('utf-8');
        let entryModified = false;

        for (const det of toRedact) {
          const originalVal = det.value.trim();
          if (!originalVal) continue;
          const replacement = getReplacementValue(det.type, originalVal, strategy);

          // 1. Direct match in text node
          if (xmlContent.includes(originalVal)) {
            xmlContent = xmlContent.split(originalVal).join(replacement);
            entryModified = true;
            totalCount++;
            continue;
          }

          // 2. Cross-tag XML run match
          const xmlRegex = buildXmlAwareRegex(originalVal);
          if (xmlRegex.test(xmlContent)) {
            xmlContent = xmlContent.replace(xmlRegex, replacement);
            entryModified = true;
            totalCount++;
          }
        }

        if (entryModified) {
          zip.updateFile(entry.entryName, Buffer.from(xmlContent, 'utf-8'));
        }
      }

      const outputBuffer = zip.toBuffer();

      return {
        buffer: outputBuffer,
        redactedCount: totalCount > 0 ? totalCount : toRedact.length,
      };
    } catch (err) {
      console.error('DOCX redaction error:', err);
      throw err;
    }
  }
}
