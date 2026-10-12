const PHONE_COUNTRIES = [
  {
    name: 'Niger',
    iso: 'NE',
    flag: '🇳🇪',
    dialCode: '+227',
    nationalLength: 8,
    groups: [2, 2, 2, 2],
    exampleNational: '90 12 34 56',
  },
  {
    name: 'Sénégal',
    iso: 'SN',
    flag: '🇸🇳',
    dialCode: '+221',
    nationalLength: 9,
    groups: [2, 3, 2, 2],
    exampleNational: '77 123 45 67',
  },
  {
    name: "Côte d'Ivoire",
    iso: 'CI',
    flag: '🇨🇮',
    dialCode: '+225',
    nationalLength: 10,
    groups: [2, 2, 2, 2, 2],
    exampleNational: '07 01 23 45 67',
  },
  {
    name: 'Burkina Faso',
    iso: 'BF',
    flag: '🇧🇫',
    dialCode: '+226',
    nationalLength: 8,
    groups: [2, 2, 2, 2],
    exampleNational: '70 12 34 56',
  },
  {
    name: 'Mali',
    iso: 'ML',
    flag: '🇲🇱',
    dialCode: '+223',
    nationalLength: 8,
    groups: [2, 2, 2, 2],
    exampleNational: '65 12 34 56',
  },
  {
    name: 'Bénin',
    iso: 'BJ',
    flag: '🇧🇯',
    dialCode: '+229',
    nationalLength: 8,
    groups: [2, 2, 2, 2],
    exampleNational: '90 12 34 56',
  },
  {
    name: 'Togo',
    iso: 'TG',
    flag: '🇹🇬',
    dialCode: '+228',
    nationalLength: 8,
    groups: [2, 2, 2, 2],
    exampleNational: '90 12 34 56',
  },
  {
    name: 'Nigeria',
    iso: 'NG',
    flag: '🇳🇬',
    dialCode: '+234',
    nationalLength: 10,
    groups: [3, 3, 4],
    exampleNational: '803 123 4567',
  },
  {
    name: 'France',
    iso: 'FR',
    flag: '🇫🇷',
    dialCode: '+33',
    nationalLength: 9,
    groups: [1, 2, 2, 2, 2],
    exampleNational: '6 12 34 56 78',
  },
  {
    name: 'États-Unis',
    iso: 'US',
    flag: '🇺🇸',
    dialCode: '+1',
    nationalLength: 10,
    groups: [3, 3, 4],
    exampleNational: '201 555 0123',
  },
  {
    name: 'Maroc',
    iso: 'MA',
    flag: '🇲🇦',
    dialCode: '+212',
    nationalLength: 9,
    groups: [1, 2, 2, 2, 2],
    exampleNational: '6 12 34 56 78',
  },
  {
    name: 'Algérie',
    iso: 'DZ',
    flag: '🇩🇿',
    dialCode: '+213',
    nationalLength: 9,
    groups: [2, 2, 2, 3],
    exampleNational: '55 12 34 567',
  },
];

const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

const normalizePhoneDigits = (value = '') => value.replace(/\D/g, '').replace(/^0+/, '');

const truncateToCountryLength = (country, digits) =>
  normalizePhoneDigits(digits).slice(0, country.nationalLength);

const formatPhoneForDisplay = (country, digitsInput = '') => {
  const digits = truncateToCountryLength(country, digitsInput);
  if (!digits) return '';

  const parts = [];
  let cursor = 0;
  for (const size of country.groups) {
    if (cursor >= digits.length) break;
    const next = digits.slice(cursor, cursor + size);
    if (!next) break;
    parts.push(next);
    cursor += size;
  }

  if (cursor < digits.length) {
    parts.push(digits.slice(cursor));
  }

  return parts.join(' ');
};

const applyPhoneInputChange = (country, rawInput = '') => {
  const digits = truncateToCountryLength(country, rawInput);
  const display = formatPhoneForDisplay(country, digits);
  return { digits, display };
};

const parseStoredPhone = (rawPhone = '') => {
  const compact = String(rawPhone).replace(/\s+/g, '').trim();
  const country = PHONE_COUNTRIES
    .slice()
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((entry) => compact.startsWith(entry.dialCode)) || DEFAULT_PHONE_COUNTRY;

  const nationalPart = compact.startsWith(country.dialCode)
    ? compact.slice(country.dialCode.length)
    : compact.replace(/^\+/, '');

  const { digits, display } = applyPhoneInputChange(country, nationalPart);
  return { country, digits, display };
};

const hasTrivialRepeatedSequence = (digits = '') => {
  if (!digits) return false;
  return new RegExp(`^(\\d)\\1{${Math.max(1, digits.length - 1)}}$`).test(digits);
};

const validatePhone = (country, digitsInput, required = true) => {
  const digits = truncateToCountryLength(country, digitsInput);

  if (!digits) {
    if (required) {
      return {
        isValid: false,
        message: `Le numéro est requis pour ${country.name} (${country.nationalLength} chiffres).`,
      };
    }
    return { isValid: true, message: '' };
  }

  if (digits.length !== country.nationalLength) {
    return {
      isValid: false,
      message: `${country.name}: ${country.nationalLength} chiffres attendus.`,
    };
  }

  if (hasTrivialRepeatedSequence(digits)) {
    return {
      isValid: false,
      message: `${country.name}: numéro invalide (séquence triviale interdite).`,
    };
  }

  return { isValid: true, message: '' };
};

const toBackendPhone = (country, digitsInput) => {
  const digits = truncateToCountryLength(country, digitsInput);
  return digits ? `${country.dialCode} ${digits}` : '';
};

const getPhonePlaceholder = (country) => country.exampleNational;

module.exports = {
  PHONE_COUNTRIES,
  DEFAULT_PHONE_COUNTRY,
  normalizePhoneDigits,
  truncateToCountryLength,
  formatPhoneForDisplay,
  applyPhoneInputChange,
  parseStoredPhone,
  validatePhone,
  toBackendPhone,
  getPhonePlaceholder,
};
