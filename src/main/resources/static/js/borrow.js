// ==================== 借阅管理 ====================

const BORROW_API = '/api/borrows';
const BOOK_API = '/api/books';
const READER_ACTIVE_API = '/api/readers/active';

let borrowModal, returnModal, borrowDeleteModal;
let returnTargetId = null;
let borrowDeleteTargetId = null;
let borrowSearchTimer = null;
let currentBorrowPage = 1;
let currentBorrowSize = 10;
let currentBorrowKeyword = '';

document.addEventListener('DOMContentLoaded', () => {
    // 初始化模态框
    borrowModal = new bootstrap.Modal('#borrowModal');
    returnModal = new bootstrap.Modal('#returnModal');
    borrowDeleteModal = new bootstrap.Modal('#borrowDeleteModal');

    // 搜索框防抖
    const borrowSearchInput = document.getElementById('borrowSearchInput');
    if (borrowSearchInput) {
        borrowSearchInput.addEventListener('input', () => {
            clearTimeout(borrowSearchTimer);
            borrowSearchTimer = setTimeout(() => {
                currentBorrowKeyword = borrowSearchInput.value.trim();
                currentBorrowPage = 1;
                loadBorrowRecords();
            }, 300);
        });
    }

    // 确认归还
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');
    if (confirmReturnBtn) {
        confirmReturnBtn.addEventListener('click', confirmReturnBook);
    }

    // 确认删除借阅记录
    const confirmBorrowDeleteBtn = document.getElementById('confirmBorrowDeleteBtn');
    if (confirmBorrowDeleteBtn) {
        confirmBorrowDeleteBtn.addEventListener('click', confirmDeleteBorrowRecord);
    }

    // 借阅日期变化时自动计算应还日期
    const borrowDateInput = document.getElementById('borrowDate');
    const dueDateInput = document.getElementById('dueDate');
    if (borrowDateInput && dueDateInput) {
        borrowDateInput.addEventListener('change', () => {
            if (borrowDateInput.value) {
                const date = new Date(borrowDateInput.value);
                date.setDate(date.getDate() + 30);
                dueDateInput.value = date.toISOString().split('T')[0];
            }
        });
    }
});

async function loadBorrowRecords() {
    try {
        const params = new URLSearchParams({
            page: currentBorrowPage,
            size: currentBorrowSize
        });
        if (currentBorrowKeyword) {
            params.set('keyword', currentBorrowKeyword);
        }

        const res = await fetch(`${BORROW_API}?${params.toString()}`);
        if (!res.ok) throw new Error('加载借阅记录失败');
        const data = await res.json();

        renderBorrowTable(data.records || []);
        renderBorrowPagination(data);
        loadBorrowStatistics();
    } catch (err) {
        showToast('加载借阅记录失败: ' + err.message, 'danger');
    }
}

async function loadBorrowStatistics() {
    try {
        const res = await fetch(`${BORROW_API}/statistics`);
        if (!res.ok) return;
        const stats = await res.json();

        document.getElementById('borrowBorrowingCount').textContent = stats.borrowingCount || 0;
        document.getElementById('borrowTodayReturn').textContent = stats.todayReturnCount || 0;
        document.getElementById('borrowOverdueCount').textContent = stats.overdueCount || 0;
        document.getElementById('borrowTotalRecords').textContent = stats.totalRecords || 0;
    } catch (err) {
        // 统计加载失败不影响主表格
    }
}

