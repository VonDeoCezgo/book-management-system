package com.library.model;

import com.baomidou.mybatisplus.annotation.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("borrow_records")
public class BorrowRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @NotNull(message = "图书ID不能为空")
    @TableField("book_id")
    private Long bookId;

    @NotNull(message = "读者ID不能为空")
    @TableField("reader_id")
    private Long readerId;

    @NotNull(message = "借阅日期不能为空")
    @TableField("borrow_date")
    private LocalDate borrowDate;

    @NotNull(message = "应还日期不能为空")
    @TableField("due_date")
    private LocalDate dueDate;

    @TableField("return_date")
    private LocalDate returnDate;

    private String status = "borrowing";

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    // 扩展字段（非数据库字段）

    @TableField(exist = false)
    private String bookTitle;

    @TableField(exist = false)
    private String readerName;

    @TableField(exist = false)
    private String readerNumber;

    @TableField(exist = false)
    private String bookIsbn;

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookId() { return bookId; }
    public void setBookId(Long bookId) { this.bookId = bookId; }

    public Long getReaderId() { return readerId; }
    public void setReaderId(Long readerId) { this.readerId = readerId; }

    public LocalDate getBorrowDate() { return borrowDate; }
    public void setBorrowDate(LocalDate borrowDate) { this.borrowDate = borrowDate; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public LocalDate getReturnDate() { return returnDate; }
    public void setReturnDate(LocalDate returnDate) { this.returnDate = returnDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getBookTitle() { return bookTitle; }
    public void setBookTitle(String bookTitle) { this.bookTitle = bookTitle; }

    public String getReaderName() { return readerName; }
    public void setReaderName(String readerName) { this.readerName = readerName; }

    public String getReaderNumber() { return readerNumber; }
    public void setReaderNumber(String readerNumber) { this.readerNumber = readerNumber; }

    public String getBookIsbn() { return bookIsbn; }
    public void setBookIsbn(String bookIsbn) { this.bookIsbn = bookIsbn; }
}
