const getPasswordChecks = (password = '') => ({
  minLength: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[!@#$%^&*(),.?":{}|<>\-_[\]\\/+=~`]/.test(password),
  noSpaces: !/\s/.test(password),
});

const getPasswordStrength = (password = '') => {
  const checks = getPasswordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;

  if (score <= 2) {
    return { score, label: 'Faible', color: '#EF4444' };
  }
  if (score <= 4) {
    return { score, label: 'Moyen', color: '#F59E0B' };
  }
  if (score === 5) {
    return { score, label: 'Fort', color: '#84CC16' };
  }
  return { score, label: 'Très fort', color: '#16A34A' };
};

const validatePassword = (password = '') => {
  const checks = getPasswordChecks(password);
  const valid =
    checks.minLength && checks.upper && checks.lower && checks.number && checks.special && checks.noSpaces;

  const message = valid
    ? ''
    : 'Mot de passe invalide: 8 caractères min, majuscule, minuscule, chiffre, spécial, sans espace.';

  return { valid, checks, message };
};

module.exports = {
  getPasswordChecks,
  getPasswordStrength,
  validatePassword,
};
