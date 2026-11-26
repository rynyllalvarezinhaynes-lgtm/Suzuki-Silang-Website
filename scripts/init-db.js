"use strict";

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

async function main() {
  const required = ["DB_HOST", "DB_NAME", "DB_USER"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing database configuration: ${missing.join(", ")}`);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const schema = fs.readFileSync(path.join(__dirname, "..", "api", "schema.sql"), "utf8");
    await connection.query(schema);
    console.log("Database schema and initial Suzuki models are ready.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Database initialization failed:", error.message);
  process.exitCode = 1;
});
