import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import type { CatalogItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getShowcaseItems(): Promise<CatalogItem[]> {
  const snap = await adminDb
    .collection("catalogItems")
    .where("status", "==", "approved")
    .limit(60)
    .get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogItem);
  return items
    .filter((i) => i.rarity === "black-6" || i.rarity === "white-5")
    .slice(0, 12);
}

const FEATURES = [
  {
    title: "Track your collection",
    body: "Log every tag you own, organize by arcade session, and see your set completion at a glance.",
  },
  {
    title: "Community-driven pricing",
    body: "Real prices from real collectors — no scraped data, just what people actually paid.",
  },
  {
    title: "Fair trade analyzer",
    body: "Compare both sides of a trade instantly and know when a deal is actually even.",
  },
];

export default async function Home() {
  const items = await getShowcaseItems();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(600px circle at 20% 0%, var(--accent), transparent 60%), radial-gradient(500px circle at 90% 20%, var(--accent), transparent 55%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Collect. Track. <span className="text-accent">Value.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            The simple, powerful way Mezastar collectors track what they own
            and what it&apos;s worth.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/catalog"
              className="rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-105"
            >
              Browse the catalog
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-card-border px-6 py-3 font-medium transition-colors hover:bg-card"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/catalog/${item.id}`}
                className="card group aspect-square overflow-hidden rounded-xl transition-transform hover:-translate-y-1 hover:shadow-lg"
              >
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card rounded-xl p-6">
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
