-- ==========================================================================
-- Task Planner Database Schema
-- Architecture aligned with WabiSeminar reference standards
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS `task_planner2`;
USE `task_planner2`;

-- Table: users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_verified` TINYINT(1) DEFAULT 0,
  `verification_code` VARCHAR(10) DEFAULT NULL,
  `reset_code` VARCHAR(10) DEFAULT NULL,
  `reset_expires` BIGINT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: tasks
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `status` VARCHAR(50) DEFAULT 'pending',
  `priority` VARCHAR(50) DEFAULT 'medium',
  `category` VARCHAR(50) DEFAULT 'General',
  `subtasks` TEXT DEFAULT NULL,
  `estimated_minutes` INT DEFAULT 30,
  `due_date` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: task_shares (Multi-User Collaboration)
CREATE TABLE IF NOT EXISTS `task_shares` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT NOT NULL,
  `shared_with_user_id` INT NOT NULL,
  `permission` VARCHAR(20) DEFAULT 'edit',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_task_share` (`task_id`, `shared_with_user_id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`shared_with_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
