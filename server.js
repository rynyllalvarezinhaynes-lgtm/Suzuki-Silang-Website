"use strict";

require("dotenv").config();

const crypto = require("node:crypto");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const express = require("express");
const session = require("express-session");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const mysql = require("mysql2/promise");

const requiredEnv = ["DB_HOST", "DB_NAME", "DB_USER", "SESSION_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  throw new Error(`Missing environment configuration: ${missingEnv.join(", ")}`);
}
if (process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}

const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const host = isProduction ? "0.0.0.0" : "127.0.0.1";
const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4"
};
const pool = mysql.createPool(dbConfig);

class MySQLSessionStore extends session.Store {
  constructor(connectionPool) {
    super();
    this.pool = connectionPool;
    this.cleanupTimer = setInterval(() => {
      this.pool.execute("DELETE FROM user_sessions WHERE expires_at <= ?", [Date.now()])
        .catch((error) => console.error("Expired-session cleanup failed:", error.message));
    }, 30 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  get(sid, callback) {
    this.pool.execute(
      "SELECT data FROM user_sessions WHERE sid = ? AND expires_at > ?",
      [sid, Date.now()]
    ).then(([rows]) => callback(null, rows.length ? JSON.parse(rows[0].data) : null)).catch(callback);
  }

  set(sid, sessionData, callback) {
    const expiresAt = sessionData.cookie && sessionData.cookie.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + 8 * 60 * 60 * 1000;
    if (!Number.isFinite(expiresAt)) return callback(new Error("Session expiry is invalid."));
    let data;
    try {
      data = JSON.stringify(sessionData);
    } catch (error) {
      return callback(error);
    }
    this.pool.execute(
      `INSERT INTO user_sessions (sid, expires_at, data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at), data = VALUES(data)`,
      [sid, expiresAt, data]
    ).then(() => callback(null)).catch(callback);
  }

  touch(sid, sessionData, callback) {
    const expiresAt = sessionData.cookie && sessionData.cookie.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + 8 * 60 * 60 * 1000;
    this.pool.execute(
      "UPDATE user_sessions SET expires_at = ? WHERE sid = ?",
      [expiresAt, sid]
    ).then(() => callback(null)).catch(callback);
  }

  destroy(sid, callback) {
    this.pool.execute("DELETE FROM user_sessions WHERE sid = ?", [sid])
      .then(() => callback(null)).catch(callback);
  }
}

const sessionStore = new MySQLSessionStore(pool);

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", isProduction ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));
app.use(express.json({ limit: "12kb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) req.body = {};
  next();
});
app.use(session({
  name: "suzuki.silang.sid",
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000
  }
}));
app.use("/assets", express.static(path.join(__dirname, "assets"), { index: false, maxAge: isProduction ? "1h" : 0 }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait and try again." }
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many account creation attempts. Please try again later." }
});
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many inquiries have been sent. Please try again later." }
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Sign in to continue." });
  pool.execute(
    "SELECT role, session_version AS sessionVersion FROM users WHERE id = ?",
    [req.session.user.id]
  ).then(([rows]) => {
    if (!rows.length || Number(rows[0].sessionVersion) !== Number(req.session.user.sessionVersion)) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Your session has expired. Sign in again." });
    }
    req.session.user.role = rows[0].role;
    next();
  }).catch(next);
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Administrator access is required." });
  }
  next();
}

