package com.library.controller;

import com.library.service.DatabaseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class DatabaseController {

    private final DatabaseService databaseService;

    public DatabaseController(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    /**
     * 获取所有表名
     */
    @GetMapping("/tables")
    public ResponseEntity<List<String>> getTables() {
        return ResponseEntity.ok(databaseService.getTables());
    }

    /**
     * 获取表结构
     */
    @GetMapping("/tables/{tableName}/columns")
    public ResponseEntity<?> getColumns(@PathVariable String tableName) {
        try {
            return ResponseEntity.ok(databaseService.getColumns(tableName));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 分页查询表数据
     */
    @GetMapping("/tables/{tableName}/data")
    public ResponseEntity<?> getTableData(
            @PathVariable String tableName,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "15") int size) {
        try {
            return ResponseEntity.ok(databaseService.getTableData(tableName, page, size));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 插入行
     */
    @PostMapping("/tables/{tableName}/data")
    public ResponseEntity<?> insertRow(
            @PathVariable String tableName,
            @RequestBody Map<String, Object> data) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(databaseService.insertRow(tableName, data));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 更新行
     */
    @PutMapping("/tables/{tableName}/data/{id}")
    public ResponseEntity<?> updateRow(
            @PathVariable String tableName,
            @PathVariable String id,
            @RequestParam String pkColumn,
            @RequestBody Map<String, Object> data) {
        try {
            databaseService.updateRow(tableName, pkColumn, id, data);
            return ResponseEntity.ok(Map.of("message", "更新成功"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 删除行
     */
    @DeleteMapping("/tables/{tableName}/data/{id}")
    public ResponseEntity<?> deleteRow(
            @PathVariable String tableName,
            @PathVariable String id,
            @RequestParam String pkColumn) {
        try {
            databaseService.deleteRow(tableName, pkColumn, id);
            return ResponseEntity.ok(Map.of("message", "删除成功"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 执行 SQL 查询（仅 SELECT）
     */
    @PostMapping("/execute")
    public ResponseEntity<?> executeQuery(@RequestBody Map<String, String> body) {
        String sql = body.get("sql");
        if (sql == null || sql.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "SQL 语句不能为空"));
        }
        try {
            List<Map<String, Object>> result = databaseService.executeQuery(sql);
            return ResponseEntity.ok(Map.of("columns",
                    result.isEmpty() ? List.of() : result.get(0).keySet(),
                    "rows", result,
                    "total", result.size()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
