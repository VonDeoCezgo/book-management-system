package com.library.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.library.mapper.BookMapper;
import com.library.model.Book;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class BookService {

    private final BookMapper bookMapper;

    public BookService(BookMapper bookMapper) {
        this.bookMapper = bookMapper;
    }

    public List<Book> getAllBooks() {
        return bookMapper.selectList(null);
    }

    public Optional<Book> getBookById(Long id) {
        return Optional.ofNullable(bookMapper.selectById(id));
    }

    public Book addBook(Book book) {
        bookMapper.insert(book);
        return book;
    }

    public Book updateBook(Long id, Book bookDetails) {
        Book book = bookMapper.selectById(id);
        if (book == null) {
            throw new RuntimeException("图书不存在: " + id);
        }

        book.setTitle(bookDetails.getTitle());
        book.setAuthor(bookDetails.getAuthor());
        book.setIsbn(bookDetails.getIsbn());
        book.setPublisher(bookDetails.getPublisher());
        book.setPublishDate(bookDetails.getPublishDate());
        book.setCategory(bookDetails.getCategory());
        book.setPrice(bookDetails.getPrice());
        book.setQuantity(bookDetails.getQuantity());
        book.setDescription(bookDetails.getDescription());

        bookMapper.updateById(book);
        return book;
    }

    public void deleteBook(Long id) {
        if (bookMapper.selectById(id) == null) {
            throw new RuntimeException("图书不存在: " + id);
        }
        bookMapper.deleteById(id);
    }

    public List<Book> searchBooks(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return bookMapper.selectList(null);
        }
        return bookMapper.selectList(
            new LambdaQueryWrapper<Book>()
                .like(Book::getTitle, keyword)
                .or()
                .like(Book::getAuthor, keyword)
        );
    }
}