function requireCsrf(req, res, next) {
  const token = req.get("x-csrf-token") || "";
  const expected = req.session.csrfToken || "";
  if (!/^[a-f0-9]{64}$/i.test(token) || !/^[a-f0-9]{64}$/i.test(expected)) {
    return res.status(403).json({ error: "Refresh the page and try again." });
  }
  const suppliedBuffer = Buffer.from(token, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return res.status(403).json({ error: "Refresh the page and try again." });
  }
  next();
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function validEmail(email) {
  return typeof email === "string" && email.length <= 254 && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email);
}

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/index.html", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/account.html", (req, res) => res.sendFile(path.join(__dirname, "account.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.join(__dirname, "admin.html")));

app.get("/api/auth/csrf", (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  res.json({ csrfToken: req.session.csrfToken });
});

app.get("/api/auth/me", asyncRoute(async (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  const [rows] = await pool.execute(
    "SELECT name, email, role, session_version AS sessionVersion FROM users WHERE id = ? LIMIT 1",
    [req.session.user.id]
  );
  if (!rows.length || Number(rows[0].sessionVersion) !== Number(req.session.user.sessionVersion)) {
    await new Promise((resolve, reject) => {
      req.session.destroy((error) => error ? reject(error) : resolve());
    });
    res.clearCookie("suzuki.silang.sid", { httpOnly: true, secure: isProduction, sameSite: "lax" });
    return res.json({ user: null });
  }
  Object.assign(req.session.user, rows[0]);
  res.json({ user: publicUser(req.session.user) });
}));

app.post("/api/auth/register", registrationLimiter, requireCsrf, asyncRoute(async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!name || name.length > 120 || !validEmail(email)) {
    return res.status(400).json({ error: "Enter your name and a valid email address." });
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ error: "Use a password of at least 12 characters (maximum 72 UTF-8 bytes)." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let result;
  try {
    [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')",
      [name, email, passwordHash]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "An account with that email already exists." });
    throw error;
  }

  const user = { id: result.insertId, name, email, role: "customer", sessionVersion: 0 };
  await regenerateSession(req);
  req.session.user = user;
  req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  await saveSession(req);
  res.status(201).json({ user: publicUser(user), csrfToken: req.session.csrfToken });
}));

app.post("/api/auth/login", loginLimiter, requireCsrf, asyncRoute(async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!validEmail(email) || !password || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }

  const [rows] = await pool.execute(
    "SELECT id, name, email, password_hash, role, session_version AS sessionVersion FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }

  await regenerateSession(req);
  req.session.user = { ...publicUser(user), sessionVersion: Number(user.sessionVersion) };
  req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  await saveSession(req);
  res.json({ user: publicUser(req.session.user), csrfToken: req.session.csrfToken });
}));

app.put("/api/auth/profile", requireAuth, requireCsrf, asyncRoute(async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
  const confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";
  if (!name || name.length > 120 || !validEmail(email)) {
    return res.status(400).json({ error: "Enter your name and a valid email address." });
  }
  if (!currentPassword || Buffer.byteLength(currentPassword, "utf8") > 72) {
    return res.status(400).json({ error: "Enter your current password to save profile changes." });
  }
  if (newPassword && (newPassword.length < 12 || Buffer.byteLength(newPassword, "utf8") > 72)) {
    return res.status(400).json({ error: "A new password must be at least 12 characters and no more than 72 UTF-8 bytes." });
  }
  if (newPassword && newPassword !== confirmPassword) {
    return res.status(400).json({ error: "The new password entries do not match." });
  }

  const [rows] = await pool.execute(
    "SELECT password_hash, role, session_version AS sessionVersion FROM users WHERE id = ? LIMIT 1",
    [req.session.user.id]
  );
  if (!rows.length || !await bcrypt.compare(currentPassword, rows[0].password_hash)) {
    return res.status(403).json({ error: "Your current password is incorrect." });
  }

  const passwordHash = newPassword ? await bcrypt.hash(newPassword, 12) : rows[0].password_hash;
  const nextVersion = Number(rows[0].sessionVersion) + 1;
  try {
    await pool.execute(
      "UPDATE users SET name = ?, email = ?, password_hash = ?, session_version = ? WHERE id = ?",
      [name, email, passwordHash, nextVersion, req.session.user.id]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "An account with that email already exists." });
    throw error;
  }

  const user = { id: req.session.user.id, name, email, role: rows[0].role, sessionVersion: nextVersion };
  await regenerateSession(req);
  req.session.user = user;
  req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  await saveSession(req);
  res.json({ user: publicUser(user), csrfToken: req.session.csrfToken });
}));

