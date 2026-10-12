/**
 * Politique de mot de passe : sûre ET simple pour le grand public.
 * Obligatoire : 8 caractères, au moins une lettre et un chiffre, sans espace.
 * Majuscule et caractère spécial renforcent la force affichée sans être imposés.
 * (Le backend exige au minimum 6 caractères.)
 */
const getPasswordChecks = (password = '') => ({
  minLength: password.length >= 8,
  letter: /[A-Za-zÀ-ÿ]/.test(password),
  number: /\d/.test(password),
  noSpaces: password.length > 0 && !/\s/.test(password),
  upper: /[A-Z]/.test(password),
  special: /[^A-Za-z0-9À-ÿ\s]/.test(password),
});

const REQUIRED = ['minLength', 'letter', 'number', 'noSpaces'];

const getPasswordStrength = (password = '') => {
  if (!password) return { score: 0, label: '', color: '#ECEAE5' };
  const c = getPasswordChecks(password);
  const required = REQUIRED.every((k) => c[k]);
  let score = REQUIRED.filter((k) => c[k]).length; // 0..4
  if (required) score += (c.upper ? 1 : 0) + (c.special ? 1 : 0) + (password.length >= 12 ? 1 : 0); // jusqu'à 7
  if (!required) return { score, label: 'Trop faible', color: '#E5484D' };
  if (score <= 4) return { score, label: 'Correct', color: '#E8A13A' };
  if (score <= 5) return { score, label: 'Fort', color: '#30A08B' };
  return { score, label: 'Très fort', color: '#1E9E6A' };
};

const validatePassword = (password = '') => {
  const checks = getPasswordChecks(password);
  const valid = REQUIRED.every((k) => checks[k]);
  return {
    valid,
    checks,
    message: valid ? '' : '8 caractères minimum, avec au moins une lettre et un chiffre, sans espace.',
  };
};

module.exports = {
  getPasswordChecks,
  getPasswordStrength,
  validatePassword,
};
