package com.library.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.library.model.Reader;
import com.library.service.ReaderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/readers")
public class ReaderController {

    private final ReaderService readerService;

    public ReaderController(ReaderService readerService) {
        this.readerService = readerService;
    }

    /**
     * 分页查询读者（支持搜索）
     */
    @GetMapping
    public ResponseEntity<Page<Reader>> getReaders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(readerService.getReaders(page, size, keyword));
    }

    /**
     * 获取所有活跃读者（用于下拉选择）
     */
    @GetMapping("/active")
    public ResponseEntity<?> getActiveReaders() {
        return ResponseEntity.ok(readerService.getActiveReaders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getReaderById(@PathVariable Long id) {
        return readerService.getReaderById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "读者不存在")));
    }

    @PostMapping
    public ResponseEntity<?> addReader(@Valid @RequestBody Reader reader) {
        try {
            Reader saved = readerService.addReader(reader);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateReader(@PathVariable Long id, @Valid @RequestBody Reader reader) {
        try {
            Reader updated = readerService.updateReader(id, reader);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReader(@PathVariable Long id) {
        try {
            readerService.deleteReader(id);
            return ResponseEntity.ok(Map.of("message", "删除成功"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
