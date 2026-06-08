// ==================== 读者管理 ====================

const READER_API = '/api/readers';

let readerModal, readerDeleteModal;
let deleteReaderTargetId = null;
let readerSearchTimer = null;
let currentReaderPage = 1;
let currentReaderSize = 10;
let currentReaderKeyword = '';

document.addEventListener('DOMContentLoaded', () => {
    // 初始化模态框
    readerModal = new bootstrap.Modal('#readerModal');
    readerDeleteModal = new bootstrap.Modal('#readerDeleteModal');

    // 搜索框防抖
    const readerSearchInput = document.getElementById('readerSearchInput');
    if (readerSearchInput) {
        readerSearchInput.addEventListener('input', () => {
            clearTimeout(readerSearchTimer);
            readerSearchTimer = setTimeout(() => {
                currentReaderKeyword = readerSearchInput.value.trim();
                currentReaderPage = 1;
                loadReaders();
            }, 300);
        });
    }

    // 确认删除
    const confirmBtn = document.getElementById('confirmReaderDeleteBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDeleteReader);
    }
});

async function loadReaders() {
    try {
        const params = new URLSearchParams({
            page: currentReaderPage,
            size: currentReaderSize
        });
        if (currentReaderKeyword) {
            params.set('keyword', currentReaderKeyword);
        }

        const res = await fetch(`${READER_API}?${params.toString()}`);
        if (!res.ok) throw new Error('加载读者列表失败');
        const data = await res.json();

        renderReaderTable(data.records || []);
        renderReaderPagination(data);
        loadReaderStats();
    } catch (err) {
        showToast('加载读者列表失败: ' + err.message, 'danger');
    }
}

async function loadReaderStats() {
    try {
        // 使用不分页的查询获取统计数据
        const res = await fetch(`${READER_API}?page=1&size=1`);
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('readerTotalCount').textContent = data.total || 0;

        // 用另一个查询获取活跃/停用统计 (取足够大的size获取全量)
        const resAll = await fetch(`${READER_API}?page=1&size=10000`);
        if (resAll.ok) {
            const allData = await resAll.json();
            const all = allData.records || [];
            document.getElementById('readerActiveCount').textContent =
                all.filter(r => r.status === 'active').length;
            document.getElementById('readerInactiveCount').textContent =
                all.filter(r => r.status === 'inactive').length;
        }
    } catch (err) {
        // 统计加载失败不阻塞主流程
    }
}

