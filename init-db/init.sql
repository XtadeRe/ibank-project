CREATE DATABASE IF NOT EXISTS compass_bank;
USE compass_bank;

CREATE TABLE IF NOT EXISTS transactions (
                                            id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                            type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    timestamp DATETIME NOT NULL
    );