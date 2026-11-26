"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const mysql = require("mysql2/promise");

const projectRoot = path.join(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
const stateRoot = path.join(process.env.LOCALAPPDATA || os.homedir(), "SuzukiAutoSilang", "mysql");
const rootPasswordPath = path.join(stateRoot, "root-password.txt");

async function main() {
  if (fs.existsSync(envPath)) {
    throw new Error("A .env file already exists. Refusing to overwrite local configuration.");
  }
  if (fs.existsSync(rootPasswordPath)) {
    throw new Error("A local MySQL root credential already exists. Refusing to replace it.");
  }

  const rootPassword = crypto.randomBytes(32).toString("hex");
  const appPassword = crypto.randomBytes(32).toString("hex");
  const sessionSecret = crypto.randomBytes(48).toString("hex");
  const connection = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: ""
  });

  try {
    await connection.query("CREATE DATABASE suzuki_silang CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
    await connection.query(`CREATE USER 'suzuki_app'@'127.0.0.1' IDENTIFIED BY '${appPassword}'`);
    await connection.query("GRANT ALL PRIVILEGES ON suzuki_silang.* TO 'suzuki_app'@'127.0.0.1'");
    fs.writeFileSync(
      rootPasswordPath,
      `MySQL administrator account: root\nPassword: ${rootPassword}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 }
    );
    await connection.query(`ALTER USER 'root'@'localhost' IDENTIFIED BY '${rootPassword}'`);
  } finally {
    await connection.end();
  }

  const env = [
    "NODE_ENV=development",
    "PORT=3000",
    "DB_HOST=127.0.0.1",
    "DB_PORT=3306",
    "DB_NAME=suzuki_silang",
    "DB_USER=suzuki_app",
    `DB_PASSWORD=${appPassword}`,
    `SESSION_SECRET=${sessionSecret}`,
    ""
  ].join("\n");
  fs.writeFileSync(envPath, env, { encoding: "utf8", flag: "wx", mode: 0o600 });
  console.log("Created the local Suzuki Silang database and .env configuration. Passwords were not printed.");
}

main().catch((error) => {
  console.error("Local MySQL configuration failed:", error.message);
  process.exitCode = 1;
});
