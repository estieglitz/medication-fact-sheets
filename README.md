# Medication Fact Sheet Packet Builder

A static, free web app that collates APHON medication fact sheet pages into one printable PDF packet.

## Run locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not open `index.html` directly; browser security can block loading `drug-index.json`, `protocols.json`, or `source.pdf`.

## What is included

- English/Spanish output selector
- Protocol presets from `protocols.json`
- Manual medication list
- Alias and fuzzy matching, including brand names and abbreviations already present in `drug-index.json`
- Match preview and not-found feedback
- Optional cover page
- In-browser PDF generation using `pdf-lib`

## Editing protocols

Edit `protocols.json`. Each protocol has:

```json
{
  "name": "ALL induction",
  "aliases": ["aall1731 induction", "all induction"],
  "medications": ["vincristine", "dexamethasone", "pegaspargase"]
}
```

Medication names should match entries or aliases in `drug-index.json`. The app also performs fuzzy matching.

## Publishing online

This can be hosted free with GitHub Pages or Cloudflare Pages because it is a static site. Confirm copyright/licensing permissions before publicly hosting the APHON PDF.
