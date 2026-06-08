package com.library.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

@Service
public class DatabaseService {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public DatabaseService(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    /**
     * 获取当前数据库所有表名
     */
    public List<String> getTables() {
        return jdbcTemplate.queryForList(
            "SELECT TABLE_NAME FROM information_schema.TABLES " +
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' " +
            "ORDER BY TABLE_NAME",
            String.class);
    }

    /**
     * 获取表的列信息
     */
    public List<Map<String, Object>> getColumns(String tableName) {
        validateTableName(tableName);

        List<Map<String, Object>> columns = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            String catalog = conn.getCatalog();

            // 获取主键列名集合
            Set<String> pkColumns = new HashSet<>();
            try (ResultSet pkRs = meta.getPrimaryKeys(catalog, null, tableName)) {
                while (pkRs.next()) {
                    pkColumns.add(pkRs.getString("COLUMN_NAME"));
                }
            }

            // 获取自增列名
            Set<String> autoIncColumns = new HashSet<>();
            try (ResultSet colRs = meta.getColumns(catalog, null, tableName, null)) {
                while (colRs.next()) {
                    String colName = colRs.getString("COLUMN_NAME");
                    String isAuto = colRs.getString("IS_AUTOINCREMENT");
                    Map<String, Object> col = new LinkedHashMap<>();
                    col.put("name", colName);
                    col.put("type", colRs.getInt("DATA_TYPE"));
                    col.put("typeName", colRs.getString("TYPE_NAME"));
                    col.put("size", colRs.getInt("COLUMN_SIZE"));
                    col.put("nullable", colRs.getInt("NULLABLE") == DatabaseMetaData.columnNullable);
                    col.put("autoIncrement", "YES".equalsIgnoreCase(isAuto));
                    col.put("primaryKey", pkColumns.contains(colName));
                    columns.add(col);

                    if ("YES".equalsIgnoreCase(isAuto)) {
                        autoIncColumns.add(colName);
                    }
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("获取表结构失败: " + e.getMessage(), e);
        }
        return columns;
    }

    /**
     * 分页查询表数据
     */
    public Map<String, Object> getTableData(String tableName, int page, int size) {
        validateTableName(tableName);

        // 获取主键列用于排序
        String pkColumn = getPrimaryKeyColumn(tableName);
        String orderBy = pkColumn != null ? " ORDER BY " + pkColumn : "";

        int offset = (page - 1) * size;
        String dataSql = "SELECT * FROM " + tableName + orderBy + " LIMIT " + size + " OFFSET " + offset;
        String countSql = "SELECT COUNT(*) FROM " + tableName;

        List<Map<String, Object>> records = jdbcTemplate.queryForList(dataSql);
        Long total = jdbcTemplate.queryForObject(countSql, Long.class);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("records", records);
        result.put("total", total != null ? total : 0);
        result.put("current", page);
        result.put("size", size);
        result.put("pages", total != null ? (int) Math.ceil((double) total / size) : 0);
        return result;
    }

    /**
     * 插入一行数据
     */
    public Map<String, Object> insertRow(String tableName, Map<String, Object> data) {
        validateTableName(tableName);

        // 获取列信息，过滤掉不存在的列和自增列
        List<Map<String, Object>> columns = getColumns(tableName);
        Set<String> validColumns = new HashSet<>();
        Set<String> autoIncColumns = new HashSet<>();
        for (Map<String, Object> col : columns) {
            validColumns.add((String) col.get("name"));
            if (Boolean.TRUE.equals(col.get("autoIncrement"))) {
                autoIncColumns.add((String) col.get("name"));
            }
        }

        // 构建 INSERT 语句
        StringBuilder cols = new StringBuilder();
        StringBuilder placeholders = new StringBuilder();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String colName = entry.getKey();
            if (!validColumns.contains(colName) || autoIncColumns.contains(colName)) {
                continue;
            }
            if (cols.length() > 0) {
                cols.append(", ");
                placeholders.append(", ");
            }
            cols.append(colName);
            placeholders.append("?");
            values.add(entry.getValue());
        }

        if (cols.length() == 0) {
            throw new RuntimeException("没有有效的列数据");
        }

        String sql = "INSERT INTO " + tableName + " (" + cols + ") VALUES (" + placeholders + ")";
        jdbcTemplate.update(sql, values.toArray());

        // 获取插入后的主键
        String pkCol = getPrimaryKeyColumn(tableName);
        if (pkCol != null && autoIncColumns.contains(pkCol)) {
            // 查询最后插入的 ID
            Long lastId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
            return getTableData(tableName, 1, 1).get("records") instanceof List<?> list
                    && !list.isEmpty() ? (Map<String, Object>) list.get(0) : data;
        }

        return data;
    }

    /**
     * 更新一行数据（按主键）
     */
    public void updateRow(String tableName, String pkColumn, Object pkValue, Map<String, Object> data) {
        validateTableName(tableName);

        // 获取列信息
        List<Map<String, Object>> columns = getColumns(tableName);
        Set<String> validColumns = new HashSet<>();
        for (Map<String, Object> col : columns) {
            validColumns.add((String) col.get("name"));
        }

        StringBuilder setClause = new StringBuilder();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String colName = entry.getKey();
            if (!validColumns.contains(colName) || colName.equals(pkColumn)) {
                continue;
            }
            if (setClause.length() > 0) {
                setClause.append(", ");
            }
            setClause.append(colName).append(" = ?");
            values.add(entry.getValue());
        }

        if (setClause.length() == 0) {
            throw new RuntimeException("没有需要更新的列");
        }

        values.add(pkValue);
        String sql = "UPDATE " + tableName + " SET " + setClause + " WHERE " + pkColumn + " = ?";
        jdbcTemplate.update(sql, values.toArray());
    }

