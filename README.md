# Suzuki Auto Silang Website

A local Suzuki Auto Silang website with a Node.js/Express backend and MySQL database.

## Run locally

On a new Windows computer, install Node.js and MySQL 8.4, then run these commands once in the project folder:

```powershell
npm install
npm run db:local:setup
npm run db:init
```

Double-click `Start Suzuki Website.bat`, wait for the server to start, then open `http://localhost:3000`. Keep the command window open while using the site. Sign-in, customer account registration, orders and administrator tools require this server and database; opening `index.html` directly will not connect to them.

Public registration creates customer accounts only. Admin accounts must be created separately by the site owner.

Displayed starting Philippine MSRPs were checked November 26, 2026. Prices and availability can change; confirm them with the dealer.

## Hosting and privacy

The repository is private. GitHub Pages is not enabled for this private repository on the current plan; the Pages settings require upgrading or making the repository public. Making it public would expose the source code. GitHub Pages cannot run the project's Express/MySQL backend.

## Project files

- `index.html` — static dealership page, model range, prices and contact links
- `assets/css/styles.css` — responsive site styling
- `assets/js/script.js` — carousel, filters, navigation and visual effects
- `assets/images/` and `assets/videos/` — local site media
- `Start Suzuki Website.bat` — starts the local MySQL service and Express app on Windows
- `.vscode/settings.json` — disables VS Code AI co-author trailers for this workspace

Keep `.env` and local database credentials private; they are not part of the repository.
