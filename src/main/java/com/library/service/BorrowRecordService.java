package com.library.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.library.mapper.BorrowRecordMapper;
import com.library.mapper.ReaderMapper;
import com.library.mapper.BookMapper;
import com.library.model.BorrowRecord;
import com.library.model.Reader;
import com.library.model.Book;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BorrowRecordService {

    private final BorrowRecordMapper borrowRecordMapper;
    private final BookMapper bookMapper;
    private final ReaderMapper readerMapper;

    public BorrowRecordService(BorrowRecordMapper borrowRecordMapper,
                               BookMapper bookMapper,
                               ReaderMapper readerMapper) {
        this.borrowRecordMapper = borrowRecordMapper;
        this.bookMapper = bookMapper;
        this.readerMapper = readerMapper;
    }

    /**
     * 分页查询借阅记录，支持搜索（按书名或读者名）
     */
    public Page<BorrowRecord> getBorrowRecords(int page, int size, String keyword) {
        Page<BorrowRecord> pageParam = new Page<>(page, size);

        // 如果有关键字搜索，先查出所有匹配记录再手动分页
        if (keyword != null && !keyword.isBlank()) {
            List<BorrowRecord> allRecords = borrowRecordMapper.selectList(null);
            List<BorrowRecord> filtered = allRecords.stream()
                    .filter(r -> {
                        Book book = bookMapper.selectById(r.getBookId());
                        Reader reader = readerMapper.selectById(r.getReaderId());
                        String bookTitle = book != null ? book.getTitle() : "";
                        String readerName = reader != null ? reader.getName() : "";
                        String kw = keyword.toLowerCase();
                        return bookTitle.toLowerCase().contains(kw)
                                || readerName.toLowerCase().contains(kw);
                    })
                    .toList();

            int total = filtered.size();
            int from = (page - 1) * size;
            int to = Math.min(from + size, total);
            List<BorrowRecord> pagedList = (from < total)
                    ? filtered.subList(from, to)
                    : List.of();

            Page<BorrowRecord> result = new Page<>(page, size, total);
            result.setRecords(enrichRecords(pagedList));
            return result;
        }

        LambdaQueryWrapper<BorrowRecord> wrapper = new LambdaQueryWrapper<BorrowRecord>()
                .orderByDesc(BorrowRecord::getCreatedAt);

        Page<BorrowRecord> resultPage = borrowRecordMapper.selectPage(pageParam, wrapper);
        resultPage.setRecords(enrichRecords(resultPage.getRecords()));
        return resultPage;
    }

    public Optional<BorrowRecord> getBorrowRecordById(Long id) {
        BorrowRecord record = borrowRecordMapper.selectById(id);
        if (record != null) {
            enrichRecord(record);
        }
        return Optional.ofNullable(record);
    }

    /**
     * 借阅图书
     */
    @Transactional
    public BorrowRecord borrowBook(BorrowRecord record) {
        // 校验图书是否存在
        Book book = bookMapper.selectById(record.getBookId());
        if (book == null) {
            throw new RuntimeException("图书不存在");
        }
        if (book.getQuantity() <= 0) {
            throw new RuntimeException("图书库存不足，无法借阅");
        }

        // 校验读者是否存在且状态正常
        Reader reader = readerMapper.selectById(record.getReaderId());
        if (reader == null) {
            throw new RuntimeException("读者不存在");
        }
        if ("inactive".equals(reader.getStatus())) {
            throw new RuntimeException("该读者已被停用，无法借阅");
        }

        // 检查读者当前借阅数量是否已达上限
        long currentBorrowCount = borrowRecordMapper.selectCount(
                new LambdaQueryWrapper<BorrowRecord>()
                        .eq(BorrowRecord::getReaderId, record.getReaderId())
                        .eq(BorrowRecord::getStatus, "borrowing"));
        if (currentBorrowCount >= reader.getMaxBorrow()) {
            throw new RuntimeException("该读者已达到最大借阅数量（" + reader.getMaxBorrow() + "本）");
        }

        // 检查该书是否已被该读者借阅且未还
        long sameBookCount = borrowRecordMapper.selectCount(
                new LambdaQueryWrapper<BorrowRecord>()
                        .eq(BorrowRecord::getBookId, record.getBookId())
                        .eq(BorrowRecord::getReaderId, record.getReaderId())
                        .eq(BorrowRecord::getStatus, "borrowing"));
        if (sameBookCount > 0) {
            throw new RuntimeException("该读者已借阅此书且未归还");
        }

        // 设置默认值
        if (record.getBorrowDate() == null) {
            record.setBorrowDate(LocalDate.now());
        }
        if (record.getDueDate() == null) {
            record.setDueDate(LocalDate.now().plusDays(30));
        }
        record.setStatus("borrowing");
        record.setReturnDate(null);

        // 扣减库存
        book.setQuantity(book.getQuantity() - 1);
        bookMapper.updateById(book);

        borrowRecordMapper.insert(record);
        enrichRecord(record);
        return record;
    }

    /**
     * 归还图书
     */
    @Transactional
    public BorrowRecord returnBook(Long id) {
        BorrowRecord record = borrowRecordMapper.selectById(id);
        if (record == null) {
            throw new RuntimeException("借阅记录不存在");
        }
        if (!"borrowing".equals(record.getStatus()) && !"overdue".equals(record.getStatus())) {
            throw new RuntimeException("该记录不是借阅中状态，无法归还");
        }

        record.setReturnDate(LocalDate.now());
        record.setStatus("returned");
        borrowRecordMapper.updateById(record);

        // 恢复库存
        Book book = bookMapper.selectById(record.getBookId());
        if (book != null) {
            book.setQuantity(book.getQuantity() + 1);
            bookMapper.updateById(book);
        }

        enrichRecord(record);
        return record;
    }

    /**
     * 删除借阅记录
     */
    @Transactional
    public void deleteBorrowRecord(Long id) {
        BorrowRecord record = borrowRecordMapper.selectById(id);
        if (record == null) {
            throw new RuntimeException("借阅记录不存在");
        }
        // 如果删除的是借阅中/逾期的记录，恢复库存
        if ("borrowing".equals(record.getStatus()) || "overdue".equals(record.getStatus())) {
            Book book = bookMapper.selectById(record.getBookId());
            if (book != null) {
                book.setQuantity(book.getQuantity() + 1);
                bookMapper.updateById(book);
            }
        }
        borrowRecordMapper.deleteById(id);
    }

    /**
     * 更新逾期状态（将 due_date < today 且 status='borrowing' 的标记为 overdue）
     */
    public int updateOverdueStatus() {
        List<BorrowRecord> overdueList = borrowRecordMapper.selectList(
                new LambdaQueryWrapper<BorrowRecord>()
                        .eq(BorrowRecord::getStatus, "borrowing")
                        .lt(BorrowRecord::getDueDate, LocalDate.now()));
        int count = 0;
        for (BorrowRecord r : overdueList) {
            r.setStatus("overdue");
            borrowRecordMapper.updateById(r);
            count++;
        }
        return count;
    }

    /**
     * 统计信息：正在借阅、今日归还、逾期未还
     */
    public Map<String, Object> getStatistics() {
        // 先更新逾期状态
        updateOverdueStatus();

        Map<String, Object> stats = new HashMap<>();

        // 正在借阅数量
        long borrowingCount = borrowRecordMapper.selectCount(
                new LambdaQueryWrapper<BorrowRecord>()
                        .eq(BorrowRecord::getStatus, "borrowing"));
        stats.put("borrowingCount", borrowingCount);

        // 今日归还数量
        long todayReturnCount = borrowRecordMapper.selectCount(
                new LambdaQueryWrapper<BorrowRecord>()
                        .eq(BorrowRecord::getReturnDate, LocalDate.now()));
        stats.put("todayReturnCount", todayReturnCount);

        // 逾期未还数量
        long overdueCount = borrowRecordMapper.selectCount(
                new LambdaQueryWrapper<BorrowRecord>()
                        .eq(BorrowRecord::getStatus, "overdue"));
        stats.put("overdueCount", overdueCount);

        // 总借阅记录数
        long totalRecords = borrowRecordMapper.selectCount(null);
        stats.put("totalRecords", totalRecords);

        return stats;
    }

    /**
     * 获取逾期未还的借阅记录列表
     */
    public List<BorrowRecord> getOverdueRecords() {
        updateOverdueStatus();
        List<BorrowRecord> records = borrowRecordMapper.selectList(
                new LambdaQueryWrapper<BorrowRecord>()
                        .eq(BorrowRecord::getStatus, "overdue")
                        .orderByAsc(BorrowRecord::getDueDate));
        return enrichRecords(records);
    }

    // ==================== 辅助方法 ====================

    private List<BorrowRecord> enrichRecords(List<BorrowRecord> records) {
        for (BorrowRecord r : records) {
            enrichRecord(r);
        }
        return records;
    }

    private void enrichRecord(BorrowRecord r) {
        Book book = bookMapper.selectById(r.getBookId());
        if (book != null) {
            r.setBookTitle(book.getTitle());
            r.setBookIsbn(book.getIsbn());
        }
        Reader reader = readerMapper.selectById(r.getReaderId());
        if (reader != null) {
            r.setReaderName(reader.getName());
            r.setReaderNumber(reader.getReaderNumber());
        }
    }
}
