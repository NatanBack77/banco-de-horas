// Lightweight password hashing — local app, offline. Not for prod-grade security.
// For real production use crypto-js or bcrypt with proper salt.
export function hashPassword(plain: string): string {
  let h = 5381;
  for (let i = 0; i < plain.length; i++) h = ((h << 5) + h) + plain.charCodeAt(i);
  return 'b1$' + (h >>> 0).toString(36) + '$' + plain.length;
}

export function verifyPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash;
}
