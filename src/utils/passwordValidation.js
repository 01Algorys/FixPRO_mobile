import { t } from '../i18n';
export const PASSWORD_REQUIREMENTS = [
  {
    key: 'length',
    label: t('auth.pwLength'),
    test: (p) => p.length >= 8,
  },
  {
    key: 'uppercase',
    label: t('auth.pwUpper'),
    test: (p) => /[A-Z]/.test(p),
  },
  {
    key: 'lowercase',
    label: t('auth.pwLower'),
    test: (p) => /[a-z]/.test(p),
  },
  {
    key: 'number',
    label: t('auth.pwDigit'),
    test: (p) => /[0-9]/.test(p),
  },
  {
    key: 'special',
    label: t('auth.pwSpecial'),
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
