import { IDetection, RedactionStrategy } from '../models/Document';
import { getReplacementValue } from './maskHelper';

export class TxtRedactor {
  public static redact(
    buffer: Buffer,
    detections: IDetection[],
    strategy: RedactionStrategy = 'STANDARD'
  ): { buffer: Buffer; redactedCount: number } {
    let text = buffer.toString('utf-8');

    // 1. Filter only detections confirmed with decision === 'REDACT'
    const toRedact = detections.filter((d) => d.decision === 'REDACT');
    if (toRedact.length === 0) {
      return { buffer, redactedCount: 0 };
    }

    // 2. Resolve conflicts & overlaps: sort by startIndex ascending, remove sub-spans
    toRedact.sort((a, b) => a.startIndex - b.startIndex);
    const nonOverlapping: IDetection[] = [];
    for (const d of toRedact) {
      const overlaps = nonOverlapping.some(
        (existing) => !(d.endIndex <= existing.startIndex || d.startIndex >= existing.endIndex)
      );
      if (!overlaps) {
        nonOverlapping.push(d);
      }
    }

    // 3. Sort in descending order of startIndex so index offsets do not shift earlier spans
    nonOverlapping.sort((a, b) => b.startIndex - a.startIndex);

    let count = 0;
    for (const det of nonOverlapping) {
      if (det.startIndex >= 0 && det.endIndex <= text.length && det.startIndex < det.endIndex) {
        const replacement = getReplacementValue(det.type, det.value, strategy);
        text = text.slice(0, det.startIndex) + replacement + text.slice(det.endIndex);
        count++;
      }
    }

    return {
      buffer: Buffer.from(text, 'utf-8'),
      redactedCount: count,
    };
  }
}
