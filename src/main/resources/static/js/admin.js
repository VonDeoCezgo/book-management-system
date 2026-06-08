// ==================== 数据库管理 ====================

const ADMIN_API = '/api/admin';

let adminRowModal, adminDeleteModal, adminSqlModal;
let currentTable = null;
let currentColumns = [];
let currentPkColumn = null;
let adminPage = 1;
let adminPageSize = 15;
let deleteTarget = null;

document.addEventListener('DOMContentLoaded', () => {
    // 初始化模态框
    adminRowModal = new bootstrap.Modal('#adminRowModal');
    adminDeleteModal = new bootstrap.Modal('#adminDeleteModal');

    // 确认删除
    const confirmBtn = document.getElementById('confirmAdminDeleteBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmAdminDelete);

    // 保存行
    const saveBtn = document.getElementById('saveAdminRowBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveAdminRow);

    // 执行 SQL
    const executeBtn = document.getElementById('executeSqlBtn');
    if (executeBtn) executeBtn.addEventListener('click', executeSql);

    // 仅管理员可见
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('navAdmin')?.classList.remove('d-none');
    }
});

// ==================== 加载管理面板 ====================

async function loadAdminPanel() {
    try {
        const res = await fetch(`${ADMIN_API}/tables`);
        if (!res.ok) throw new Error('加载失败');
        const tables = await res.json();

        renderAdminTableList(tables);
    } catch (err) {
        showToast('加载数据库表失败: ' + err.message, 'danger');
    }
}

function renderAdminTableList(tables) {
    const container = document.getElementById('adminTableList');
    container.innerHTML = tables.map(t => `
        <a class="admin-table-item ${t === currentTable ? 'active' : ''}"
           onclick="selectTable('${t}')">
            <i class="bi bi-table me-2"></i>${t}
        </a>
    `).join('');
}

async function selectTable(tableName) {
    currentTable = tableName;
    adminPage = 1;

    // 高亮
    document.querySelectorAll('.admin-table-item').forEach(el => {
        el.classList.toggle('active', el.textContent.trim() === tableName);
    });

    // 加载列信息和数据
    try {
        const [colsRes, dataRes] = await Promise.all([
            fetch(`${ADMIN_API}/tables/${tableName}/columns`),
            fetch(`${ADMIN_API}/tables/${tableName}/data?page=1&size=${adminPageSize}`)
        ]);

        if (!colsRes.ok) throw new Error('加载列失败');
        if (!dataRes.ok) throw new Error('加载数据失败');

        currentColumns = await colsRes.json();
        const data = await dataRes.json();

        // 找到主键
        currentPkColumn = null;
        for (const col of currentColumns) {
            if (col.primaryKey) {
                currentPkColumn = col.name;
                break;
            }
        }
        if (!currentPkColumn) {
            // 回退到 id 列
            const idCol = currentColumns.find(c => c.name.toLowerCase() === 'id');
            if (idCol) currentPkColumn = idCol.name;
        }

        // 显示数据区域，隐藏占位符
        document.getElementById('adminTableInfo').classList.remove('d-none');
        document.getElementById('adminTablePlaceholder').classList.add('d-none');

        document.getElementById('adminTableName').textContent = tableName;
        document.getElementById('adminColumnCount').textContent = currentColumns.length + ' 列';
        document.getElementById('adminTableDesc').textContent =
            '主键: ' + (currentPkColumn || '无') + ' | ' + currentColumns.length + ' 列';

        renderAdminDataTable(data);
        renderAdminPagination(data);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function renderAdminDataTable(data) {
    const thead = document.getElementById('adminTableHead');
    const tbody = document.getElementById('adminTableBody');
    const records = data.records || [];

    document.getElementById('adminRowCount').textContent = data.total || 0;

    // 表头
    thead.innerHTML = '<tr><th style="width:40px;">#</th>' +
        currentColumns.map(c => `<th>${c.name}<br><small class="text-muted">${c.typeName || ''}</small></th>`).join('') +
        '<th class="text-center" style="width:100px;">操作</th></tr>';

    // 表体
    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${currentColumns.length + 2}">
            <div class="empty-state"><div class="empty-icon"><i class="bi bi-inbox"></i></div>
            <p class="text-muted">暂无数据</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = records.map((row, i) => {
        const pkValue = currentPkColumn ? row[currentPkColumn] : null;
        return `<tr>
            <td>${(adminPage - 1) * adminPageSize + i + 1}</td>
            ${currentColumns.map(c => {
                let val = row[c.name];
                if (val === null) return '<td class="text-muted">NULL</td>';
                if (val === undefined) return '<td class="text-muted">-</td>';
                let display = String(val);
                if (display.length > 80) display = display.substring(0, 80) + '...';
                return `<td title="${escapeHtml(String(val))}">${escapeHtml(display)}</td>`;
            }).join('')}
            <td class="text-center">
                <button class="btn-action btn-edit" onclick="showEditAdminRow('${escapeHtml(String(pkValue))}')" title="编辑">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn-action btn-delete" onclick="showAdminDeleteConfirm('${escapeHtml(String(pkValue))}')" title="删除">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderAdminPagination(data) {
    const nav = document.getElementById('adminPagination');
    const total = data.total || 0;
    const totalPages = Math.ceil(total / adminPageSize);

    if (total <= adminPageSize) {
        nav.innerHTML = '';
        return;
    }

    let html = '<ul class="pagination pagination-sm mb-0">';
    html += `<li class="page-item ${adminPage <= 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goAdminPage(${adminPage - 1})">«</a></li>`;

    const start = Math.max(1, adminPage - 2);
    const end = Math.min(totalPages, adminPage + 2);

    if (start > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goAdminPage(1)">1</a></li>`;
        if (start > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    for (let p = start; p <= end; p++) {
        html += `<li class="page-item ${p === adminPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goAdminPage(${p})">${p}</a></li>`;
    }
    if (end < totalPages) {
        if (end < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goAdminPage(${totalPages})">${totalPages}</a></li>`;
    }
    html += `<li class="page-item ${adminPage >= totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goAdminPage(${adminPage + 1})">»</a></li>`;
    html += '</ul>';
    nav.innerHTML = html;
}

async function goAdminPage(page) {
    adminPage = page;
    if (!currentTable) return;
    try {
        const res = await fetch(`${ADMIN_API}/tables/${currentTable}/data?page=${page}&size=${adminPageSize}`);
        if (!res.ok) throw new Error('加载失败');
        const data = await res.json();
        renderAdminDataTable(data);
        renderAdminPagination(data);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== 添加行 ====================

function showAddAdminRow() {
    document.getElementById('adminRowModalTitle').textContent = '添加行 - ' + currentTable;
    document.getElementById('editAdminPkValue').value = '';

    const form = document.getElementById('adminRowForm');
    form.innerHTML = currentColumns
        .filter(c => !c.autoIncrement) // 自增列不显示
        .map(c => {
            const required = !c.nullable && !c.autoIncrement ? '<span class="text-danger">*</span>' : '';
            let input;
            if (c.typeName && c.typeName.toUpperCase().includes('TEXT')) {
                input = `<textarea class="form-control" id="admin_col_${c.name}" rows="2"></textarea>`;
            } else if (c.typeName && (c.typeName.toUpperCase().includes('DATE') || c.typeName.toUpperCase().includes('TIME'))) {
                input = `<input type="date" class="form-control" id="admin_col_${c.name}">`;
            } else {
                input = `<input type="text" class="form-control" id="admin_col_${c.name}">`;
            }
            return `<div class="col-md-6 mb-3">
                <label class="form-label">${c.name} ${required} <small class="text-muted">${c.typeName || ''}</small></label>
                ${input}
            </div>`;
        }).join('');

    adminRowModal.show();
}

// ==================== 编辑行 ====================

async function showEditAdminRow(pkValue) {
    if (!currentTable || !currentPkColumn) {
        showToast('无法确定主键列', 'warning');
        return;
    }

    document.getElementById('adminRowModalTitle').textContent = '编辑行 - ' + currentTable;
    document.getElementById('editAdminPkValue').value = pkValue;

    try {
        // 获取当前行数据
        const res = await fetch(`${ADMIN_API}/tables/${currentTable}/data?page=1&size=1000`);
        if (!res.ok) throw new Error('获取数据失败');
        const data = await res.json();
        const row = (data.records || []).find(r => String(r[currentPkColumn]) === pkValue);

        const form = document.getElementById('adminRowForm');
        form.innerHTML = currentColumns.map(c => {
            let val = row ? row[c.name] : '';
            if (val === null || val === undefined) val = '';
            const disabled = c.primaryKey ? 'disabled' : '';
            const note = c.primaryKey ? ' <small class="text-muted">(主键)</small>' : '';
            let input;
            if (c.typeName && c.typeName.toUpperCase().includes('TEXT')) {
                input = `<textarea class="form-control" id="admin_col_${c.name}" rows="2" ${disabled}>${escapeHtml(String(val))}</textarea>`;
            } else if (c.typeName && (c.typeName.toUpperCase().includes('DATE') || c.typeName.toUpperCase().includes('TIME'))) {
                input = `<input type="date" class="form-control" id="admin_col_${c.name}" value="${escapeHtml(String(val))}" ${disabled}>`;
            } else {
                input = `<input type="text" class="form-control" id="admin_col_${c.name}" value="${escapeHtml(String(val))}" ${disabled}>`;
            }
            return `<div class="col-md-6 mb-3">
                <label class="form-label">${c.name}${note} <small class="text-muted">${c.typeName || ''}</small></label>
                ${input}
            </div>`;
        }).join('');

        adminRowModal.show();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function saveAdminRow() {
    const pkValue = document.getElementById('editAdminPkValue').value;
    const isEdit = pkValue !== '';

    const rowData = {};
    for (const col of currentColumns) {
        if (isEdit && col.primaryKey) continue;
        if (col.autoIncrement) continue;
        const el = document.getElementById('admin_col_' + col.name);
        if (!el) continue;
        let val = el.value.trim();
        if (val === '') {
            if (!col.nullable && !col.autoIncrement) {
                showToast('字段 ' + col.name + ' 不能为空', 'warning');
                return;
            }
            rowData[col.name] = null;
        } else {
            rowData[col.name] = val;
        }
    }

    try {
        let res;
        if (isEdit) {
            res = await fetch(`${ADMIN_API}/tables/${currentTable}/data/${encodeURIComponent(pkValue)}?pkColumn=${encodeURIComponent(currentPkColumn)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rowData)
            });
        } else {
            res = await fetch(`${ADMIN_API}/tables/${currentTable}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rowData)
            });
        }

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '保存失败');
        }

        adminRowModal.hide();
        showToast(isEdit ? '更新成功!' : '添加成功!', 'success');
        selectTable(currentTable);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== 删除行 ====================

function showAdminDeleteConfirm(pkValue) {
    deleteTarget = pkValue;
    document.getElementById('deleteAdminInfo').textContent =
        '表: ' + currentTable + ' | ' + (currentPkColumn || 'id') + ' = ' + pkValue;
    adminDeleteModal.show();
}

async function confirmAdminDelete() {
    if (!deleteTarget || !currentTable || !currentPkColumn) return;
    try {
        const res = await fetch(
            `${ADMIN_API}/tables/${currentTable}/data/${encodeURIComponent(deleteTarget)}?pkColumn=${encodeURIComponent(currentPkColumn)}`,
            { method: 'DELETE' }
        );
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '删除失败');
        }
        adminDeleteModal.hide();
        showToast('删除成功!', 'success');
        selectTable(currentTable);
    } catch (err) {
        adminDeleteModal.hide();
        showToast(err.message, 'danger');
    } finally {
        deleteTarget = null;
    }
}

// ==================== SQL 控制台 ====================

async function executeSql() {
    const sql = document.getElementById('adminSqlInput').value.trim();
    if (!sql) {
        showToast('请输入 SQL 语句', 'warning');
        return;
    }

    const resultArea = document.getElementById('adminSqlResult');
    resultArea.innerHTML = '<div class="text-center py-4"><div class="spinner-border spinner-border-sm me-2"></div>执行中...</div>';

    try {
        const res = await fetch(`${ADMIN_API}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });

        if (!res.ok) {
            const err = await res.json();
            resultArea.innerHTML = `<div class="alert alert-danger m-3">
                <i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(err.error || '执行失败')}
            </div>`;
            return;
        }

        const data = await res.json();
        if (data.rows.length === 0) {
            resultArea.innerHTML = '<div class="text-muted text-center py-4">查询结果为空</div>';
            return;
        }

        const cols = data.columns || [];
        resultArea.innerHTML = `
            <div class="text-muted small mb-2 ms-2">共 ${data.total} 行</div>
            <div class="sql-result-table">
                <table class="table table-sm table-bordered mb-0">
                    <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${data.rows.map((row, i) => `<tr>
                            ${cols.map(c => {
                                let val = row[c];
                                if (val === null) return '<td class="text-muted fst-italic">NULL</td>';
                                return `<td>${escapeHtml(String(val))}</td>`;
                            }).join('')}
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (err) {
        resultArea.innerHTML = `<div class="alert alert-danger m-3">${escapeHtml(err.message)}</div>`;
    }
}