app.post("/api/auth/logout", requireCsrf, asyncRoute(async (req, res) => {
  await new Promise((resolve, reject) => {
    req.session.destroy((error) => error ? reject(error) : resolve());
  });
  res.clearCookie("suzuki.silang.sid", { httpOnly: true, secure: isProduction, sameSite: "lax" });
  res.status(204).end();
}));

app.post("/api/inquiries", inquiryLimiter, requireCsrf, asyncRoute(async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  if (req.body.email != null && typeof req.body.email !== "string") {
    return res.status(400).json({ error: "Enter a valid email address or leave it blank." });
  }
  if (req.body.message != null && typeof req.body.message !== "string") {
    return res.status(400).json({ error: "The message must be plain text." });
  }
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const modelSlug = typeof req.body.modelSlug === "string" ? req.body.modelSlug : "";
  const intent = req.body.intent;
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  const allowedIntents = new Set(["test_drive", "quote", "financing"]);
  if (!name || name.length > 120 || !/^[+\d\s().-]{7,30}$/.test(phone)) {
    return res.status(400).json({ error: "Enter your name and a valid mobile number." });
  }
  if (email && !validEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address or leave it blank." });
  }
  if (!allowedIntents.has(intent) || message.length > 2000) {
    return res.status(400).json({ error: "Choose an inquiry type and keep the message under 2,000 characters." });
  }

  const [models] = await pool.execute(
    "SELECT id FROM models WHERE slug = ? LIMIT 1",
    [modelSlug]
  );
  if (!models.length) return res.status(400).json({ error: "Choose a valid Suzuki model." });

  const [result] = await pool.execute(
    "INSERT INTO inquiries (name, phone, email, model_id, intent, message) VALUES (?, ?, ?, ?, ?, ?)",
    [name, phone, email || null, models[0].id, intent, message || null]
  );
  res.status(201).json({ inquiry: { id: result.insertId, status: "new" } });
}));

app.get("/api/models", asyncRoute(async (req, res) => {
  const [models] = await pool.execute(
    "SELECT id, slug, name, category, image_path AS imagePath, price FROM models WHERE active = TRUE ORDER BY id"
  );
  res.json({ models });
}));

app.get("/api/orders", requireAuth, asyncRoute(async (req, res) => {
  if (req.session.user.role === "admin") {
    return res.status(403).json({ error: "Use the administrator order page." });
  }
  const [orders] = await pool.execute(
    `SELECT o.id, o.price_snapshot AS price, o.status, o.created_at AS createdAt, m.name AS modelName
     FROM orders o JOIN models m ON m.id = o.model_id
     WHERE o.customer_id = ? ORDER BY o.created_at DESC LIMIT 50`,
    [req.session.user.id]
  );
  res.json({ orders });
}));

