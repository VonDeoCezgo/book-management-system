const API_BASE = '/api/books';

let detailModal, deleteModal, toastInstance;
let deleteTargetId = null;
let searchTimer = null;
let allBooks = [];

document.addEventListener('DOMContentLoaded', () => {
    // 登录检查
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }

    // 显示用户信息
    updateUserDisplay(currentUser);
    updateRoleSwitch();

    // 初始化 BS 组件
    detailModal = new bootstrap.Modal('#detailModal');
    deleteModal = new bootstrap.Modal('#deleteModal');
    toastInstance = new bootstrap.Toast('#toast', { delay: 2500 });

    // 搜索框
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        const val = searchInput.value.trim();
        document.getElementById('searchClear').style.display = val ? 'inline-block' : 'none';
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => filterAndRender(), 300);
    });

    document.getElementById('searchClear').addEventListener('click', () => {
        searchInput.value = '';
        document.getElementById('searchClear').style.display = 'none';
        filterAndRender();
    });

    // 分类过滤
    document.getElementById('filterCategory').addEventListener('change', () => {
        filterAndRender();
    });

    // 确认删除
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // 管理员切换登录框——回车提交
    const adminSwitchPassword = document.getElementById('adminSwitchPassword');
    if (adminSwitchPassword) {
        adminSwitchPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmAdminSwitch();
        });
    }

    loadBooks();
});

// 更新用户显示
function updateUserDisplay(user) {
    document.getElementById('sidebarUsername').textContent = user.username;
    document.getElementById('sidebarRole').textContent = user.role === 'admin' ? '管理员' : '普通用户';
    document.getElementById('dropdownUsername').textContent = user.username;
}

// ==================== 页面切换 ====================

function switchPage(page) {
    // 菜单激活
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    // 显示对应页面
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    if (page === 'dashboard' || page === 'books') {
        loadBooks();
    }
    if (page === 'readers') {
        loadReaders();
    }
    if (page === 'borrows') {
        loadBorrowRecords();
    }
    if (page === 'admin') {
        loadAdminPanel();
    }
}

// ==================== 数据加载 ====================

async function loadBooks() {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error('加载失败');
        allBooks = await res.json();
        renderCategoryFilter();
        filterAndRender();
        updateStats(allBooks);
        if (document.getElementById('page-dashboard').classList.contains('active')) {
            renderDashboard(allBooks);
        }
    } catch (err) {
        showToast('加载图书列表失败: ' + err.message, 'danger');
    }
}

// ==================== 筛选 & 渲染 ====================

