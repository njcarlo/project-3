import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { computePortfolioValue } from "@/lib/portfolio";
import { BreakdownBars } from "@/components/BreakdownBars";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;

  const profileSnap = await adminDb.collection("users").doc(uid).get();

  if (!profileSnap.exists) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted">This collector doesn&apos;t exist.</p>
      </div>
    );
  }

  const profile = profileSnap.data() as UserProfile;

  if (profile.portfolioPublic === false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted">
          {profile.displayName} has kept their portfolio private.
        </p>
      </div>
    );
  }

  const data = await computePortfolioValue(uid);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {profile.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element -- external avatar URL
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold">{profile.displayName}</h1>
            {profile.bio && (
              <p className="text-sm text-muted">{profile.bio}</p>
            )}
          </div>
        </div>
        <CopyLinkButton path={`/u/${uid}`} />
      </div>

      {data.totalItems === 0 ? (
        <p className="text-muted">This collection is empty so far.</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex gap-8">
            <div>
              <p className="text-xs uppercase text-muted">Total value</p>
              <p className="text-2xl font-semibold">
                ¥{Math.round(data.totalValue).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted">Items</p>
              <p className="text-2xl font-semibold">{data.totalItems}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted">Avg per item</p>
              <p className="text-2xl font-semibold">
                ¥
                {Math.round(
                  data.totalValue / data.totalItems
                ).toLocaleString()}
              </p>
            </div>
          </div>

          {data.topItems.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium">Top tags</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {data.topItems.map((item) => (
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
                    <p className="text-xs text-muted">
                      ¥{Math.round(item.value).toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.byRarity.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium">Value by rarity</h2>
              <BreakdownBars rows={data.byRarity} labelKey="rarity" />
            </div>
          )}

          {data.bySeries.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium">Value by series</h2>
              <BreakdownBars rows={data.bySeries} labelKey="series" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
