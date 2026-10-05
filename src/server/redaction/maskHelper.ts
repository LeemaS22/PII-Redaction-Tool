import { RedactionStrategy } from '../models/Document';

export function getReplacementValue(
  type: string,
  originalValue: string,
  strategy: RedactionStrategy = 'STANDARD'
): string {
  if (!originalValue) return '[REDACTED]';
  const clean = originalValue.trim();

  // STANDARD & STRICT modes replace sensitive values with [REDACTED]
  if (strategy === 'STANDARD' || strategy === 'STRICT') {
    return '[REDACTED]';
  }

  // MASK mode applies type-specific partial masking
  switch (type.toUpperCase()) {
    case 'PERSON_NAME': {
      const words = clean.split(/\s+/);
      return words
        .map((w) => (w.length > 1 ? `${w[0]}****` : `${w}*`))
        .join(' ');
    }

    case 'ADDRESS': {
      const parts = clean.split(',');
      if (parts.length > 1) {
        return parts.map((p) => p.trim().slice(0, 2) + '****').join(', ');
      }
      return `${clean.slice(0, 3)}**** [Address Masked]`;
    }

    case 'EMAIL': {
      const parts = clean.split('@');
      if (parts.length === 2) {
        const local = parts[0];
        const domain = parts[1];
        if (local.length <= 2) {
          return `${local[0] || ''}****@${domain}`;
        }
        return `${local[0]}****@${domain}`;
      }
      return 'e****@domain.com';
    }

    case 'PHONE': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length >= 4) {
        const last4 = digits.slice(-4);
        const prefix = clean.startsWith('+') ? '+** ' : '';
        return `${prefix}******${last4}`;
      }
      return '******3210';
    }

    case 'AADHAAR': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length >= 4) {
        return `**** **** ${digits.slice(-4)}`;
      }
      return '**** **** 9012';
    }

    case 'CREDIT_CARD': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length >= 4) {
        return `************${digits.slice(-4)}`;
      }
      return '************1111';
    }

    case 'BANK_ACCOUNT': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length >= 4) {
        return `********${digits.slice(-4)}`;
      }
      return '********1234';
    }

    case 'PASSPORT': {
      if (clean.length >= 2) {
        return `${clean[0]}******${clean.slice(-1)}`;
      }
      return 'A******7';
    }

    case 'IP_ADDRESS': {
      const octets = clean.split('.');
      if (octets.length === 4) {
        return `${octets[0]}.${octets[1]}.*.*`;
      }
      return '192.168.*.*';
    }

    case 'DATE_OF_BIRTH': {
      return '**/**/****';
    }

    default:
      return '[REDACTED]';
  }
}
