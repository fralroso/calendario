// Enlaces de mapas dentro del campo "Ubicación / Referencia".
// Acepta Google Maps, Apple Maps, Waze u otros: cualquier enlace http(s).

const URL_SOURCE = String.raw`https?:\/\/[^\s]+`;
const BARE_SOURCE = String.raw`(?:www\.)?(?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.apple\.com|maps\.google\.[a-z.]+|google\.[a-z.]+\/maps|waze\.com)[^\s]*`;

function clean(url: string): string | null {
  const trimmed = url.replace(/[.,;:)\]]+$/, '');
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function extractMapLink(text: string): string | null {
  const full = text.match(new RegExp(URL_SOURCE, 'i'));
  if (full) return clean(full[0]);
  const bare = text.match(new RegExp(BARE_SOURCE, 'i'));
  return bare ? clean(`https://${bare[0]}`) : null;
}

// Texto para mostrar: la referencia sin el enlace largo.
export function locationLabel(text: string): string {
  const withoutLinks = text
    .replace(new RegExp(URL_SOURCE, 'gi'), '')
    .replace(new RegExp(BARE_SOURCE, 'gi'), '')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutLinks) return withoutLinks;
  return extractMapLink(text) ? 'Ver en el mapa' : text;
}