app.post("/api/orders", requireAuth, requireCsrf, asyncRoute(async (req, res) => {
  if (req.session.user.role !== "customer") return res.status(403).json({ error: "Customer accounts are required to place an order." });
  const modelId = Number(req.body.modelId);
  if (!Number.isSafeInteger(modelId) || modelId < 1) return res.status(400).json({ error: "Choose a valid model." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [models] = await connection.execute(
      "SELECT id, price FROM models WHERE id = ? AND active = TRUE FOR UPDATE",
      [modelId]
    );
    if (!models.length) {
      await connection.rollback();
      return res.status(404).json({ error: "That model is not currently available for orders." });
    }
    if (models[0].price === null) {
      await connection.rollback();
      return res.status(409).json({ error: "The dealer has not entered a price for this model yet." });
    }
    const [result] = await connection.execute(
      "INSERT INTO orders (customer_id, model_id, price_snapshot) VALUES (?, ?, ?)",
      [req.session.user.id, modelId, models[0].price]
    );
    await connection.commit();
    res.status(201).json({ order: { id: result.insertId, status: "pending" } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get("/api/admin/models", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const [models] = await pool.execute(
    "SELECT id, slug, name, category, price, active FROM models ORDER BY name"
  );
  res.json({ models });
}));

app.put("/api/admin/models/:id/price", requireAuth, requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const modelId = Number(req.params.id);
  const rawPrice = req.body.price;
  const available = req.body.active;
  if (!Number.isSafeInteger(modelId) || modelId < 1) return res.status(400).json({ error: "Choose a valid model." });
  if (typeof rawPrice !== "string" && typeof rawPrice !== "number") {
    return res.status(400).json({ error: "Enter a valid price or leave it blank to clear the price." });
  }
  const priceText = String(rawPrice).trim();
  let price = null;
  if (priceText) {
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(priceText) || Number(priceText) <= 0) {
      return res.status(400).json({ error: "Price must be a positive amount with up to two decimal places." });
    }
    price = priceText;
  }
  if (typeof available !== "boolean") return res.status(400).json({ error: "Availability must be selected." });

  const [result] = await pool.execute(
    "UPDATE models SET price = ?, active = ? WHERE id = ?",
    [price, available, modelId]
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Model not found." });
  res.json({ model: { id: modelId, price, active: available } });
}));

app.get("/api/admin/orders", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const [orders] = await pool.execute(
    `SELECT o.id, o.price_snapshot AS price, o.status, o.created_at AS createdAt,
            u.name AS customerName, u.email AS customerEmail, m.name AS modelName
     FROM orders o
     JOIN users u ON u.id = o.customer_id
     JOIN models m ON m.id = o.model_id
     ORDER BY o.created_at DESC LIMIT 200`
  );
  res.json({ orders });
}));

app.get("/api/admin/inquiries", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const [inquiries] = await pool.execute(
    `SELECT i.id, i.name, i.phone, i.email, m.name AS modelName, i.intent,
            i.message, i.status, i.created_at AS createdAt
     FROM inquiries i
     JOIN models m ON m.id = i.model_id
     ORDER BY i.created_at DESC LIMIT 200`
  );
  res.json({ inquiries });
}));

app.patch("/api/admin/inquiries/:id/status", requireAuth, requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const inquiryId = Number(req.params.id);
  const status = req.body.status;
  const allowedStatuses = new Set(["new", "contacted", "closed"]);
  if (!Number.isSafeInteger(inquiryId) || inquiryId < 1 || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: "Choose a valid inquiry and status." });
  }
  const [result] = await pool.execute("UPDATE inquiries SET status = ? WHERE id = ?", [status, inquiryId]);
  if (!result.affectedRows) return res.status(404).json({ error: "Inquiry not found." });
  res.json({ inquiry: { id: inquiryId, status } });
}));

app.patch("/api/admin/orders/:id/status", requireAuth, requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const orderId = Number(req.params.id);
  const status = req.body.status;
  const allowedStatuses = new Set(["pending", "confirmed", "declined", "completed"]);
  if (!Number.isSafeInteger(orderId) || orderId < 1 || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: "Choose a valid order and status." });
  }
  const [result] = await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
  if (!result.affectedRows) return res.status(404).json({ error: "Order not found." });
  res.json({ order: { id: orderId, status } });
}));

app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use((req, res) => res.status(404).send("Page not found."));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Request failed:", error);
  if (req.path.startsWith("/api/")) return res.status(500).json({ error: "The server could not complete the request." });
  res.status(500).send("The server could not complete the request.");
});

async function start() {
  await pool.query("SELECT 1");
  app.listen(port, host, () => console.log(`Suzuki Auto Silang is running at http://${host}:${port}.`));
}

start().catch((error) => {
  console.error("Backend startup failed:", error.message);
  process.exitCode = 1;
});
