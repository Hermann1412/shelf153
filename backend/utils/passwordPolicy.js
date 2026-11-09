// 8 to 64 characters: long enough to allow passphrases, short enough to stay within bcrypt's
// 72-byte input limit for ordinary text.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const PASSWORD_RULE_MESSAGE = `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`;

export const isValidPassword = (value) =>
  typeof value === "string" && value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX;

// A session token created before the last password change is no longer accepted, so changing
// a password signs out every other device. JWT `iat` is in whole seconds.
export const isTokenRevoked = (user, decoded) =>
  Boolean(user.password_changed_at)
  && Number(decoded.iat) < Math.floor(new Date(user.password_changed_at).getTime() / 1000);
