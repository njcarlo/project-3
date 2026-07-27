/**
 * One-time/idempotent catalog importer. Run with: npm run seed
 * Reads seed/series-*.json + seed/images/**, writes to catalogSeries and
 * catalogItems via the Admin SDK. Not part of the app's request-serving path.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { adminDb, adminStorage } from "../lib/firebase/admin";
import { getArtworkUrl } from "../lib/pokeapi";
import { getOfficialTagImageUrl } from "../lib/mezastarImages";

interface SeedItem {
  number: string;
  name: string;
  rarity: string;
  imageFile: string;
  notes: string;
}

interface SeedFile {
  series: {
    id: string;
    name: string;
    releaseDate: string;
    description: string;
    coverImageUrl: string;
  };
  items: SeedItem[];
}

const SEED_DIR = join(__dirname, "..", "seed");
const IMAGES_DIR = join(SEED_DIR, "images");

// Priority: 1) a hand-collected local override under seed/images/,
// 2) the actual Mezastar disc art hotlinked from the official site's CDN,
// 3) the Pokemon's official artwork from PokeAPI as a last-resort fallback
// so every item still gets a real image even if the official CDN path
// doesn't resolve for it.
async function resolveImageUrl(
  seriesId: string,
  number: string,
  imageFile: string,
  pokemonName: string
): Promise<string> {
  const localPath = join(IMAGES_DIR, imageFile);
  if (existsSync(localPath)) {
    const bucket = adminStorage.bucket();
    const destination = `catalog/${seriesId}/${number}${extname(imageFile)}`;
    await bucket.upload(localPath, {
      destination,
      metadata: { cacheControl: "public, max-age=31536000" },
    });
    const file = bucket.file(destination);
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${destination}`;
  }

  const versionMatch = seriesId.match(/stardust-(\d+)/);
  if (versionMatch) {
    const officialUrl = await getOfficialTagImageUrl(
      Number(versionMatch[1]),
      number
    );
    if (officialUrl) return officialUrl;
  }

  const artworkUrl = await getArtworkUrl(pokemonName);
  if (!artworkUrl) {
    console.warn(`  ! no image found at all for: ${pokemonName}`);
    return "";
  }
  console.warn(
    `  ! no official Mezastar art for ${pokemonName} (${seriesId}-${number}), using PokeAPI artwork`
  );
  return artworkUrl;
}

async function importSeriesFile(filePath: string) {
  const seed = JSON.parse(readFileSync(filePath, "utf-8")) as SeedFile;
  const { series, items } = seed;

  console.log(`Importing ${series.name} (${series.id}) — ${items.length} items`);

  await adminDb
    .collection("catalogSeries")
    .doc(series.id)
    .set(
      {
        name: series.name,
        releaseDate: series.releaseDate,
        description: series.description,
        coverImageUrl: series.coverImageUrl,
        itemCount: items.length,
        status: "seed",
      },
      { merge: true }
    );

  const batchSize = 400; // stay under Firestore's 500-write batch limit
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = adminDb.batch();
    const chunk = items.slice(i, i + batchSize);

    for (const item of chunk) {
      const imageUrl = await resolveImageUrl(
        series.id,
        item.number,
        item.imageFile,
        item.name
      );
      const docId = `${series.id}-${item.number}`;
      const ref = adminDb.collection("catalogItems").doc(docId);

      batch.set(
        ref,
        {
          seriesId: series.id,
          seriesName: series.name,
          number: item.number,
          name: item.name,
          rarity: item.rarity,
          imageUrl,
          notes: item.notes ?? "",
          createdBy: "seed-script",
          status: "approved",
          lastPriceAggregate: null,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`  committed ${chunk.length} items`);
  }
}

async function main() {
  const files = readdirSync(SEED_DIR).filter(
    (f) => f.startsWith("series-") && f.endsWith(".json")
  );

  if (files.length === 0) {
    console.log("No seed/series-*.json files found.");
    return;
  }

  for (const file of files) {
    await importSeriesFile(join(SEED_DIR, file));
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
