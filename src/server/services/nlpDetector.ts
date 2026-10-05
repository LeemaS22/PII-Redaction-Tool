import nlp from 'compromise';

export interface NlpDetectedEntity {
  type: 'PERSON_NAME' | 'ADDRESS';
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  source: 'NLP';
}

const FALSE_POSITIVE_WORDS = new Set([
  // Technical, Databases, & Languages
  'sql',
  'ms sql',
  'mysql',
  'postgresql',
  'nosql',
  'mongodb',
  'oracle',
  'sqlite',
  'database',
  'databases',
  'system',
  'systems',
  'detection',
  'detection system',
  'based',
  'game',
  'flappy bird',
  'ar',
  'vr',
  'ai',
  'ml',
  'deep learning',
  'machine learning',
  'neural network',
  'cnn',
  'rnn',
  'lstm',
  'transformer',
  'bert',
  'gpt',
  'llm',
  'computer science',
  'information technology',
  'software',
  'hardware',
  'developer',
  'engineer',
  'engineering',
  'architect',
  'manager',
  'lead',
  'intern',
  'consultant',
  'analyst',
  'programmer',
  'designer',
  'tester',
  'qa',
  'devops',
  'full stack',
  'frontend',
  'backend',
  'web',
  'mobile',
  'android',
  'ios',
  'react',
  'angular',
  'vue',
  'node',
  'nodejs',
  'express',
  'python',
  'java',
  'javascript',
  'typescript',
  'c++',
  'c#',
  'golang',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'html',
  'css',
  'git',
  'github',
  'docker',
  'kubernetes',
  'aws',
  'azure',
  'gcp',
  'linux',
  'windows',
  'unix',
  'rest api',
  'api',
  'sdk',
  'json',
  'xml',
  'http',
  'https',
  'project',
  'projects',
  'experience',
  'education',
  'skills',
  'certifications',
  'summary',
  'objective',
  'achievements',
  'awards',
  'languages',
  'tools',
  'frameworks',
  'libraries',
  'platform',
  'platforms',
  'application',
  'applications',
  'algorithm',
  'algorithms',
  'model',
  'models',
  'method',
  'methods',
  'service',
  'services',
  'solution',
  'solutions',
  'keratoconus',
  'artificial intelligence',
  'cyber security',
  'medical department',
  'human resources',
  'patient records',
  'health insurance',
  'redactx',
  'healthlens ai',
  'healthlens',

  // Corporate & Organizational Terms
  'hospital',
  'clinic',
  'university',
  'college',
  'school',
  'institute',
  'laboratory',
  'corporation',
  'company',
  'limited',
  'llc',
  'inc',
  'technologies',
  'division',
  'department',

  // Geographic names
  'india',
  'united states',
  'chennai',
  'bangalore',
  'bengaluru',
  'mumbai',
  'delhi',
  'hyderabad',
  'coimbatore',
  'kolkata',
  'pune',
  'tamil nadu',
  'karnataka',
  'maharashtra',

  // Calendar
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const ACTION_VERBS =
  /^(?:Developed|Created|Built|Designed|Implemented|Engineered|Managed|Worked|Tested|Led|Maintained|Deployed|Automated|Optimized|Authored|Published|Learned|Studied|Achieved|Completed)\b/i;

const STREET_TOKEN =
  /\b(?:Nagar|Road|Rd\b|Street|St\b|Lane|Colony|Layout|Marg|Sector\s*\d+|Block\s*[A-Za-z\d]+|Apartments?|Apts?|Puram|Enclave|Gali|Chowk|Heights|Society|Drive|Avenue|Ave\b|Boulevard|Blvd\b)\b/i;

function isValidPersonName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 50) return false;

  const lower = clean.toLowerCase();
  if (FALSE_POSITIVE_WORDS.has(lower)) return false;

  const words = clean.split(/\s+/);
  if (words.length < 1 || words.length > 4) return false;

  for (const w of words) {
    const wLower = w.toLowerCase();
    if (FALSE_POSITIVE_WORDS.has(wLower)) return false;
    if (!/^[A-Z][a-z]{1,20}$/.test(w) && !/^[A-Z]\.?$/.test(w) && !/^[A-Z]{2,20}$/.test(w)) {
      return false;
    }
  }

  return true;
}