function renderReaderTable(readers) {
    const tbody = document.getElementById('readerTableBody');

    if (readers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="bi bi-inbox"></i></div>
                        <p class="text-muted">没有找到读者</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = readers.map((reader, i) => {
        const statusBadge = reader.status === 'active'
            ? '<span class="badge-category" style="background:#e6f9ee;color:#16a34a;">正常</span>'
            : '<span class="badge-category" style="background:#ffeaea;color:#e74c3c;">停用</span>';

        return `
        <tr>
            <td class="ps-4">${(currentReaderPage - 1) * currentReaderSize + i + 1}</td>
            <td><span class="book-title">${escapeHtml(reader.name)}</span></td>
            <td>${escapeHtml(reader.readerNumber)}</td>
            <td>${reader.gender || '-'}</td>
            <td>${reader.phone || '-'}</td>
            <td>${reader.maxBorrow || 5}</td>
            <td><span class="quantity-badge ${(reader.currentBorrowCount || 0) > 0 ? 'low-stock' : 'in-stock'}">${reader.currentBorrowCount || 0}</span></td>
            <td>${statusBadge}</td>
            <td class="text-center pe-4">
                <button class="btn-action btn-view" onclick="showReaderDetail(${reader.id})" title="查看">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn-action btn-edit" onclick="showEditReaderModal(${reader.id})" title="编辑">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn-action btn-delete" onclick="showReaderDeleteConfirm(${reader.id}, '${escapeHtml(reader.name)}')" title="删除">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderReaderPagination(data) {
    document.getElementById('readerCount').textContent = data.total || 0;
    const nav = document.getElementById('readerPagination');

    if (!data.total || data.total <= currentReaderSize) {
        nav.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(data.total / currentReaderSize);
    let html = '<ul class="pagination pagination-sm mb-0">';

    // 上一页
    html += `<li class="page-item ${currentReaderPage <= 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goReaderPage(${currentReaderPage - 1})">«</a></li>`;

    // 页码
    const startPage = Math.max(1, currentReaderPage - 2);
    const endPage = Math.min(totalPages, currentReaderPage + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goReaderPage(1)">1</a></li>`;
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }

    for (let p = startPage; p <= endPage; p++) {
        html += `<li class="page-item ${p === currentReaderPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goReaderPage(${p})">${p}</a></li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goReaderPage(${totalPages})">${totalPages}</a></li>`;
    }

    // 下一页
    html += `<li class="page-item ${currentReaderPage >= totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goReaderPage(${currentReaderPage + 1})">»</a></li>`;

    html += '</ul>';
    nav.innerHTML = html;
}

function goReaderPage(page) {
    currentReaderPage = page;
    loadReaders();
}

// ==================== 添加/编辑读者 ====================

function showAddReaderModal() {
    document.getElementById('editReaderId').value = '';
    document.getElementById('readerModalTitle').innerHTML = '<i class="bi bi-person-plus me-2"></i>添加读者';
    resetReaderForm();
    readerModal.show();
}

async function showEditReaderModal(id) {
    try {
        const res = await fetch(`${READER_API}/${id}`);
        if (!res.ok) throw new Error('获取读者信息失败');
        const reader = await res.json();

        document.getElementById('editReaderId').value = reader.id;
        document.getElementById('readerModalTitle').innerHTML = '<i class="bi bi-pencil-square me-2"></i>编辑读者';
        document.getElementById('readerName').value = reader.name || '';
        document.getElementById('readerNumber').value = reader.readerNumber || '';
        document.getElementById('readerGender').value = reader.gender || '';
        document.getElementById('readerPhone').value = reader.phone || '';
        document.getElementById('readerEmail').value = reader.email || '';
        document.getElementById('readerAddress').value = reader.address || '';
        document.getElementById('readerMaxBorrow').value = reader.maxBorrow || 5;
        document.getElementById('readerStatus').value = reader.status || 'active';

        readerModal.show();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function resetReaderForm() {
    document.getElementById('readerForm').reset();
    document.getElementById('editReaderId').value = '';
    document.getElementById('readerMaxBorrow').value = 5;
    document.getElementById('readerStatus').value = 'active';
}

async function saveReader() {
    const id = document.getElementById('editReaderId').value;
    const name = document.getElementById('readerName').value.trim();
    const readerNumber = document.getElementById('readerNumber').value.trim();

    if (!name) {
        showToast('请输入读者姓名', 'warning');
        return;
    }
    if (!readerNumber) {
        showToast('请输入读者编号', 'warning');
        return;
    }

    const readerData = {
        name: name,
        readerNumber: readerNumber,
        gender: document.getElementById('readerGender').value || null,
        phone: document.getElementById('readerPhone').value.trim() || null,
        email: document.getElementById('readerEmail').value.trim() || null,
        address: document.getElementById('readerAddress').value.trim() || null,
        maxBorrow: parseInt(document.getElementById('readerMaxBorrow').value) || 5,
        status: document.getElementById('readerStatus').value
    };

    const url = id ? `${READER_API}/${id}` : READER_API;
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(readerData)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '保存失败');
        }

        readerModal.hide();
        showToast(id ? '读者更新成功!' : '读者添加成功!', 'success');
        resetReaderForm();
        loadReaders();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== 查看详情 ====================

async function showReaderDetail(id) {
    try {
        const res = await fetch(`${READER_API}/${id}`);
        if (!res.ok) throw new Error('获取读者详情失败');
        const reader = await res.json();

        const statusText = reader.status === 'active' ? '正常' : '停用';
        const statusClass = reader.status === 'active' ? 'text-success' : 'text-danger';

        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <div class="text-center mb-4">
                <div style="font-size:3rem;color:var(--primary);"><i class="bi bi-person-circle"></i></div>
                <h5 class="mt-2 mb-1">${escapeHtml(reader.name)}</h5>
                <span class="badge-category">${reader.readerNumber}</span>
            </div>
            <table class="table table-borderless">
                <tr><td class="text-muted" width="80">性别</td><td>${reader.gender || '-'}</td></tr>
                <tr><td class="text-muted">电话</td><td>${reader.phone || '-'}</td></tr>
                <tr><td class="text-muted">邮箱</td><td>${reader.email || '-'}</td></tr>
                <tr><td class="text-muted">地址</td><td>${reader.address || '-'}</td></tr>
                <tr><td class="text-muted">最大借阅</td><td>${reader.maxBorrow || 5} 本</td></tr>
                <tr><td class="text-muted">当前借阅</td><td>${reader.currentBorrowCount || 0} 本</td></tr>
                <tr><td class="text-muted">状态</td><td class="${statusClass} fw-bold">${statusText}</td></tr>
                <tr><td class="text-muted">注册时间</td><td>${formatDate(reader.createdAt)}</td></tr>
            </table>
        `;
        detailModal.show();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== 删除读者 ====================

function showReaderDeleteConfirm(id, name) {
    deleteReaderTargetId = id;
    document.getElementById('deleteReaderName').textContent = name + '（编号: ' + id + '）';
    readerDeleteModal.show();
}

async function confirmDeleteReader() {
    if (!deleteReaderTargetId) return;
    try {
        const res = await fetch(`${READER_API}/${deleteReaderTargetId}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '删除失败');
        }
        readerDeleteModal.hide();
        showToast('读者已删除', 'success');
        loadReaders();
    } catch (err) {
        readerDeleteModal.hide();
        showToast(err.message, 'danger');
    } finally {
        deleteReaderTargetId = null;
    }
}
