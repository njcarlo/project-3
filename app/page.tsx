import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Mezastar Collector</h1>
      <p className="mt-3 text-black/70 dark:text-white/70">
        Track your Pokémon Mezastar discs, see what your collection is worth
        from community-submitted prices, and check whether a trade is fair.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/catalog"
          className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Browse the catalog
        </Link>
        <Link
          href="/login"
          className="rounded border border-black/20 px-4 py-2 dark:border-white/20"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
