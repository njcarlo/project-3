// Maps a Mezastar catalog name (e.g. "Alolan Ninetales", "Sirfetch'd") to the
// slug PokeAPI expects (e.g. "ninetales-alola", "sirfetchd").
export function toPokeApiSlug(name: string): string {
  let n = name.trim();
  let suffix = "";

  const regionalPrefixes: [string, string][] = [
    ["Alolan ", "-alola"],
    ["Galarian ", "-galar"],
    ["Hisuian ", "-hisui"],
    ["Paldean ", "-paldea"],
  ];

  for (const [prefix, formSuffix] of regionalPrefixes) {
    if (n.startsWith(prefix)) {
      n = n.slice(prefix.length);
      suffix = formSuffix;
      break;
    }
  }

  const slug = n
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/\s+/g, "-");

  return slug + suffix;
}

const cryCache = new Map<string, string | null>();

export async function getCryUrl(pokemonName: string): Promise<string | null> {
  const slug = toPokeApiSlug(pokemonName);
  const cached = cryCache.get(slug);
  if (cached !== undefined) return cached;

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`);
  if (!res.ok) {
    cryCache.set(slug, null);
    return null;
  }

  const data = await res.json();
  const url: string | null = data?.cries?.latest ?? data?.cries?.legacy ?? null;
  cryCache.set(slug, url);
  return url;
}
