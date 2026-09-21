// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L) pour un code facile à lire à voix haute
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateTrackingCode() {
  let code = 'BM-'
  for (let i = 0; i < 5; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}