function renderCategoryFilter() {
    const select = document.getElementById('filterCategory');
    const currentVal = select.value;
    const categories = [...new Set(allBooks.filter(b => b.category).map(b => b.category))];
    select.innerHTML = '<option value="">全部分类</option>' +
        categories.map(c => `<option value="${escapeHtml(c)}" ${c === currentVal ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function filterAndRender() {
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    const category = document.getElementById('filterCategory').value;

    let filtered = allBooks;
    if (keyword) {
        filtered = filtered.filter(b =>
            (b.title && b.title.toLowerCase().includes(keyword)) ||
            (b.author && b.author.toLowerCase().includes(keyword))
        );
    }
    if (category) {
        filtered = filtered.filter(b => b.category === category);
    }

    renderTable(filtered);
    document.getElementById('searchInfo').textContent = (keyword || category) ? `筛选结果：${filtered.length} 本` : '';
}

function renderTable(books) {
    const tbody = document.getElementById('bookTableBody');
    document.getElementById('bookCount').textContent = books.length;

    if (books.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="bi bi-inbox"></i></div>
                        <p class="text-muted">没有找到图书</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = books.map((book, i) => {
        const qty = book.quantity || 0;
        let qtyClass = qty === 0 ? 'out-of-stock' : qty < 5 ? 'low-stock' : 'in-stock';

        return `
        <tr>
            <td class="ps-4" data-label="#">${i + 1}</td>
            <td data-label="书名"><span class="book-title">${escapeHtml(book.title)}</span></td>
            <td data-label="作者">${escapeHtml(book.author)}</td>
            <td data-label="ISBN">${book.isbn || '-'}</td>
            <td data-label="分类">${book.category ? `<span class="badge-category">${escapeHtml(book.category)}</span>` : '-'}</td>
            <td data-label="价格"><span class="price-text">¥${book.price != null ? book.price.toFixed(2) : '0.00'}</span></td>
            <td data-label="库存"><span class="quantity-badge ${qtyClass}">${qty}</span></td>
            <td class="text-center pe-4" data-label="操作">
                <button class="btn-action btn-view" onclick="showDetail(${book.id})" title="查看">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn-action btn-edit" onclick="editBookFromList(${book.id})" title="编辑">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn-action btn-delete" onclick="showDeleteConfirm(${book.id}, '${escapeHtml(book.title)}')" title="删除">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ==================== 统计 ====================

function updateStats(books) {
    document.getElementById('totalBooks').textContent = books.length;
    const categories = new Set(books.filter(b => b.category).map(b => b.category));
    document.getElementById('totalCategories').textContent = categories.size;
    const totalQty = books.reduce((sum, b) => sum + (b.quantity || 0), 0);
    document.getElementById('totalQuantity').textContent = totalQty;
    document.getElementById('availableBooks').textContent = totalQty;
}

// ==================== 仪表盘 ====================

function renderDashboard(books) {
    document.getElementById('dashTotalBooks').textContent = books.length;
    const categories = [...new Set(books.filter(b => b.category).map(b => b.category))];
    document.getElementById('dashCategories').textContent = categories.length;
    const totalQty = books.reduce((sum, b) => sum + (b.quantity || 0), 0);
    document.getElementById('dashQuantity').textContent = totalQty;
    document.getElementById('dashAvailable').textContent = totalQty;

    // 分类分布
    const catContainer = document.getElementById('categoryStats');
    if (categories.length === 0) {
        catContainer.innerHTML = '<p class="text-muted text-center py-4">暂无数据</p>';
    } else {
        const maxCount = Math.max(...categories.map(c => books.filter(b => b.category === c).length));
        catContainer.innerHTML = categories.map(c => {
            const count = books.filter(b => b.category === c).length;
            const pct = maxCount > 0 ? (count / maxCount * 100) : 0;
            return `
                <div class="category-bar">
                    <span class="bar-label">${escapeHtml(c)}</span>
                    <div class="flex-grow-1" style="background:#eef0f5;border-radius:4px;height:8px;">
                        <div class="bar-fill" style="width:${pct}%;"></div>
                    </div>
                    <span class="bar-count">${count} 本</span>
                </div>`;
        }).join('');
    }

    // 低库存预警
    const lowStock = books.filter(b => b.quantity != null && b.quantity < 5);
    const lowContainer = document.getElementById('lowStockList');
    if (lowStock.length === 0) {
        lowContainer.innerHTML = '<p class="text-success text-center py-3"><i class="bi bi-check-circle me-2"></i>库存状况良好，无需预警</p>';
    } else {
        lowContainer.innerHTML = lowStock.map(b => `
            <div class="low-stock-item">
                <span><strong>${escapeHtml(b.title)}</strong> <small class="text-muted">(${escapeHtml(b.author)})</small></span>
                <span class="stock-warn"><i class="bi bi-exclamation-circle me-1"></i>仅剩 ${b.quantity} 本</span>
            </div>`).join('');
    }
}

// ==================== 从列表编辑 ====================

async function editBookFromList(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}`);
        if (!res.ok) throw new Error('获取图书信息失败');
        const book = await res.json();

        fillEditForm(book);
        switchPage('add');
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function fillEditForm(book) {
    document.getElementById('editBookId').value = book.id;
    document.getElementById('title').value = book.title || '';
    document.getElementById('author').value = book.author || '';
    document.getElementById('isbn').value = book.isbn || '';
    document.getElementById('publisher').value = book.publisher || '';
    document.getElementById('publishDate').value = book.publishDate || '';
    document.getElementById('category').value = book.category || '';
    document.getElementById('price').value = book.price != null ? book.price : '';
    document.getElementById('quantity').value = book.quantity != null ? book.quantity : 1;
    document.getElementById('description').value = book.description || '';

    document.getElementById('saveBookBtn').innerHTML = '<i class="bi bi-check-lg me-1"></i>更新图书';
    document.getElementById('editHint').style.display = 'inline';
}

function resetAddForm() {
    document.getElementById('addBookForm').reset();
    document.getElementById('editBookId').value = '';
    document.getElementById('quantity').value = 1;
    document.getElementById('saveBookBtn').innerHTML = '<i class="bi bi-check-lg me-1"></i>保存图书';
    document.getElementById('editHint').style.display = 'none';
    clearValidation();
}

// ==================== 保存图书（页面表单） ====================

async function saveBookFromPage() {
    if (!validateForm()) return;

    const id = document.getElementById('editBookId').value;
    const bookData = {
        title: document.getElementById('title').value.trim(),
        author: document.getElementById('author').value.trim(),
        isbn: document.getElementById('isbn').value.trim() || null,
        publisher: document.getElementById('publisher').value.trim() || null,
        publishDate: document.getElementById('publishDate').value || null,
        category: document.getElementById('category').value || null,
        price: parseFloat(document.getElementById('price').value) || 0,
        quantity: parseInt(document.getElementById('quantity').value) || 0,
        description: document.getElementById('description').value.trim() || null
    };

    const url = id ? `${API_BASE}/${id}` : API_BASE;
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookData)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '保存失败');
        }

        resetAddForm();
        showToast(id ? '图书更新成功!' : '图书添加成功!', 'success');
        switchPage('books');
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== 查看详情 ====================

async function showDetail(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}`);
        if (!res.ok) throw new Error('获取图书详情失败');
        const book = await res.json();

        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <div class="text-center mb-4">
                <div style="font-size:3rem;color:var(--primary);"><i class="bi bi-book"></i></div>
                <h5 class="mt-2 mb-1">${escapeHtml(book.title)}</h5>
                <span class="badge-category">${book.category || '未分类'}</span>
            </div>
            <table class="table table-borderless">
                <tr><td class="text-muted" width="80">作者</td><td>${escapeHtml(book.author)}</td></tr>
                <tr><td class="text-muted">ISBN</td><td>${book.isbn || '-'}</td></tr>
                <tr><td class="text-muted">出版社</td><td>${book.publisher || '-'}</td></tr>
                <tr><td class="text-muted">出版日期</td><td>${book.publishDate || '-'}</td></tr>
                <tr><td class="text-muted">价格</td><td class="price-text">¥${book.price != null ? book.price.toFixed(2) : '0.00'}</td></tr>
                <tr><td class="text-muted">库存</td><td>${book.quantity || 0} 本</td></tr>
                <tr><td class="text-muted">简介</td><td>${book.description || '暂无简介'}</td></tr>
                <tr><td class="text-muted">入库时间</td><td>${formatDate(book.createdAt)}</td></tr>
            </table>
        `;
        detailModal.show();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== 删除图书 ====================

function showDeleteConfirm(id, title) {
    deleteTargetId = id;
    document.getElementById('deleteBookTitle').textContent = '《' + title + '》';
    deleteModal.show();
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    try {
        const res = await fetch(`${API_BASE}/${deleteTargetId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('删除失败');
        deleteModal.hide();
        showToast('图书已删除', 'success');
        loadBooks();
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        deleteTargetId = null;
    }
}

