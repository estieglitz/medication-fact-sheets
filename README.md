# Medication Fact Sheet Packet Builder

Static GitHub Pages-ready app for creating a printable medication fact sheet packet.

## What this version includes

- Removed the inactive **Preview matches** button.
- Removed the bottom content note.
- Uses `NOS_Consent.pdf` as the consent cover document.
  - Page 1 is copied exactly from `NOS_Consent.pdf`.
  - Page 2 is copied from `NOS_Consent.pdf` and populated with the medications included in the packet.
- Protocol presets remain editable in `protocols.json`.

## Files required in the same folder

- `index.html`
- `app.js`
- `style.css`
- `drug-index.json`
- `protocols.json`
- `source.pdf`
- `NOS_Consent.pdf`

## Run locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not open `index.html` directly; browser security can block loading the JSON and PDF files.

## Publish with GitHub Pages

1. Upload all files in this folder to your GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select the branch and folder that contain `index.html`.
4. Save.
5. Open the GitHub Pages URL after deployment finishes.
