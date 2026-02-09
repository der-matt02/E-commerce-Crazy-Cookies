-- Initialization script for MySQL database
-- This script runs automatically when the container is first created

-- Create database if not exists (already handled by MYSQL_DATABASE env var)
-- CREATE DATABASE IF NOT EXISTS crazy_cookies;

-- Use the database
USE crazy_cookies;

-- Grant privileges to user (already handled by Docker env vars)
-- GRANT ALL PRIVILEGES ON crazy_cookies.* TO 'crazy_cookies_user'@'%';
-- FLUSH PRIVILEGES;

-- Set timezone to UTC
SET time_zone = '+00:00';

-- Enable UTF-8 support
ALTER DATABASE crazy_cookies CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Log initialization
SELECT 'MySQL database initialized successfully for Crazy Cookies E-commerce' AS message;
