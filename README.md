# Suzuki Auto Silang Website

A Suzuki Auto Silang dealership website with a Node.js/Express backend, MySQL-managed prices, customer inquiries, order requests and a separate administrator dashboard.

## Run the site

The public model pages can still be browsed without an account. Visitors can send test-drive and quote inquiries without signing in; administrators review them in the dashboard. Customers create an account or sign in before submitting an order request. Administrators set prices and manage order status. Checkout does not take online payments; an order request is pending until the dealer confirms it.

1. Install Node.js and MySQL Server.
2. Install project dependencies with `npm install`.
3. For this Windows development setup, run `npm run db:local:setup` once. It initializes a loopback-only MySQL instance, generates local credentials and writes `.env`. The MySQL root credential is kept under `%LOCALAPPDATA%\SuzukiAutoSilang\mysql`, outside the repository.
4. Initialize the tables and Suzuki model list with `npm run db:init`.
5. To create the three local test administrators, run `npm run admin:create-test` and save the generated passwords shown once. For a single administrator instead, set `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in local `.env`, run `npm run admin:create`, then remove `ADMIN_PASSWORD` from `.env`.
6. To start the site on Windows, double-click `Start Suzuki Website.bat` in the project folder. Keep its window open while you use the site, then press Ctrl+C to stop it. Open `http://localhost:3000` in your browser. Alternatively, run `npm run start:local` from a terminal.

After restarting Windows, double-click the launcher again; it starts MySQL if it is not already running and then starts the website. If using a separately managed MySQL server, configure `.env` manually instead of running the local setup script.

Do not commit `.env` or share its database/session secrets. Customer sign-up always creates a customer role; administrator accounts are created only through the local setup commands. The catalog is seeded with starting MSRP values from the [official Suzuki Philippines price list](https://auto.suzuki.com.ph/pages/pricelist), checked November 26, 2026: S-Presso AGS ₱674,000; Jimny ₱1,293,000; Jimny 5-Door ₱1,698,000; Fronx Hybrid ₱1,219,000; XL7 Hybrid Black Edition ₱1,259,000; Dzire Hybrid ₱920,000; Ertiga Hybrid ₱1,178,000; APV ₱763,000; Carry ₱614,000. For models with multiple grades, the catalog uses the lowest listed price for the named range (and the lowest matching hybrid/AGS grade where applicable). Prices and availability can change; confirm them with the dealer. Admins can update the displayed starting prices.

For local development only, `npm run admin:create-test` creates three test administrator accounts with random passwords and prints them once. It refuses to run when `NODE_ENV=production` and does not overwrite existing accounts.

GitHub can store the source code, but GitHub Pages cannot run this Express API or MySQL. For a live ordering site, deploy the Node server and MySQL database to a backend host and keep the GitHub repository free of credentials.

## Main files

- `index.html` — dealership page and model content
- `assets/css/styles.css` — white-and-red styling and responsive layouts
- `assets/js/script.js` — navigation, featured-model carousel, model filters and video controls
- `server.js` — Express API, session authentication, price and order routes
- `api/schema.sql` — MySQL users, models, inquiries, orders and sessions tables
- `account.html` — customer sign-in, account creation, order dashboard and profile settings
- `admin.html` — administrator price and order dashboard
- `assets/images/icons/suzuki-auto-silang.png` — supplied dealership logo
- `assets/images/models/` — vehicle images from the supplied brochures
- `assets/images/hero/s-presso-photo.png` — S-Presso hero fallback and first carousel image
- `assets/videos/New Suzuki S-Presso AGS.mp4` — authorized S-Presso hero clip

The hero plays the authorized S-Presso clip muted and loops it behind the text. If it cannot load, the S-Presso brochure image is used as the fallback. Do not substitute the unrelated e VITARA video.

The model carousel begins with S-Presso, then Jimny, and continues through the other brochure-covered models. The model range and S-Presso specifications reflect the supplied brochures. The contact section lists Suzuki Auto Silang's provided phone, Viber, email, address and Facebook details. Confirm current stock, trims, prices and equipment with the dealer.
