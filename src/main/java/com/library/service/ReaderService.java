package com.library.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.library.mapper.BorrowRecordMapper;
import com.library.mapper.ReaderMapper;
import com.library.model.BorrowRecord;
import com.library.model.Reader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ReaderService {

    private final ReaderMapper readerMapper;
    private final BorrowRecordMapper borrowRecordMapper;

    public ReaderService(ReaderMapper readerMapper,
                         BorrowRecordMapper borrowRecordMapper) {
        this.readerMapper = readerMapper;
        this.borrowRecordMapper = borrowRecordMapper;
    }

    /**
     * 分页查询读者，支持搜索（按姓名、读者编号、电话）
     */
    public Page<Reader> getReaders(int page, int size, String keyword) {
        Page<Reader> pageParam = new Page<>(page, size);

        LambdaQueryWrapper<Reader> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w
                    .like(Reader::getName, keyword)
                    .or()
                    .like(Reader::getReaderNumber, keyword)
                    .or()
                    .like(Reader::getPhone, keyword));
        }
        wrapper.orderByDesc(Reader::getCreatedAt);

        Page<Reader> resultPage = readerMapper.selectPage(pageParam, wrapper);
        // 填充当前借阅数量
        for (Reader reader : resultPage.getRecords()) {
            long count = borrowRecordMapper.selectCount(
                    new LambdaQueryWrapper<BorrowRecord>()
                            .eq(BorrowRecord::getReaderId, reader.getId())
                            .eq(BorrowRecord::getStatus, "borrowing"));
            reader.setCurrentBorrowCount((int) count);
        }
        return resultPage;
    }

    public Optional<Reader> getReaderById(Long id) {
        Reader reader = readerMapper.selectById(id);
        if (reader != null) {
            long count = borrowRecordMapper.selectCount(
                    new LambdaQueryWrapper<BorrowRecord>()
                            .eq(BorrowRecord::getReaderId, reader.getId())
                            .eq(BorrowRecord::getStatus, "borrowing"));
            reader.setCurrentBorrowCount((int) count);
        }
        return Optional.ofNullable(reader);
    }

    @Transactional
    public Reader addReader(Reader reader) {
        // 检查读者编号唯一性
        if (readerMapper.selectCount(
                new LambdaQueryWrapper<Reader>()
                        .eq(Reader::getReaderNumber, reader.getReaderNumber())) > 0) {
            throw new RuntimeException("读者编号已存在: " + reader.getReaderNumber());
        }
        readerMapper.insert(reader);
        return reader;
    }

    @Transactional
    public Reader updateReader(Long id, Reader readerDetails) {
        Reader reader = readerMapper.selectById(id);
        if (reader == null) {
            throw new RuntimeException("读者不存在: " + id);
        }

        // 检查读者编号唯一性（排除自身）
        if (!reader.getReaderNumber().equals(readerDetails.getReaderNumber())
                && readerMapper.selectCount(
                new LambdaQueryWrapper<Reader>()
                        .eq(Reader::getReaderNumber, readerDetails.getReaderNumber())) > 0) {
            throw new RuntimeException("读者编号已存在: " + readerDetails.getReaderNumber());
        }

        reader.setName(readerDetails.getName());
        reader.setReaderNumber(readerDetails.getReaderNumber());
        reader.setGender(readerDetails.getGender());
        reader.setPhone(readerDetails.getPhone());
        reader.setEmail(readerDetails.getEmail());
        reader.setAddress(readerDetails.getAddress());
        reader.setMaxBorrow(readerDetails.getMaxBorrow());
        reader.setStatus(readerDetails.getStatus());

        readerMapper.updateById(reader);
        return reader;
    }

    @Transactional
    public void deleteReader(Long id) {
        Reader reader = readerMapper.selectById(id);
        if (reader == null) {
            throw new RuntimeException("读者不存在: " + id);
        }

        // 检查是否有未归还的借阅记录
        long activeBorrows = borrowRecordMapper.selectCount(
                new LambdaQueryWrapper<BorrowRecord>()
                        .eq(BorrowRecord::getReaderId, id)
                        .in(BorrowRecord::getStatus, "borrowing", "overdue"));
        if (activeBorrows > 0) {
            throw new RuntimeException("该读者还有 " + activeBorrows + " 本图书未归还，无法删除");
        }

        readerMapper.deleteById(id);
    }

    /**
     * 获取所有活跃读者（用于下拉选择）
     */
    public List<Reader> getActiveReaders() {
        List<Reader> readers = readerMapper.selectList(
                new LambdaQueryWrapper<Reader>()
                        .eq(Reader::getStatus, "active")
                        .orderByAsc(Reader::getName));
        for (Reader reader : readers) {
            long count = borrowRecordMapper.selectCount(
                    new LambdaQueryWrapper<BorrowRecord>()
                            .eq(BorrowRecord::getReaderId, reader.getId())
                            .eq(BorrowRecord::getStatus, "borrowing"));
            reader.setCurrentBorrowCount((int) count);
        }
        return readers;
    }
}
