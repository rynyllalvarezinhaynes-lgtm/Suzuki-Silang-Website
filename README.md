# Suzuki Auto Silang Website

A local Suzuki Auto Silang website with a Node.js/Express backend and MySQL database.

## Run locally

On a new Windows computer, install Node.js and MySQL 8.4, then run these commands once in the project folder:

```powershell
npm install
npm run db:local:setup
npm run db:init
```

Double-click `Start Suzuki Website.bat`, wait for the server to start, then open `http://localhost:3000`. Keep the command window open while using the site. Sign-in, customer account registration, purchase requests and administrator tools require this server and database; opening `index.html` directly will not connect to them.

Customers can select a priced car from their account dashboard and submit a purchase request. They can remove their own request while it is still pending; confirmed requests must be cancelled directly with Suzuki Auto Silang. The dealer reviews requests and confirms availability and final pricing; the site does not take online payment. Admins can update prices and availability, review customer accounts and requests, and update request statuses. Public registration creates customer accounts only. Admin accounts must be created separately by the site owner.

Seed starting Philippine MSRPs were checked November 26, 2026. Admins can update the displayed prices and availability; confirm current trim, pricing and availability with the dealer.

## Hosting and privacy

The repository is private. GitHub Pages is not enabled for this private repository on the current plan; the Pages settings require upgrading or making the repository public. Making it public would expose the source code. GitHub Pages cannot run the project's Express/MySQL backend.

## Project files

- `index.html` — dealership homepage with live model prices, availability and order links
- `account.html` — customer sign-in, car requests, request history and profile settings
- `admin.html` — price and availability controls, customer accounts, purchase requests and inquiries
- `assets/css/styles.css` — responsive site styling
- `assets/css/account.css` — account and dashboard styling
- `assets/js/script.js` and `assets/js/shop.js` — homepage interactions and live catalog/order links
- `assets/js/account.js`, `assets/js/admin.js` and `assets/js/inquiry.js` — customer, admin and quote-request flows
- `server.js` and `api/schema.sql` — Express API, authentication and MySQL schema
- `assets/images/` and `assets/videos/` — local site media
- `Start Suzuki Website.bat` — starts the local MySQL service and Express app on Windows
- `.vscode/settings.json` — disables VS Code AI co-author trailers for this workspace

Keep `.env` and local database credentials private; they are not part of the repository.
