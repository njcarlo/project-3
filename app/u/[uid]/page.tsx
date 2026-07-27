import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { computePortfolioValue, resolveShowcaseItems } from "@/lib/portfolio";
import { BreakdownBars } from "@/components/BreakdownBars";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { RarityBadge } from "@/components/RarityBadge";
import { StatCard } from "@/components/StatCard";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ uid: string }>;

async function loadProfile(uid: string) {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { uid } = await params;
  const profile = await loadProfile(uid);

  if (!profile || profile.portfolioPublic === false) {
    return { title: "Mezastar Collector" };
  }

  const title = `${profile.displayName}'s Mezastar collection`;
  const description = profile.bio || "Check out this Mezastar tag collection.";

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

function memberSince(createdAt: unknown): string | null {
  const date =
    createdAt && typeof createdAt === "object" && "toDate" in createdAt
      ? (createdAt as { toDate: () => Date }).toDate()
      : null;
  return date
    ? date.toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Params;
}) {
  const { uid } = await params;
  const profile = await loadProfile(uid);

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted">This collector doesn&apos;t exist.</p>
      </div>
    );
  }

  if (profile.portfolioPublic === false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted">
          {profile.displayName} has kept their portfolio private.
        </p>
      </div>
    );
  }

  const [data, showcaseItems] = await Promise.all([
    computePortfolioValue(uid),
    resolveShowcaseItems(profile.showcaseItemIds ?? []),
  ]);

  const featured = showcaseItems.length > 0 ? showcaseItems : data.topItems;
  const featuredLabel = showcaseItems.length > 0 ? "Pinned favorites" : "Top tags";
  const since = memberSince(profile.createdAt);

  return (
    <div>
      <div
        className="relative overflow-hidden border-b border-card-border"
        style={{
          background:
            "radial-gradient(500px circle at 15% 0%, var(--accent), transparent 60%)",
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-10">
          <div className="flex items-center gap-4">
            {profile.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element -- external avatar URL
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-background"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-accent-foreground ring-4 ring-background">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {profile.displayName}
              </h1>
              {profile.bio && <p className="text-sm text-muted">{profile.bio}</p>}
              {since && (
                <p className="text-xs text-muted">Collecting since {since}</p>
              )}
            </div>
          </div>
          <CopyLinkButton path={`/u/${uid}`} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {data.totalItems === 0 ? (
          <p className="text-muted">This collection is empty so far.</p>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 sm:flex-row">
              <StatCard
                label="Total value"
                value={`¥${Math.round(data.totalValue).toLocaleString()}`}
              />
              <StatCard label="Items" value={String(data.totalItems)} />
              <StatCard
                label="Avg per item"
                value={`¥${Math.round(
                  data.totalValue / data.totalItems
                ).toLocaleString()}`}
              />
            </div>

          {featured.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium">{featuredLabel}</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {featured.map((item) => (
                  <Link
                    key={item.catalogItemId}
                    href={`/catalog/${item.catalogItemId}`}
                    className="card overflow-hidden rounded-lg p-2 transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="aspect-square w-full overflow-hidden rounded bg-background">
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- external PokeAPI/Storage images
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain p-1"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs font-medium">
                      {item.name}
                    </p>
                    <div className="mt-1">
                      <RarityBadge rarity={item.rarity} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

            {data.byRarity.length > 0 && (
              <div className="card rounded-xl p-5">
                <h2 className="mb-4 text-sm font-semibold">Value by rarity</h2>
                <BreakdownBars rows={data.byRarity} labelKey="rarity" colorByRarity />
              </div>
            )}

            {data.bySeries.length > 0 && (
              <div className="card rounded-xl p-5">
                <h2 className="mb-4 text-sm font-semibold">Value by series</h2>
                <BreakdownBars rows={data.bySeries} labelKey="series" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
