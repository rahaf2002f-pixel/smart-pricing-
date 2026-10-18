# Imported Arabic pricing dashboard

## Run

Use the **Start application** workflow, or run `python3 server.py`.
The server listens on `0.0.0.0:5000` and uses only Python's standard library.
No packages, secrets, or external accounts are required.

## Pages

- `/`: original landing page (`_1/code.html`)
- `/simulator`: original pricing calculator (`_2/code.html`)
- `/calculator`: original detailed calculator (`_3/code.html`)
- `/product-catalog`: original product catalog mockup (`_4/code.html`)

The “الصفحات المستوردة” menu at the bottom-left links to all four pages.
The original `/_1/code.html` through `/_4/code.html` URLs also work.

## Scope and limitations

The imported HTML, screenshots, and `calculated_mint/DESIGN.md` are preserved.
The server adds page titles, navigation, and connects existing simulator/catalog
links when serving HTML. It serves only the four known pages, not workspace files.

These are imported demos, not a complete store-management application.
Existing calculator scripts run in the browser; catalog actions, unsupported
sidebar sections, export, and permanent saving have not been implemented.
Google Fonts, Material Symbols, and the Tailwind CDN require internet access.
