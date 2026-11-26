"use strict";

require("dotenv").config();

const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function main() {
  const name = (process.env.ADMIN_NAME || "").trim();
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!name || name.length > 120 || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
    throw new Error("Set a valid ADMIN_NAME and ADMIN_EMAIL in the local .env file.");
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters and no more than 72 UTF-8 bytes.");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME
  });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      [name, email, passwordHash]
    );
    console.log(`Admin account ready for ${email}. Remove the ADMIN_PASSWORD value from .env when finished.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Admin account setup failed:", error.message);
  process.exitCode = 1;
});
