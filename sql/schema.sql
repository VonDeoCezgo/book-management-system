-- ============================================================
-- 图书管理系统 - 完整数据库脚本
-- 数据库: library_db | 字符集: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS library_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE library_db;

-- ============================================================
-- 1. 用户表 (users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码(BCrypt)',
    email VARCHAR(128) COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '电话',
    role VARCHAR(16) NOT NULL DEFAULT 'user' COMMENT '角色: admin/user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. 图书表 (books)
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT '书名',
    author VARCHAR(128) NOT NULL COMMENT '作者',
    isbn VARCHAR(20) UNIQUE COMMENT 'ISBN号',
    publisher VARCHAR(128) COMMENT '出版社',
    publish_date DATE COMMENT '出版日期',
    category VARCHAR(64) COMMENT '分类',
    price DECIMAL(10, 2) COMMENT '价格',
    quantity INT NOT NULL DEFAULT 1 COMMENT '库存数量',
    description TEXT COMMENT '简介',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. 读者表 (readers)
-- ============================================================
CREATE TABLE IF NOT EXISTS readers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL COMMENT '姓名',
    reader_number VARCHAR(32) UNIQUE NOT NULL COMMENT '读者编号',
    gender VARCHAR(8) COMMENT '性别',
    phone VARCHAR(20) COMMENT '电话',
    email VARCHAR(128) COMMENT '邮箱',
    address VARCHAR(255) COMMENT '地址',
    max_borrow INT NOT NULL DEFAULT 5 COMMENT '最大借阅数量',
    status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT '状态: active-正常, inactive-停用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. 借阅记录表 (borrow_records)
-- ============================================================
CREATE TABLE IF NOT EXISTS borrow_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT NOT NULL COMMENT '图书ID',
    reader_id BIGINT NOT NULL COMMENT '读者ID',
    borrow_date DATE NOT NULL COMMENT '借阅日期',
    due_date DATE NOT NULL COMMENT '应还日期',
    return_date DATE COMMENT '实际归还日期',
    status VARCHAR(16) NOT NULL DEFAULT 'borrowing' COMMENT 'borrowing/returned/overdue',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 测试数据
-- ============================================================

-- 图书测试数据
INSERT IGNORE INTO books (id, title, author, isbn, publisher, publish_date, category, price, quantity, description) VALUES
(1, 'Java编程思想', 'Bruce Eckel', '978-7111213826', '机械工业出版社', '2007-06-01', '编程技术', 108.00, 5, 'Java经典入门书籍'),
(2, 'Spring实战', 'Craig Walls', '978-7115417305', '人民邮电出版社', '2016-04-01', '编程技术', 89.00, 3, 'Spring框架权威指南'),
(3, '深入理解Java虚拟机', '周志明', '978-7111421900', '机械工业出版社', '2013-09-01', '编程技术', 79.00, 8, 'JVM深度解析'),
(4, '算法导论', 'Thomas H.Cormen', '978-7111407010', '机械工业出版社', '2013-01-01', '计算机科学', 128.00, 4, '算法领域经典教材'),
(5, '数据库系统概念', 'Abraham Silberschatz', '978-7111375371', '机械工业出版社', '2012-03-01', '数据库', 99.00, 2, '数据库理论权威著作');

-- 读者测试数据
INSERT IGNORE INTO readers (id, name, reader_number, gender, phone, email, address) VALUES
(1, '张三', 'R2024001', '男', '13800001001', 'zhangsan@email.com', '北京市海淀区'),
(2, '李四', 'R2024002', '女', '13800001002', 'lisi@email.com', '上海市浦东新区'),
(3, '王五', 'R2024003', '男', '13800001003', 'wangwu@email.com', '广州市天河区');

-- 借阅测试数据
INSERT IGNORE INTO borrow_records (id, book_id, reader_id, borrow_date, due_date, return_date, status) VALUES
(1, 1, 1, '2026-05-01', '2026-05-31', '2026-05-25', 'returned'),
(2, 2, 1, '2026-06-01', '2026-07-01', NULL, 'borrowing'),
(3, 3, 2, '2026-05-15', '2026-06-14', NULL, 'borrowing'),
(4, 4, 3, '2026-04-01', '2026-05-01', NULL, 'overdue'),
(5, 5, 2, '2026-06-08', '2026-07-08', NULL, 'borrowing');
