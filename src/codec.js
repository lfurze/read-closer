import pako from 'pako';

/**
 * Encode a data object to a URL-safe compressed string.
 * JSON → pako deflate (raw) → base64url
 */
export function encode(data) {
  const json = JSON.stringify(data);
  const compressed = pako.deflateRaw(new TextEncoder().encode(json));
  return base64urlEncode(compressed);
}

/**
 * Decode a URL-safe compressed string back to a data object.
 * base64url → pako inflate (raw) → JSON
 */
export function decode(encoded) {
  const compressed = base64urlDecode(encoded);
  const json = new TextDecoder().decode(pako.inflateRaw(compressed));
  return JSON.parse(json);
}

function base64urlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str) {
  // Restore standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
