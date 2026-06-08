package com.library.model;

import com.baomidou.mybatisplus.annotation.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@TableName("readers")
public class Reader {

    @TableId(type = IdType.AUTO)
    private Long id;

    @NotBlank(message = "姓名不能为空")
    private String name;

    @NotBlank(message = "读者编号不能为空")
    @TableField("reader_number")
    private String readerNumber;

    private String gender;

    private String phone;

    private String email;

    private String address;

    @TableField("max_borrow")
    private Integer maxBorrow = 5;

    private String status = "active";

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    // 扩展字段：当前借阅数量
    @TableField(exist = false)
    private Integer currentBorrowCount;

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getReaderNumber() { return readerNumber; }
    public void setReaderNumber(String readerNumber) { this.readerNumber = readerNumber; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Integer getMaxBorrow() { return maxBorrow; }
    public void setMaxBorrow(Integer maxBorrow) { this.maxBorrow = maxBorrow; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Integer getCurrentBorrowCount() { return currentBorrowCount; }
    public void setCurrentBorrowCount(Integer currentBorrowCount) { this.currentBorrowCount = currentBorrowCount; }
}
