CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  session_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS models (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  name VARCHAR(140) NOT NULL,
  category VARCHAR(60) NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  price DECIMAL(12, 2) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_models_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  model_id BIGINT UNSIGNED NOT NULL,
  price_snapshot DECIMAL(12, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'declined', 'completed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_orders_customer_created (customer_id, created_at),
  KEY ix_orders_status_created (status, created_at),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users (id),
  CONSTRAINT fk_orders_model FOREIGN KEY (model_id) REFERENCES models (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS inquiries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(254) NULL,
  model_id BIGINT UNSIGNED NOT NULL,
  intent ENUM('test_drive', 'quote', 'financing') NOT NULL,
  message TEXT NULL,
  status ENUM('new', 'contacted', 'closed') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_inquiries_status_created (status, created_at),
  CONSTRAINT fk_inquiries_model FOREIGN KEY (model_id) REFERENCES models (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR(128) NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  data MEDIUMTEXT NOT NULL,
  PRIMARY KEY (sid),
  KEY ix_user_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO models (slug, name, category, image_path, price) VALUES
  ('s-presso-ags', 'S-Presso AGS', 'Hatchback', 'assets/images/hero/s-presso-photo.png', 674000.00),
  ('jimny-allgrip-pro', 'Jimny AllGrip Pro', 'SUV', 'assets/images/models/jimny-owner.png', 1293000.00),
  ('jimny-5-door-allgrip-pro', 'Jimny 5-Door AllGrip Pro', 'SUV', 'assets/images/models/jimny-5-door-owner.png', 1698000.00),
  ('fronx-hybrid', 'Fronx Hybrid', 'SUV', 'assets/images/models/fronx-owner.png', 1219000.00),
  ('xl7-hybrid-black-edition', 'XL7 Hybrid Black Edition', 'SUV', 'assets/images/models/xl7-owner.png', 1259000.00),
  ('dzire-hybrid', 'Dzire Hybrid', 'Sedan', 'assets/images/models/dzire-owner.png', 920000.00),
  ('ertiga-hybrid', 'Ertiga Hybrid', 'MPV', 'assets/images/models/ertiga-owner.png', 1178000.00),
  ('apv', 'APV', 'MPV', 'assets/images/models/apv-owner.png', 763000.00),
  ('carry', 'Carry', 'Commercial', 'assets/images/models/carry-owner.png', 614000.00);
