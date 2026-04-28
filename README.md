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
- Live match preview and not-found feedback
- Optional cover page using `NOS_Consent.pdf` page 1, followed by a medication list page
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

## Cover page

To use the updated NOS consent cover exactly, export the first page of `NOS_Consent.docx` as a PDF named:

```text
NOS_Consent.pdf
```

Place `NOS_Consent.pdf` in the same folder as `index.html`, `app.js`, `source.pdf`, `drug-index.json`, and `protocols.json`. When **Add cover page** is checked, the app copies page 1 of `NOS_Consent.pdf` exactly, then creates a second cover page listing all matched medications included in the packet.

## Publishing online

This can be hosted free with GitHub Pages or Cloudflare Pages because it is a static site.
