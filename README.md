# 📚 图书管理系统 | Book Management System

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.6-brightgreen)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-orange)](https://www.oracle.com/java/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](https://www.mysql.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple)](https://getbootstrap.com/)
[![MyBatis Plus](https://img.shields.io/badge/MyBatis%20Plus-3.5.16-red)](https://baomidou.com/)

> 🎓 大学生第一个 GitHub 项目 | My first GitHub project as a college student

一个基于 Spring Boot + MyBatis Plus + MySQL 的图书管理系统，支持图书管理、读者管理、借阅管理、数据库管理等完整功能。

A full-featured library management system built with Spring Boot + MyBatis Plus + MySQL.

---

## ✨ 功能 | Features

### 📖 图书管理 | Book Management
- 图书的增删查改 | Add, delete, search, and edit books
- 关键词搜索（书名/作者） | Search by title or author
- 分类筛选 | Filter by category
- 库存统计 & 低库存预警 | Inventory stats & low stock alerts
- 数据概览仪表盘 | Dashboard with charts

### 👥 读者管理 | Reader Management
- 读者的增删查改 | Add, delete, search, and edit readers
- 搜索（姓名/编号/电话） | Search by name, ID, or phone
- 分页浏览 | Paginated browsing
- 当前借阅数统计 | Current borrow count per reader
- 状态管理（正常/停用） | Status management (active/inactive)

### 📋 借阅管理 | Borrow Management
- 借阅图书（自动扣库存 + 校验） | Borrow books (auto-decrement stock + validation)
- 归还图书（自动恢复库存） | Return books (auto-restore stock)
- 逾期自动检测 | Automatic overdue detection
- 统计面板（正在借阅 / 今日归还 / 逾期未还） | Statistics dashboard
- 搜索（书名/读者名） | Search by book title or reader name
- 分页浏览 | Paginated browsing

### 🗄️ 数据库管理 | Database Management (管理员 | Admin)
- 动态浏览所有数据表 | Browse all database tables
- 表数据增删查改 | CRUD operations on table data
- 动态表单（自动识别列类型） | Dynamic forms (auto-detect column types)
- SQL 控制台（仅 SELECT） | SQL console (SELECT only)

### 👤 用户系统 | User System
- 注册 / 登录 | Register / Login
- BCrypt 密码加密 | BCrypt password encryption
- 角色切换（普通用户 ⇄ 管理员）| Role switching (user ⇄ admin)

---

## 🛠️ 技术栈 | Tech Stack

| 技术 | Technology | 用途 | Purpose |
|------|-----------|------|---------|
| Spring Boot 4.0.6 | | 后端框架 | Backend framework |
| MyBatis Plus 3.5.16 | | ORM & 分页 | ORM & pagination |
| MySQL 8.0 | | 数据库 | Database |
| Bootstrap 5.3 | | 前端 UI | Frontend UI |
| Bootstrap Icons | | 图标 | Icons |
| BCrypt | | 密码加密 | Password encryption |
| Maven | | 构建工具 | Build tool |

---

## 🚀 快速开始 | Quick Start

### 环境要求 | Requirements
- **JDK 17+**
- **MySQL 8.0+**
- **Maven 3.9+**（或使用 `mvnw` 包装器 / or use `mvnw` wrapper）

### 步骤 | Steps

```bash
# 1. 克隆仓库 | Clone the repo
git clone https://github.com/VonDeoCezgo/book-management-system.git
cd book-management-system

# 2. 创建数据库 | Create database
# 用 MySQL 客户端执行 sql/schema.sql
# Execute sql/schema.sql with your MySQL client

# 3. 修改数据库配置 | Edit database config
# 编辑 src/main/resources/application.properties
# 修改 MySQL 用户名和密码
spring.datasource.username=root
spring.datasource.password=your_password

# 4. 启动应用 | Start the app
./mvnw spring-boot:run        # macOS / Linux
mvnw.cmd spring-boot:run      # Windows

# 5. 打开浏览器 | Open browser
# http://localhost:8080
```

### 默认管理员 | Default Admin
| 用户名 | Username | 密码 | Password |
|--------|----------|------|----------|
| admin | | admin123 | |

---

## 📁 项目结构 | Project Structure

```
book-management-system/
├── sql/
│   └── schema.sql              # 数据库建表脚本 | Database schema
├── src/main/java/com/library/
│   ├── LibraryApplication.java # 启动入口 | Entry point
│   ├── config/                 # 配置类 | Configuration
│   │   ├── CorsConfig.java         # 跨域配置
│   │   ├── DataInitializer.java    # 初始管理员创建
│   │   ├── MybatisPlusConfig.java  # MyBatis Plus & 分页插件
│   │   └── SecurityConfig.java     # BCrypt 密码编码器
│   ├── controller/             # 控制器 | REST Controllers
│   │   ├── BookController.java
│   │   ├── BorrowRecordController.java
│   │   ├── DatabaseController.java
│   │   ├── ReaderController.java
│   │   └── UserController.java
│   ├── mapper/                 # MyBatis Mapper 接口
│   ├── model/                  # 实体类 | Entity classes
│   │   ├── Book.java
│   │   ├── BorrowRecord.java
│   │   ├── Reader.java
│   │   └── User.java
│   └── service/                # 业务逻辑层 | Business logic
│       ├── BookService.java
│       ├── BorrowRecordService.java
│       ├── DatabaseService.java
│       ├── ReaderService.java
│       └── UserService.java
└── src/main/resources/
    ├── application.properties  # 应用配置 | App config
    └── static/                 # 前端静态文件 | Frontend
        ├── index.html          # 主页面 | Main page
        ├── login.html          # 登录页 | Login page
        ├── register.html       # 注册页 | Register page
        ├── css/style.css       # 样式 | Styles
        └── js/
            ├── app.js          # 主逻辑 & 图书管理
            ├── auth.js         # 登录注册逻辑
            ├── reader.js       # 读者管理
            ├── borrow.js       # 借阅管理
            └── admin.js        # 数据库管理面板
```

---

## 📸 截图 | Screenshots

> 启动应用后访问 http://localhost:8080 即可体验所有功能
>
> Visit http://localhost:8080 after starting the app to explore all features

| 页面 | Page |
|------|------|
| 图书查阅 | Book Browser |
| 读者管理 | Reader Management |
| 借阅管理 | Borrow Management |
| 数据库管理 | Database Admin Panel |
| 数据概览 | Dashboard |

---

## 📝 学习笔记 | Learning Notes

这是我作为大学生上传到 GitHub 的第一个项目。通过这个项目我学习了：

This is my first GitHub project as a college student. Through this project I learned:

- ✅ Spring Boot 后端开发 | Spring Boot backend development
- ✅ RESTful API 设计 | RESTful API design
- ✅ MyBatis Plus ORM 框架 | MyBatis Plus ORM framework
- ✅ MySQL 数据库设计与外键约束 | MySQL database design & foreign keys
- ✅ Bootstrap 5 响应式布局 | Bootstrap 5 responsive layout
- ✅ 原生 JavaScript 前端交互 | Vanilla JavaScript frontend
- ✅ Git 版本控制 | Git version control
- ✅ BCrypt 密码加密 | BCrypt password encryption
- ✅ 事务管理（借阅/归还库存一致性） | Transaction management

---

## 📄 许可 | License

MIT License — 欢迎学习和使用 | Free to learn and use

---

⭐ 如果这个项目对你有帮助，欢迎 Star！If this project helps you, please give it a Star!
