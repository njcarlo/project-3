// The official Mezastar site (world.pokemonmezastar.com) serves tag artwork
// from a predictable CDN path per Stardust version:
//   ver1 -> pm_en_1-1-{number}_f.png
//   ver2 -> pm_en_1-2-{number}_f.jpg
//   ver3 -> pm_en_1-3-{number}_f.jpg
// `number` is the same zero-padded 3-digit tag number used in our seed data.
const EXTENSION_BY_VERSION: Record<number, string> = {
  1: "png",
  2: "jpg",
  3: "jpg",
};

export function buildOfficialTagImageUrl(
  version: number,
  number: string
): string | null {
  const ext = EXTENSION_BY_VERSION[version];
  if (!ext) return null;
  return `https://webassets-pokemonmezastar.marv.jp/assets/img/ver${version}/pm_en_1-${version}-${number}_f.${ext}`;
}

export async function getOfficialTagImageUrl(
  version: number,
  number: string
): Promise<string | null> {
  const url = buildOfficialTagImageUrl(version, number);
  if (!url) return null;

  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}
