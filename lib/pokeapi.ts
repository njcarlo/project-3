// PokeAPI's default slug for these doesn't match the plain species name
// because they have multiple named forms with no unsuffixed alias.
const SLUG_OVERRIDES: Record<string, string> = {
  Keldeo: "keldeo-ordinary",
  Zygarde: "zygarde-50",
};

// Maps a Mezastar catalog name (e.g. "Alolan Ninetales", "Sirfetch'd") to the
// slug PokeAPI expects (e.g. "ninetales-alola", "sirfetchd").
export function toPokeApiSlug(name: string): string {
  if (SLUG_OVERRIDES[name.trim()]) return SLUG_OVERRIDES[name.trim()];

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

interface PokeApiLookup {
  cryUrl: string | null;
  artworkUrl: string | null;
}

const lookupCache = new Map<string, PokeApiLookup>();

async function lookupPokemon(pokemonName: string): Promise<PokeApiLookup> {
  const slug = toPokeApiSlug(pokemonName);
  const cached = lookupCache.get(slug);
  if (cached) return cached;

  const empty: PokeApiLookup = { cryUrl: null, artworkUrl: null };

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`);
  if (!res.ok) {
    lookupCache.set(slug, empty);
    return empty;
  }

  const data = await res.json();
  const result: PokeApiLookup = {
    cryUrl: data?.cries?.latest ?? data?.cries?.legacy ?? null,
    artworkUrl:
      data?.sprites?.other?.["official-artwork"]?.front_default ??
      data?.sprites?.front_default ??
      null,
  };
  lookupCache.set(slug, result);
  return result;
}

export async function getCryUrl(pokemonName: string): Promise<string | null> {
  return (await lookupPokemon(pokemonName)).cryUrl;
}

export async function getArtworkUrl(pokemonName: string): Promise<string | null> {
  return (await lookupPokemon(pokemonName)).artworkUrl;
}
