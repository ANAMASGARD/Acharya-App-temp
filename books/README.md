# Demo NCERT English books

One textbook per class for the Acharya demo. Config: **`demo-books.json`**.

## After manually adding PDFs — embed only what's missing

```bash
npm run books:embed-missing
```

Safe: skips books/chapters already in Aura. Never deletes existing embeddings.

## Embed all demo books into Aura (one command)

From the project root, after `.env` has Neo4j + OpenRouter keys:

```bash
npm run books:embed
```

This will:

1. Delete any leftover `.zip` files in `books/`
2. Download **only missing** demo PDFs (skips classes you already have)
3. Build `manifest.json` from PDFs on disk
4. Create vector embeddings and write `CurriculumBook` → `Chapter` → `Chunk` in Aura

### Faster re-runs

Already-ingested chapters are skipped (`INGEST_SKIP_EXISTING=true` in `.env`).

### Add more books later

Edit `books/demo-books.json`, add PDFs under `books/class-N/english/<slug>/`, then run `npm run books:embed` again.

## Manual PDF drop (when NCERT download fails)

If class 3 / 4 / 6 fail to download from ncert.nic.in, download the ZIP from [NCERT textbooks](https://ncert.nic.in/textbook.php) in your browser and unzip into:

| Class | Folder | Book |
|-------|--------|------|
| 3 | `books/class-3/english/marigold/` | Marigold |
| 4 | `books/class-4/english/marigold/` | Marigold |
| 6 | `books/class-6/science/curiosity/` | Curiosity (Science) |

Then run:

```bash
npm run books:embed
```

## Step-by-step (optional)

```bash
npm run books:download    # download missing PDFs only
npm run books:manifest    # refresh manifest.json
npm run neo4j:ingest-books  # embed + write to Aura
npm run neo4j:introspect    # verify counts in Aura
```