    /**
     * 删除一行数据（按主键）
     */
    public void deleteRow(String tableName, String pkColumn, Object pkValue) {
        validateTableName(tableName);
        String sql = "DELETE FROM " + tableName + " WHERE " + pkColumn + " = ?";
        jdbcTemplate.update(sql, pkValue);
    }

    /**
     * 执行 SQL 查询（仅允许 SELECT / SHOW / DESCRIBE / EXPLAIN）
     */
    public List<Map<String, Object>> executeQuery(String sql) {
        String trimmed = sql.trim().toUpperCase();
        if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("SHOW")
                && !trimmed.startsWith("DESCRIBE") && !trimmed.startsWith("EXPLAIN")) {
            throw new RuntimeException("仅允许执行 SELECT / SHOW / DESCRIBE / EXPLAIN 查询语句");
        }
        // 禁止多语句
        if (sql.contains(";")) {
            // 只取第一条语句
            int idx = sql.indexOf(";");
            String first = sql.substring(0, idx).trim();
            if (!first.isEmpty()) {
                return jdbcTemplate.queryForList(first);
            }
            throw new RuntimeException("无效的 SQL 语句");
        }
        return jdbcTemplate.queryForList(sql);
    }

    // ==================== 辅助方法 ====================

    /**
     * 获取表的主键列名
     */
    private String getPrimaryKeyColumn(String tableName) {
        List<Map<String, Object>> columns = getColumns(tableName);
        for (Map<String, Object> col : columns) {
            if (Boolean.TRUE.equals(col.get("primaryKey"))) {
                return (String) col.get("name");
            }
        }
        // 回退：尝试 id 列
        for (Map<String, Object> col : columns) {
            if ("id".equalsIgnoreCase((String) col.get("name"))) {
                return (String) col.get("name");
            }
        }
        return null;
    }

    /**
     * 校验表名是否存在于当前数据库（防止 SQL 注入）
     */
    private void validateTableName(String tableName) {
        if (tableName == null || tableName.isBlank()) {
            throw new RuntimeException("表名不能为空");
        }
        // 只允许字母、数字、下划线
        if (!tableName.matches("^[a-zA-Z0-9_]+$")) {
            throw new RuntimeException("无效的表名: " + tableName);
        }
        List<String> tables = getTables();
        if (!tables.contains(tableName)) {
            throw new RuntimeException("表不存在: " + tableName);
        }
    }
}