export class NlpDetector {
  public detect(text: string, requestedTypes?: string[]): NlpDetectedEntity[] {
    if (!text || typeof text !== 'string') return [];

    const normalized = requestedTypes ? requestedTypes.map((t) => t.toUpperCase()) : [];
    const isAll = normalized.length === 0 || normalized.includes('ALL');
    const typesSet = new Set(isAll ? ['PERSON_NAME', 'ADDRESS'] : normalized);

    const detections: NlpDetectedEntity[] = [];

    // ========================================================
    // 1. PERSON_NAME DETECTION (Local NER + Precise Context Rules)
    // ========================================================
    if (typesSet.has('PERSON_NAME')) {
      // Strategy A: Contextual Name Labels (e.g. "Patient Name: Rahul Verma", "Client Name: Priya Sharma", "Consultant: Vikram Seth")
      const labelRegex =
        /\b(?:(?:Patient|Employee|Customer|Applicant|Doctor|Client|Owner|Contact|Candidate|Consultant|Author|User|Student|Physician)\s+(?:Name\s*)?|(?:Full\s+)?Name)\s*[:=]\s*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3})\b/g;
      let m: RegExpExecArray | null;
      while ((m = labelRegex.exec(text)) !== null) {
        const fullMatch = m[0];
        const nameVal = m[1];
        if (nameVal && isValidPersonName(nameVal)) {
          const offset = fullMatch.lastIndexOf(nameVal);
          const start = m.index + offset;
          const end = start + nameVal.length;
          detections.push({
            type: 'PERSON_NAME',
            value: nameVal,
            confidence: 0.98,
            startIndex: start,
            endIndex: end,
            source: 'NLP',
          });
        }
      }

