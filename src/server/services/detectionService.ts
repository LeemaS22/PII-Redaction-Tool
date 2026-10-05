import { piiDetector } from './piiDetector';
import { nlpDetector } from './nlpDetector';

export interface MergedDetection {
  type: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  source: 'REGEX' | 'RULE' | 'NLP';
}

export const ALL_SUPPORTED_TYPES = [
  'EMAIL',
  'PHONE',
  'AADHAAR',
  'PAN_NUMBER',
  'UPI_ID',
  'DRIVING_LICENSE',
  'VOTER_ID',
  'CREDIT_CARD',
  'BANK_ACCOUNT',
  'MEDICAL_RECORD_ID',
  'EMPLOYEE_ID',
  'VEHICLE_REGISTRATION',
  'IP_ADDRESS',
  'DATE_OF_BIRTH',
  'PASSPORT',
  'PERSON_NAME',
  'ADDRESS',
];

export class DetectionService {
  public static detectAll(text: string, requestedTypes?: string[]): MergedDetection[] {
    if (!text || typeof text !== 'string') return [];

    const normalizedRequested = requestedTypes
      ? requestedTypes.map((t) => t.toUpperCase())
      : [];
    const isAll = normalizedRequested.length === 0 || normalizedRequested.includes('ALL');
    const effectiveTypes = isAll ? ALL_SUPPORTED_TYPES : normalizedRequested;

    const regexTypes = effectiveTypes.filter((t) => t !== 'PERSON_NAME' && t !== 'ADDRESS');
    const nlpTypes = effectiveTypes.filter((t) => t === 'PERSON_NAME' || t === 'ADDRESS');

    // 1. Run Regex / Rule detection
    let regexDetections: MergedDetection[] = [];
    if (regexTypes.length > 0) {
      const results = piiDetector.detect(text, regexTypes);
      regexDetections = results.map((d) => ({
        type: d.type,
        value: d.value,
        confidence: d.confidence,
        startIndex: d.startIndex,
        endIndex: d.endIndex,
        source: (d.source || 'REGEX') as 'REGEX' | 'RULE',
      }));
    }

    // 2. Run NLP detection
    let nlpDetections: MergedDetection[] = [];
    if (nlpTypes.length > 0) {
      const results = nlpDetector.detect(text, nlpTypes);
      nlpDetections = results.map((d) => ({
        type: d.type,
        value: d.value,
        confidence: d.confidence,
        startIndex: d.startIndex,
        endIndex: d.endIndex,
        source: 'NLP',
      }));
    }

    // 3. Combine detections
    const combined: MergedDetection[] = [...regexDetections, ...nlpDetections];

    // 4. Validate exact substring in original text
    const validDetections = combined.filter(
      (d) =>
        d.startIndex >= 0 &&
        d.endIndex <= text.length &&
        d.startIndex < d.endIndex &&
        text.slice(d.startIndex, d.endIndex) === d.value
    );

    // 5. Span-based Deduplication & Conflict Resolution
    // Prefer REGEX on exact span match, and prefer longer specific spans on overlap
    validDetections.sort((a, b) => {
      // Primary: longer spans first
      const lenDiff = (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
      if (lenDiff !== 0) return lenDiff;
      // Secondary: REGEX over NLP on identical length
      if (a.source === 'REGEX' && b.source === 'NLP') return -1;
      if (b.source === 'REGEX' && a.source === 'NLP') return 1;
      return 0;
    });

    const nonOverlapping: MergedDetection[] = [];
    for (const d of validDetections) {
      const overlaps = nonOverlapping.some((existing) => {
        // Check for partial or full overlapping span
        const hasOverlap = !(d.endIndex <= existing.startIndex || d.startIndex >= existing.endIndex);
        return hasOverlap;
      });

      if (!overlaps) {
        nonOverlapping.push(d);
      }
    }

    // 6. Sort chronologically by startIndex ascending
    nonOverlapping.sort((a, b) => a.startIndex - b.startIndex);

    return nonOverlapping;
  }
}

export const detectionService = DetectionService;