// ==================== 表单验证 ====================

function validateForm() {
    let valid = true;
    const fields = [
        { id: 'title', msg: '请输入书名' },
        { id: 'author', msg: '请输入作者' },
        { id: 'price', msg: '请输入有效价格', check: v => v && parseFloat(v) >= 0 },
        { id: 'quantity', msg: '请输入有效库存', check: v => v !== '' && parseInt(v) >= 0 }
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        const val = el.value.trim();
        const ok = f.check ? f.check(val) : val !== '';
        if (!ok) {
            el.classList.add('is-invalid');
            valid = false;
        } else {
            el.classList.remove('is-invalid');
        }
    });

    return valid;
}

function clearValidation() {
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

// ==================== 工具函数 ====================

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    document.getElementById('toastMessage').textContent = message;
    toastInstance.show();
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = '/login.html';
}

function switchRole() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
        // 切换回普通用户：恢复之前保存的普通用户
        const prevUser = JSON.parse(sessionStorage.getItem('prevUser'));
        if (prevUser) {
            sessionStorage.setItem('currentUser', JSON.stringify(prevUser));
            sessionStorage.removeItem('prevUser');
            showToast('已切换为普通用户: ' + prevUser.username, 'info');
            window.location.reload();
        } else {
            showToast('没有可切换的普通用户，请先注册一个普通账号', 'warning');
        }
    } else {
        // 切换为管理员：弹出登录框
        document.getElementById('adminSwitchError').classList.add('d-none');
        document.getElementById('adminSwitchUsername').value = 'admin';
        document.getElementById('adminSwitchPassword').value = 'admin123';
        const modal = new bootstrap.Modal('#adminSwitchModal');
        modal.show();
    }
}

// 确认管理员切换 — 调用后端验证
async function confirmAdminSwitch() {
    const username = document.getElementById('adminSwitchUsername').value.trim();
    const password = document.getElementById('adminSwitchPassword').value.trim();
    const errorEl = document.getElementById('adminSwitchError');

    if (!username || !password) {
        errorEl.textContent = '用户名和密码不能为空';
        errorEl.classList.remove('d-none');
        return;
    }

    try {
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = '用户名或密码错误，请重新登录';
            errorEl.classList.remove('d-none');
            return;
        }

        // 登录成功，验证是否为管理员
        if (data.user.role !== 'admin') {
            errorEl.textContent = '该账号不是管理员，请使用管理员账号';
            errorEl.classList.remove('d-none');
            return;
        }

        // 保存当前普通用户，切换到管理员
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        sessionStorage.setItem('prevUser', JSON.stringify(currentUser));
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        bootstrap.Modal.getInstance('#adminSwitchModal').hide();
        showToast('已切换为管理员: ' + data.user.username, 'info');
        window.location.reload();
    } catch (err) {
        errorEl.textContent = '网络错误，请稍后重试';
        errorEl.classList.remove('d-none');
    }
}

// 更新下拉菜单中的切换按钮
function updateRoleSwitch() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const switchLink = document.getElementById('switchRoleLink');
    const switchText = document.getElementById('switchRoleText');
    if (!switchLink || !switchText || !currentUser) return;

    switchLink.style.display = 'block';
    if (currentUser.role === 'admin') {
        switchText.textContent = '切换为普通用户';
    } else {
        switchText.textContent = '切换为管理员';
    }
}