      // Strategy B: Honorific Names (e.g. "Dr. Ananya Iyer", "Mr. Vikram Seth", "Prof. Rahul Kumar")
      const honorificRegex =
        /\b(?:Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Er\.|Shri|Smt\.)\s+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3})\b/g;
      while ((m = honorificRegex.exec(text)) !== null) {
        const fullMatch = m[0];
        const nameVal = m[1];
        if (nameVal && isValidPersonName(nameVal)) {
          const offset = fullMatch.lastIndexOf(nameVal);
          const start = m.index + offset;
          const end = start + nameVal.length;
          const alreadyCaptured = detections.some(
            (d) => d.type === 'PERSON_NAME' && d.startIndex === start && d.endIndex === end
          );
          if (!alreadyCaptured) {
            detections.push({
              type: 'PERSON_NAME',
              value: nameVal,
              confidence: 0.96,
              startIndex: start,
              endIndex: end,
              source: 'NLP',
            });
          }
        }
      }

      // Strategy D: Receipt / Payment Name Labels (e.g. "To\nVISTAS", "From\nS Leema")
      const receiptLabelRegex = /\b(?:To|From|Payee|Payer|Sender|Receiver|Merchant)\s*[\r\n]+\s*([A-Z][A-Za-z0-9\s]{1,40})\b/g;
      while ((m = receiptLabelRegex.exec(text)) !== null) {
        const fullMatch = m[0];
        const nameVal = m[1].trim();
        if (nameVal && !FALSE_POSITIVE_WORDS.has(nameVal.toLowerCase())) {
          const offset = fullMatch.lastIndexOf(nameVal);
          const start = m.index + offset;
          const end = start + nameVal.length;
          const alreadyCaptured = detections.some(
            (d) => d.type === 'PERSON_NAME' && d.startIndex === start && d.endIndex === end
          );
          if (!alreadyCaptured) {
            detections.push({
              type: 'PERSON_NAME',
              value: nameVal,
              confidence: 0.97,
              startIndex: start,
              endIndex: end,
              source: 'NLP',
            });
          }
        }
      }

      // Strategy C: Compromise Local NER with strict validation
      try {
        const doc = nlp(text);
        const people = doc.people().json();

        for (const p of people) {
          const rawVal = p.text.trim();
          const cleanVal = rawVal.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');

          if (isValidPersonName(cleanVal)) {
            let searchIndex = 0;
            while ((searchIndex = text.indexOf(cleanVal, searchIndex)) !== -1) {
              const start = searchIndex;
              const end = start + cleanVal.length;

              const beforeChar = start > 0 ? text[start - 1] : ' ';
              const afterChar = end < text.length ? text[end] : ' ';
              const isWordBoundary =
                /[\s\n\r,.:;()|[\]\-#]/.test(beforeChar) && /[\s\n\r,.:;()|[\]\-#]/.test(afterChar);

              if (isWordBoundary) {
                const alreadyCaptured = detections.some(
                  (d) =>
                    d.type === 'PERSON_NAME' &&
                    ((start >= d.startIndex && end <= d.endIndex) ||
                      (d.startIndex >= start && d.endIndex <= end))
                );

                if (!alreadyCaptured) {
                  detections.push({
                    type: 'PERSON_NAME',
                    value: cleanVal,
                    confidence: 0.92,
                    startIndex: start,
                    endIndex: end,
                    source: 'NLP',
                  });
                }
              }

              searchIndex += cleanVal.length;
            }
          }
        }
      } catch (nerErr) {
        console.warn('Compromise NER warning:', nerErr);
      }
    }

    // ========================================================
    // 2. ADDRESS DETECTION (Indian & International Patterns)
    // ========================================================
    if (typesSet.has('ADDRESS')) {
      const lines = text.split(/\r?\n/);
      let lineOffset = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        // Check and ignore technical lines such as "IP Address: 192.168.1.1" or "Email Address: foo@bar.com"
        const isTechnicalAddressLine =
          /\b(?:IP|Email|MAC|Web|Memory|Network|Server|Host)\s*Address/i.test(line);

        if (!isTechnicalAddressLine) {
          // Pattern A: Labeled Address (e.g. "Address: 42 Palm Grove Avenue, Chennai, Tamil Nadu - 600028")
          const labeledMatch = line.match(
            /(?<!\b(?:IP|Email|MAC|Web|Memory|Network|Server|Host)\s*)\b(?:(?:Permanent|Current|Residential|Home|Office|Mailing|Billing|Shipping|Postal|Contact)?\s*Address|Residing\s*(?:at|in))\s*[:=]\s*(.+)$/i
          );

          if (labeledMatch && labeledMatch[1]) {
            const rawAddr = labeledMatch[1].trim();
            const cleanAddr = rawAddr.replace(/^[:#-]\s*/, '').replace(/[,;.\s]+$/, '');

            if (cleanAddr.length >= 8 && !ACTION_VERBS.test(cleanAddr)) {
              const start = lineOffset + line.indexOf(cleanAddr);
              const end = start + cleanAddr.length;
              detections.push({
                type: 'ADDRESS',
                value: cleanAddr,
                confidence: 0.96,
                startIndex: start,
                endIndex: end,
                source: 'NLP',
              });
            }
          } else if (!ACTION_VERBS.test(trimmed)) {
            // Pattern B: Structural Unlabeled Address (must have building/plot/flat/door identifier AND street token)
            // e.g. "Flat 4B, Silver Heights, MG Road, Bangalore, Karnataka - 560001"
            // or "14 KBR Park Road, Jubilee Hills, Hyderabad, Telangana - 500033"
            const structMatch = line.match(
              /\b(?:(?:Flat|Plot|Door|House|Building|Room|Apartment|Villa|Suite|Unit|Block)\s*(?:No\.?)?\s*[\dA-Za-z\/-]+|(?:No\.?\s*)?\d{1,4}[A-Za-z]?(?:\/\d+)?)[,\s]+[A-Za-z0-9\s,.-]+?\b(?:Nagar|Road|Rd\b|Street|St\b|Lane|Colony|Layout|Marg|Sector\s*\d+|Block\s*[A-Za-z\d]+|Apartments?|Apts?|Puram|Enclave|Gali|Chowk|Heights|Society|Drive|Avenue|Ave\b|Boulevard|Blvd\b)(?:[,\s]+[A-Za-z\s]+)*(?:[,\s]+(?:Tamil Nadu|Karnataka|Maharashtra|Telangana|Delhi|Gujarat|Kerala|Andhra Pradesh|UP|Uttar Pradesh|Rajasthan|Punjab|Haryana|West Bengal|[A-Za-z\s]+))?(?:\s*-\s*[0-9]{5,6}|\s+[0-9]{5,6})?/i
            );

            if (structMatch && structMatch[0]) {
              const rawAddr = structMatch[0].trim();
              const cleanAddr = rawAddr.replace(/[,;.\s]+$/, '');

              if (
                cleanAddr.length >= 12 &&
                STREET_TOKEN.test(cleanAddr) &&
                !ACTION_VERBS.test(cleanAddr)
              ) {
                const start = lineOffset + line.indexOf(cleanAddr);
                const end = start + cleanAddr.length;
                detections.push({
                  type: 'ADDRESS',
                  value: cleanAddr,
                  confidence: 0.92,
                  startIndex: start,
                  endIndex: end,
                  source: 'NLP',
                });
              }
            }
          }
        }

        lineOffset += line.length + 1; // +1 for newline character
      }
    }

    // ========================================================
    // 3. OVERLAP RESOLUTION
    // ========================================================
    // If a PERSON_NAME falls completely inside an ADDRESS (e.g., "Anna" in "24 Anna Nagar"), keep ADDRESS
    const addresses = detections.filter((d) => d.type === 'ADDRESS');
    const nonOverlappingWithAddress = detections.filter((d) => {
      if (d.type === 'PERSON_NAME') {
        return !addresses.some((a) => d.startIndex >= a.startIndex && d.endIndex <= a.endIndex);
      }
      return true;
    });

    // ========================================================
    // 4. SUBSTRING INVARIANCE GUARANTEE
    // ========================================================
    return nonOverlappingWithAddress.filter(
      (d) =>
        d.startIndex >= 0 &&
        d.endIndex <= text.length &&
        d.startIndex < d.endIndex &&
        text.slice(d.startIndex, d.endIndex) === d.value
    );
  }
}

export const nlpDetector = new NlpDetector();
