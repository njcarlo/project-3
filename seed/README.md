# Catalog seed data

`series-*.json` files describe one Mezastar series each, in this shape:

```json
{
  "series": {
    "id": "series-01",
    "name": "Mezastar Series 1",
    "releaseDate": "2016-07",
    "description": "...",
    "coverImageUrl": ""
  },
  "items": [
    {
      "number": "001",
      "name": "Pikachu",
      "rarity": "common | uncommon | rare | super_rare | secret_rare",
      "imageFile": "series-01/001-pikachu.png",
      "notes": ""
    }
  ]
}
```

`imageFile` is a path relative to `seed/images/`. Place the actual image at
`seed/images/<imageFile>` before running the import — `scripts/seed-catalog.ts`
uploads it to Firebase Storage at `catalog/<seriesId>/<number>.<ext>`.

`series-01.json`, `series-02.json`, and `series-03.json` are populated with
real Stardust Version 1–3 tag data sourced from mezastarhub.site/collection
(tag numbers, names, Superstar/Star grades). The ★2–★4 band on that site is
listed as a single group without per-tag grade, so `common`/`uncommon`/`rare`
within that band are **inferred** from each Pokémon's evolution stage
(basic/middle/final) rather than pulled directly from the source — spot-check
against the app if precise grade accuracy matters before relying on it.

Images are not included (no `seed/images/` assets shipped) — the importer
skips uploading and leaves `imageUrl` empty for any item whose `imageFile`
isn't found locally, so the catalog will import text-only until images are
added.

Run the importer with:

```bash
npm run seed
```

The script is idempotent (upserts by `seriesId-number`), so re-running it
after adding more items or fixing typos is safe.
