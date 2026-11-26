# Suzuki Auto Silang Website

A static, local-only showroom site for Suzuki Auto Silang. The displayed models, prices, images and video are served from the project files; no database or backend is needed to view the static site.

## Open the static site

1. Download or clone this private repository onto the Windows laptop.
2. Double-click `Start Suzuki Website.bat`. It opens `index.html` in the default browser.
3. The static site works without installing Node.js or MySQL.

The home page includes a **Sign in** link to the existing account page. Signing in and creating accounts require the Express/MySQL backend; they will not work when the static page is opened directly with the Windows launcher. Administrator tools, online orders and inquiry submission are also unavailable in static mode. Use the phone, Viber or email links on the page to contact Suzuki Auto Silang.

Displayed starting Philippine MSRPs were checked November 26, 2026. Prices and availability can change; confirm them with the dealer.

## Hosting and privacy

The repository is private. GitHub Pages is not enabled for this private repository on the current plan; the Pages settings require upgrading or making the repository public. Making it public would expose the source code. GitHub Pages also cannot run the project's Express/MySQL backend.

## Project files

- `index.html` — static dealership page, model range, prices and contact links
- `assets/css/styles.css` — responsive site styling
- `assets/js/script.js` — carousel, filters, navigation and visual effects
- `assets/images/` and `assets/videos/` — local site media
- `Start Suzuki Website.bat` — opens the static page on Windows
- `.vscode/settings.json` — disables VS Code AI co-author trailers for this workspace

The previous Express/MySQL, account and administrator files remain in the private repository, but the static page and launcher do not use them.
