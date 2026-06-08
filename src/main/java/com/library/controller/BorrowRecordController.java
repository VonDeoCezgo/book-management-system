package com.library.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.library.model.BorrowRecord;
import com.library.service.BorrowRecordService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/borrows")
public class BorrowRecordController {

    private final BorrowRecordService borrowRecordService;

    public BorrowRecordController(BorrowRecordService borrowRecordService) {
        this.borrowRecordService = borrowRecordService;
    }

    /**
     * 分页查询借阅记录（支持搜索）
     */
    @GetMapping
    public ResponseEntity<Page<BorrowRecord>> getBorrowRecords(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(borrowRecordService.getBorrowRecords(page, size, keyword));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBorrowRecordById(@PathVariable Long id) {
        return borrowRecordService.getBorrowRecordById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "借阅记录不存在")));
    }

    /**
     * 借阅图书
     */
    @PostMapping
    public ResponseEntity<?> borrowBook(@Valid @RequestBody BorrowRecord record) {
        try {
            BorrowRecord saved = borrowRecordService.borrowBook(record);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 归还图书
     */
    @PutMapping("/{id}/return")
    public ResponseEntity<?> returnBook(@PathVariable Long id) {
        try {
            BorrowRecord record = borrowRecordService.returnBook(id);
            return ResponseEntity.ok(record);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBorrowRecord(@PathVariable Long id) {
        try {
            borrowRecordService.deleteBorrowRecord(id);
            return ResponseEntity.ok(Map.of("message", "删除成功"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 借阅统计：正在借阅、今日归还、逾期未还
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        return ResponseEntity.ok(borrowRecordService.getStatistics());
    }

    /**
     * 逾期未还记录列表
     */
    @GetMapping("/overdue")
    public ResponseEntity<?> getOverdueRecords() {
        return ResponseEntity.ok(borrowRecordService.getOverdueRecords());
    }
}
