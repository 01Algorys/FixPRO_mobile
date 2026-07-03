export const PASSWORD_REQUIREMENTS = [
  {
    key: 'length',
    label: 'Au moins 8 caractères',
    test: (p) => p.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'Une lettre majuscule (A-Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    key: 'lowercase',
    label: 'Une lettre minuscule (a-z)',
    test: (p) => /[a-z]/.test(p),
  },
  {
    key: 'number',
    label: 'Un chiffre (0-9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    key: 'special',
    label: 'Un caractère spécial (!@#$%...)',
    test: (p) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(p),
  },
];

/**
 * Returns each requirement annotated with whether the given password satisfies it.
 */
export const validatePassword = (password) =>
  PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    satisfied: Boolean(password) && req.test(password),
  }));

/**
 * Returns true only when every requirement is satisfied.
 */
export const isPasswordValid = (password) =>
  Boolean(password) && PASSWORD_REQUIREMENTS.every((req) => req.test(password));
