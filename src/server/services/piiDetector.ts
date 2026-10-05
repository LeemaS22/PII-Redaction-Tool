export interface DetectedEntity {
  type: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  source: 'REGEX' | 'RULE';
}

export type SupportedDetectionType =
  | 'EMAIL'
  | 'PHONE'
  | 'AADHAAR'
  | 'PAN_NUMBER'
  | 'UPI_ID'
  | 'DRIVING_LICENSE'
  | 'VOTER_ID'
  | 'CREDIT_CARD'
  | 'BANK_ACCOUNT'
  | 'MEDICAL_RECORD_ID'
  | 'EMPLOYEE_ID'
  | 'VEHICLE_REGISTRATION'
  | 'IP_ADDRESS'
  | 'DATE_OF_BIRTH'
  | 'PASSPORT';

export const SUPPORTED_DETECTION_TYPES: SupportedDetectionType[] = [
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
];

function isValidLuhn(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export class PiiDetector {
  public detect(text: string, requestedTypes?: string[]): DetectedEntity[] {
    if (!text || typeof text !== 'string') return [];

    const normalized = requestedTypes
      ? requestedTypes.map((t) => t.toUpperCase())
      : [];
    const isAll = normalized.length === 0 || normalized.includes('ALL');
    const typesToRun = new Set(
      isAll ? SUPPORTED_DETECTION_TYPES : normalized
    );

    const rawDetections: DetectedEntity[] = [];

    // 1. EMAIL DETECTOR
    if (typesToRun.has('EMAIL')) {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
      let match: RegExpExecArray | null;
      while ((match = emailRegex.exec(text)) !== null) {
        rawDetections.push({
          type: 'EMAIL',
          value: match[0],
          confidence: 0.99,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          source: 'REGEX',
        });
      }
    }

    // 2. IP ADDRESS DETECTOR
    if (typesToRun.has('IP_ADDRESS')) {
      const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
      let match: RegExpExecArray | null;
      while ((match = ipRegex.exec(text)) !== null) {
        const start = match.index;
        const prefix = text.slice(Math.max(0, start - 8), start).toLowerCase();
        if (!prefix.includes('v') && !prefix.includes('version')) {
          rawDetections.push({
            type: 'IP_ADDRESS',
            value: match[0],
            confidence: 0.98,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            source: 'REGEX',
          });
        }
      }
    }

    // 3. CREDIT / DEBIT CARD DETECTOR
    if (typesToRun.has('CREDIT_CARD')) {
      const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|6(?:011|5\d{2})\d{12})\b/g;
      let match: RegExpExecArray | null;
      while ((match = cardRegex.exec(text)) !== null) {
        const rawDigits = match[0].replace(/[-\s]/g, '');
        if (rawDigits.length >= 13 && rawDigits.length <= 19) {
          if (!/^(\d)\1+$/.test(rawDigits)) {
            const passesLuhn = isValidLuhn(rawDigits);
            rawDetections.push({
              type: 'CREDIT_CARD',
              value: match[0],
              confidence: passesLuhn ? 0.96 : 0.85, // Lowered from 0.99/0.92
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              source: 'REGEX',
            });
          }
        }
      }
    }

    // 4. AADHAAR NUMBER DETECTOR
    if (typesToRun.has('AADHAAR')) {
      const aadhaarPatterns = [
        /(?<!\d)(?<!\d{4}\s)\b\d{4}\s\d{4}\s\d{4}\b(?!\s*\d{4})(?!\d)/g,
        /(?<!\d)\b\d{4}-\d{4}-\d{4}\b(?!\d)/g,
        /(?:(?:Aadhaar|Aadhar|UID|UIDAI)(?:[\s\w]*?)[:\s#]+)\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/gi,
      ];

      for (const pattern of aadhaarPatterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const fullMatch = match[0];
          const capturedVal = match[1] || fullMatch;
          const offset = fullMatch.lastIndexOf(capturedVal);
          const startIndex = match.index + offset;
          const endIndex = startIndex + capturedVal.length;
          const rawDigits = capturedVal.replace(/\D/g, '');

          // Increased confidence only if explicitly labeled
          const isExplicitlyLabeled = /(?:Aadhaar|Aadhar|UID|UIDAI)/i.test(fullMatch);

          if (rawDigits.length === 12 && !/^(\d)\1+$/.test(rawDigits)) {
            rawDetections.push({
              type: 'AADHAAR',
              value: capturedVal,
              confidence: isExplicitlyLabeled ? 0.98 : 0.90, // Lowered for unlabeled
              startIndex,
              endIndex,
              source: 'REGEX',
            });
          }
        }
      }
    }

    // 5. DATE OF BIRTH (DOB) DETECTOR
    if (typesToRun.has('DATE_OF_BIRTH')) {
      const dobRegex = /\b(?:DOB|Date\s*of\s*Birth|Birth\s*Date|Born\s*on|Born|D\.O\.B\.)(?:[\s\w]*?)[:\s-]+((?:0?[1-9]|[12][0-9]|3[01])[-/.](?:0?[1-9]|1[012]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[-/.](?:19|20)\d\d|(?:19|20)\d\d[-/.](?:0?[1-9]|1[012])[-/.](?:0?[1-9]|[12][0-9]|3[01])|(?:0?[1-9]|[12][0-9]|3[01])\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:19|20)\d\d)\b/gi;
      let match: RegExpExecArray | null;
      while ((match = dobRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const dateValue = match[1];
        if (dateValue) {
          const offset = fullMatch.lastIndexOf(dateValue);
          const startIndex = match.index + offset;
          const endIndex = startIndex + dateValue.length;
          rawDetections.push({
            type: 'DATE_OF_BIRTH',
            value: dateValue,
            confidence: 0.94, // Lowered from 0.98
            startIndex,
            endIndex,
            source: 'REGEX',
          });
        }
      }
    }

    // 6. PHONE NUMBER DETECTOR
    if (typesToRun.has('PHONE')) {
      const phonePatterns = [
        // Standard international format with 5+5 or 3+4 digits (e.g. +91 95662 33743, +91 9876543210, +1 (555) 123-4567)
        /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?[6-9\d]\d{4}\b/g,
        /(?:\+91[\s-]?)?[6-9]\d{9}\b/g,
        /(?:\+91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g,
        /\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,5}[\s-]?\d{4,5}\b/g,
        /(?:(?:Phone|Mobile|Contact|Tel|Telephone|Cell|Mob|Ph)(?:[\s\w]*?)[:\s#]+)(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,5}[\s-]?\d{4,5}\b/gi,
      ];

      for (const pattern of phonePatterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const fullMatch = match[0];
          const numberMatch = fullMatch.match(/(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,5}[\s-]?\d{4,5}|[6-9]\d{9}|[6-9]\d{4}[\s-]?[6-9\d]\d{4}|[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}/);
          const phoneVal = numberMatch ? numberMatch[0] : fullMatch;
          const offset = fullMatch.lastIndexOf(phoneVal);
          const startIndex = match.index + offset;
          const endIndex = startIndex + phoneVal.length;

          const rawDigits = phoneVal.replace(/\D/g, '');

          const isRepetitive = /^(\d)\1+$/.test(rawDigits);
          const startsWithZeros = /^0{3,}/.test(rawDigits);
          const isTimestamp = rawDigits.length === 14 && rawDigits.startsWith('20');
          const isGroupOfFours = /^\d{4}\s\d{4}\s\d{4}/.test(phoneVal);

          if (
            rawDigits.length >= 10 &&
            rawDigits.length <= 15 &&
            !isRepetitive &&
            !startsWithZeros &&
            !isTimestamp &&
            !isGroupOfFours
          ) {
            rawDetections.push({
              type: 'PHONE',
              value: phoneVal,
              confidence: phoneVal.startsWith('+') ? 0.98 : 0.94,
              startIndex,
              endIndex,
              source: 'REGEX',
            });
          }
        }
      }
    }

    // 7. BANK ACCOUNT DETECTOR
    if (typesToRun.has('BANK_ACCOUNT')) {
      const bankRegex = /(?:(?:A\/C|Account|Acct|Bank\s*Account|IBAN)(?:[\s\w]*?)[:\s#]+)(\d{9,18})\b/gi;
      let match: RegExpExecArray | null;
      while ((match = bankRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const accountNum = match[1];
        if (accountNum && !/^(\d)\1+$/.test(accountNum)) {
          const offset = fullMatch.lastIndexOf(accountNum);
          const startIndex = match.index + offset;
          const endIndex = startIndex + accountNum.length;
          rawDetections.push({
            type: 'BANK_ACCOUNT',
            value: accountNum,
            confidence: 0.92,
            startIndex,
            endIndex,
            source: 'REGEX',
          });
        }
      }
    }

    // 8. PASSPORT NUMBER DETECTOR
    if (typesToRun.has('PASSPORT')) {
      const passportRegex = /(?:(?:Passport)(?:[\s\w]*?)[:\s#]+)?\b([A-PR-WYa-pr-wy][1-9]\d{6,8})\b/gi;
      let match: RegExpExecArray | null;
      while ((match = passportRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const passportNum = match[1];
        if (passportNum) {
          const offset = fullMatch.lastIndexOf(passportNum);
          const startIndex = match.index + offset;
          const endIndex = startIndex + passportNum.length;
          rawDetections.push({
            type: 'PASSPORT',
            value: passportNum,
            confidence: fullMatch.toLowerCase().includes('passport') ? 0.98 : 0.88,
            startIndex,
            endIndex,
            source: 'REGEX',
          });
        }
      }
    }

    // 9. PAN NUMBER DETECTOR
    if (typesToRun.has('PAN_NUMBER')) {
      const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
      let match: RegExpExecArray | null;
      while ((match = panRegex.exec(text)) !== null) {
        rawDetections.push({
          type: 'PAN_NUMBER',
          value: match[0],
          confidence: 0.99,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          source: 'REGEX',
        });
      }
    }

    // 10. UPI ID DETECTOR (Conservative pattern: username@upi, username@bank, username@provider)
    if (typesToRun.has('UPI_ID')) {
      const upiRegex = /\b[a-zA-Z0-9.*\-_]{2,64}@[a-zA-Z]{2,16}\b/g;
      let match: RegExpExecArray | null;
      while ((match = upiRegex.exec(text)) !== null) {
        const val = match[0];
        const domainPart = val.split('@')[1] || '';
        // Do not classify email addresses (which contain dots in domain part) as UPI IDs
        if (!domainPart.includes('.')) {
          const startIndex = match.index;
          const endIndex = startIndex + val.length;
          if (startIndex >= 0 && endIndex <= text.length && text.substring(startIndex, endIndex) === val) {
            rawDetections.push({
              type: 'UPI_ID',
              value: val,
              confidence: 0.97,
              startIndex,
              endIndex,
              source: 'REGEX',
            });
          }
        }
      }
    }

    // 11. DRIVING LICENSE DETECTOR
    if (typesToRun.has('DRIVING_LICENSE')) {
      const dlRegex = /\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7}\b/g;
      let match: RegExpExecArray | null;
      while ((match = dlRegex.exec(text)) !== null) {
        rawDetections.push({
          type: 'DRIVING_LICENSE',
          value: match[0],
          confidence: 0.95,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          source: 'REGEX',
        });
      }
    }

    // 12. VOTER ID DETECTOR
    if (typesToRun.has('VOTER_ID')) {
      const voterRegex = /\b[A-Z]{3}[0-9]{7}\b/g;
      let match: RegExpExecArray | null;
      while ((match = voterRegex.exec(text)) !== null) {
        rawDetections.push({
          type: 'VOTER_ID',
          value: match[0],
          confidence: 0.96,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          source: 'REGEX',
        });
      }
    }

    // 13. MEDICAL RECORD ID DETECTOR
    if (typesToRun.has('MEDICAL_RECORD_ID')) {
      const medRegex = /\b(?:MRN|MED|HOSP)[-\s]?\d{6,8}\b/gi;
      let match: RegExpExecArray | null;
      while ((match = medRegex.exec(text)) !== null) {
        rawDetections.push({
          type: 'MEDICAL_RECORD_ID',
          value: match[0],
          confidence: 0.94,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          source: 'REGEX',
        });
      }
    }

    // 14. EMPLOYEE ID DETECTOR
    if (typesToRun.has('EMPLOYEE_ID')) {
      const empRegex = /\b(?:EMP|Employee ID)[-:]?\s*[A-Z0-9]{4,10}\b/gi;
      let match: RegExpExecArray | null;
      while ((match = empRegex.exec(text)) !== null) {
        rawDetections.push({
          type: 'EMPLOYEE_ID',
          value: match[0],
          confidence: 0.93,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          source: 'REGEX',
        });
      }
    }

    // 15. VEHICLE REGISTRATION DETECTOR
    if (typesToRun.has('VEHICLE_REGISTRATION')) {
      const vehRegex = /\b[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}\b/g;
      let match: RegExpExecArray | null;
      while ((match = vehRegex.exec(text)) !== null) {
        rawDetections.push({
          type: 'VEHICLE_REGISTRATION',
          value: match[0],
          confidence: 0.96,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          source: 'REGEX',
        });
      }
    }

    // STEP 1: VALIDATE POSITION AND EXACT SUBSTRING IN SOURCE TEXT
    const validDetections: DetectedEntity[] = [];
    for (const det of rawDetections) {
      if (
        det.startIndex >= 0 &&
        det.endIndex <= text.length &&
        det.startIndex < det.endIndex &&
        text.substring(det.startIndex, det.endIndex) === det.value
      ) {
        validDetections.push(det);
      }
    }

    // STEP 2: REMOVE OVERLAPPING SUB-SPANS (PREFER LONGER MATCHES)
    validDetections.sort((a, b) => (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex));

    const nonOverlapping: DetectedEntity[] = [];
    for (const d of validDetections) {
      const overlaps = nonOverlapping.some(
        (existing) => !(d.endIndex <= existing.startIndex || d.startIndex >= existing.endIndex)
      );
      if (!overlaps) {
        nonOverlapping.push(d);
      }
    }

    // STEP 3: SORT BY START INDEX
    nonOverlapping.sort((a, b) => a.startIndex - b.startIndex);

    return nonOverlapping;
  }
}

export const piiDetector = new PiiDetector();
