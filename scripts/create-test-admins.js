"use strict";

require("dotenv").config();

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const accounts = [
  { name: "Suzuki Silang Test Admin 1", email: "test-admin-1@example.test" },
  { name: "Suzuki Silang Test Admin 2", email: "test-admin-2@example.test" },
  { name: "Suzuki Silang Test Admin 3", email: "test-admin-3@example.test" }
];
const configuredPasswords = [
  process.env.TEST_ADMIN_PASSWORD_1,
  process.env.TEST_ADMIN_PASSWORD_2,
  process.env.TEST_ADMIN_PASSWORD_3
];

async function main() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Set NODE_ENV=development to create local test administrators.");
  }
  const required = ["DB_HOST", "DB_NAME", "DB_USER"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing database configuration: ${missing.join(", ")}`);
  }
  const hasConfiguredPassword = configuredPasswords.some(Boolean);
  if (hasConfiguredPassword && configuredPasswords.some((password) => !password)) {
    throw new Error("Set all three TEST_ADMIN_PASSWORD values, or leave all three blank to generate them.");
  }
  if (hasConfiguredPassword && configuredPasswords.some((password) => password.length < 16 || Buffer.byteLength(password, "utf8") > 72)) {
    throw new Error("Each test admin password must be at least 16 characters and no more than 72 UTF-8 bytes.");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME
  });

  try {
    await connection.beginTransaction();
    const placeholders = accounts.map(() => "?").join(", ");
    const [existing] = await connection.execute(
      `SELECT email FROM users WHERE email IN (${placeholders})`,
      accounts.map((account) => account.email)
    );
    if (existing.length) {
      throw new Error("One or more test admin emails already exist. No accounts were changed.");
    }

    const created = [];
    for (const [index, account] of accounts.entries()) {
      const password = configuredPasswords[index] || crypto.randomBytes(24).toString("hex");
      const passwordHash = await bcrypt.hash(password, 12);
      await connection.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
        [account.name, account.email, passwordHash]
      );
      created.push({ ...account, password });
    }
    await connection.commit();

    console.log("Save these generated credentials now; the passwords are not stored in plaintext:");
    created.forEach((account) => console.log(`${account.name}\nEmail: ${account.email}\nPassword: ${account.password}\n`));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Test admin setup failed:", error.message);
  process.exitCode = 1;
});
