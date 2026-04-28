# Individualized Consent Packet Generator

A static web app that creates an individualized consent packet by combining:

1. `NOS_Consent.pdf` as the first two pages
2. a medication list on page 2 of the NOS consent form
3. selected APHON medication fact sheets from `source.pdf`

## Run locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not open `index.html` directly; browser security can block loading JSON and PDF files.

## Current features

- Doctor/provider name entry, written onto page 1 of `NOS_Consent.pdf`
- Disease/stage entry, written onto page 1 of `NOS_Consent.pdf`
- Patient name intentionally left blank
- Page 2 medication list pulled from matched medications
- English/Spanish fact sheet selection
- Manual medications plus protocol presets
- No preview-match button
- No public-hosting content note

## Editable files

- `protocols.json`: protocol presets
- `drug-index.json`: medication aliases and source PDF page numbers
- `NOS_Consent.pdf`: NOS consent template
- `source.pdf`: APHON fact sheet source PDF
