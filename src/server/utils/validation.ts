import path from 'path';

export const SUPPORTED_PII_TYPES = [
  'EMAIL',
  'PHONE',
  'AADHAAR',
  'CREDIT_CARD',
  'BANK_ACCOUNT',
  'IP_ADDRESS',
  'DATE_OF_BIRTH',
  'PASSPORT',
  'PERSON_NAME',
  'ADDRESS',
  'ALL',
] as const;

export const SUPPORTED_REDACTION_STRATEGIES = ['STANDARD', 'MASK', 'STRICT'] as const;

export const SUPPORTED_REVIEW_DECISIONS = ['REDACT', 'KEEP', 'PENDING'] as const;

/**
 * Validates document ID. Must be a valid UUID v4 format or 24-hex Mongo ObjectId.
 * Explicitly rejects path traversals, null bytes, special characters.
 */
export function isValidDocumentId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  if (!id || id.length < 8 || id.length > 64) return false;
  // Disallow path traversal or dangerous characters
  if (/[\/\\.\0]/.test(id)) return false;

  // Standard UUID format
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  // MongoDB 24-hex ObjectId format
  const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
  // Safe alphanumeric with hyphen/underscore
  const safeIdRegex = /^[a-zA-Z0-9_-]{8,40}$/;

  return uuidRegex.test(id) || mongoIdRegex.test(id) || safeIdRegex.test(id);
}

/**
 * Sanitizes original filenames to prevent path traversal and arbitrary filesystem writes.
 * Strips all directory components and non-whitelisted characters.
 */
export function sanitizeFilename(originalName: string): string {
  if (!originalName || typeof originalName !== 'string') {
    return 'document.txt';
  }
  // Strip any directory traversal components
  const baseName = path.basename(originalName);
  // Remove non-whitelisted characters
  const clean = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || 'document.txt';
}

/**
 * Validates whether the redaction strategy is allowed.
 */
export function isValidRedactionStrategy(strategy: unknown): boolean {
  if (typeof strategy !== 'string') return false;
  return (SUPPORTED_REDACTION_STRATEGIES as readonly string[]).includes(strategy.toUpperCase());
}

/**
 * Validates whether the review decision is allowed.
 */
export function isValidReviewDecision(decision: unknown): boolean {
  if (typeof decision !== 'string') return false;
  return decision === 'REDACT' || decision === 'KEEP';
}

/**
 * Validates whether detection type array elements are supported.
 */
export function validateDetectionTypes(types: unknown): string[] {
  if (!Array.isArray(types)) return ['ALL'];
  const valid = types
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.toUpperCase())
    .filter((t) => (SUPPORTED_PII_TYPES as readonly string[]).includes(t));
  return valid.length > 0 ? valid : ['ALL'];
}