function renderBorrowTable(records) {
    const tbody = document.getElementById('borrowTableBody');

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="bi bi-inbox"></i></div>
                        <p class="text-muted">没有找到借阅记录</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = records.map((record, i) => {
        let statusBadge = '';
        switch (record.status) {
            case 'borrowing':
                statusBadge = '<span class="badge-category" style="background:#e6f9ee;color:#16a34a;">借阅中</span>';
                break;
            case 'returned':
                statusBadge = '<span class="badge-category" style="background:#eef1fe;color:#4f6ef7;">已归还</span>';
                break;
            case 'overdue':
                statusBadge = '<span class="badge-category" style="background:#ffeaea;color:#e74c3c;">逾期未还</span>';
                break;
            default:
                statusBadge = `<span class="badge-category">${record.status}</span>`;
        }

        return `
        <tr>
            <td class="ps-4">${(currentBorrowPage - 1) * currentBorrowSize + i + 1}</td>
            <td><span class="book-title">${escapeHtml(record.bookTitle || '未知图书')}</span>
                ${record.bookIsbn ? `<br><small class="text-muted">${escapeHtml(record.bookIsbn)}</small>` : ''}
            </td>
            <td>${escapeHtml(record.readerName || '未知读者')}
                ${record.readerNumber ? `<br><small class="text-muted">${escapeHtml(record.readerNumber)}</small>` : ''}
            </td>
            <td>${record.borrowDate || '-'}</td>
            <td>${record.dueDate || '-'}</td>
            <td>${record.returnDate || '-'}</td>
            <td>${statusBadge}</td>
            <td class="text-center pe-4">
                ${(record.status === 'borrowing' || record.status === 'overdue') ?
                    `<button class="btn-action btn-edit" onclick="showReturnConfirm(${record.id}, '${escapeHtml(record.bookTitle || '')}', '${escapeHtml(record.readerName || '')}')" title="归还">
                        <i class="bi bi-check-circle"></i>
                    </button>` : ''}
                <button class="btn-action btn-delete" onclick="showBorrowDeleteConfirm(${record.id}, '${escapeHtml(record.bookTitle || '未知图书')}')" title="删除">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderBorrowPagination(data) {
    document.getElementById('borrowCount').textContent = data.total || 0;
    const nav = document.getElementById('borrowPagination');

    if (!data.total || data.total <= currentBorrowSize) {
        nav.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(data.total / currentBorrowSize);
    let html = '<ul class="pagination pagination-sm mb-0">';

    html += `<li class="page-item ${currentBorrowPage <= 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goBorrowPage(${currentBorrowPage - 1})">«</a></li>`;

    const startPage = Math.max(1, currentBorrowPage - 2);
    const endPage = Math.min(totalPages, currentBorrowPage + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goBorrowPage(1)">1</a></li>`;
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }

    for (let p = startPage; p <= endPage; p++) {
        html += `<li class="page-item ${p === currentBorrowPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goBorrowPage(${p})">${p}</a></li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goBorrowPage(${totalPages})">${totalPages}</a></li>`;
    }

    html += `<li class="page-item ${currentBorrowPage >= totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goBorrowPage(${currentBorrowPage + 1})">»</a></li>`;

    html += '</ul>';
    nav.innerHTML = html;
}

function goBorrowPage(page) {
    currentBorrowPage = page;
    loadBorrowRecords();
}

// ==================== 借阅图书 ====================

async function showBorrowModal() {
    try {
        // 加载图书列表（只显示有库存的）
        const booksRes = await fetch(BOOK_API);
        const books = await booksRes.json();

        const bookSelect = document.getElementById('borrowBookId');
        bookSelect.innerHTML = '<option value="">请选择图书</option>' +
            books.filter(b => b.quantity > 0)
                .map(b => `<option value="${b.id}">${escapeHtml(b.title)} (库存: ${b.quantity})</option>`)
                .join('');

        // 加载活跃读者列表
        const readersRes = await fetch(READER_ACTIVE_API);
        const readers = await readersRes.json();

        const readerSelect = document.getElementById('borrowReaderId');
        readerSelect.innerHTML = '<option value="">请选择读者</option>' +
            readers.map(r => `<option value="${r.id}">${escapeHtml(r.name)} (${r.readerNumber})</option>`)
                .join('');

        // 设置默认日期
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('borrowDate').value = today;
        document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];

        borrowModal.show();
    } catch (err) {
        showToast('加载选项失败: ' + err.message, 'danger');
    }
}

async function saveBorrow() {
    const bookId = document.getElementById('borrowBookId').value;
    const readerId = document.getElementById('borrowReaderId').value;
    const borrowDate = document.getElementById('borrowDate').value;
    const dueDate = document.getElementById('dueDate').value;

    if (!bookId) {
        showToast('请选择图书', 'warning');
        return;
    }
    if (!readerId) {
        showToast('请选择读者', 'warning');
        return;
    }

    const data = {
        bookId: parseInt(bookId),
        readerId: parseInt(readerId),
        borrowDate: borrowDate || null,
        dueDate: dueDate || null
    };

    try {
        const res = await fetch(BORROW_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '借阅失败');
        }

        borrowModal.hide();
        showToast('借阅成功!', 'success');
        loadBorrowRecords();
        // 也刷新图书列表以更新库存
        if (typeof loadBooks === 'function') loadBooks();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== 归还图书 ====================

function showReturnConfirm(id, bookTitle, readerName) {
    returnTargetId = id;
    document.getElementById('returnBookInfo').textContent =
        '《' + bookTitle + '》 — ' + readerName;
    returnModal.show();
}

async function confirmReturnBook() {
    if (!returnTargetId) return;
    try {
        const res = await fetch(`${BORROW_API}/${returnTargetId}/return`, { method: 'PUT' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '归还失败');
        }
        returnModal.hide();
        showToast('归还成功!', 'success');
        loadBorrowRecords();
        if (typeof loadBooks === 'function') loadBooks();
    } catch (err) {
        returnModal.hide();
        showToast(err.message, 'danger');
    } finally {
        returnTargetId = null;
    }
}

// ==================== 删除借阅记录 ====================

function showBorrowDeleteConfirm(id, bookTitle) {
    borrowDeleteTargetId = id;
    document.getElementById('deleteBorrowInfo').textContent = '《' + bookTitle + '》的借阅记录';
    borrowDeleteModal.show();
}

async function confirmDeleteBorrowRecord() {
    if (!borrowDeleteTargetId) return;
    try {
        const res = await fetch(`${BORROW_API}/${borrowDeleteTargetId}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '删除失败');
        }
        borrowDeleteModal.hide();
        showToast('借阅记录已删除', 'success');
        loadBorrowRecords();
        if (typeof loadBooks === 'function') loadBooks();
    } catch (err) {
        borrowDeleteModal.hide();
        showToast(err.message, 'danger');
    } finally {
        borrowDeleteTargetId = null;
    }
}
