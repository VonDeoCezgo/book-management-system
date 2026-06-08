document.addEventListener('DOMContentLoaded', () => {
    // 密码显示/隐藏切换
    document.querySelectorAll('.toggle-password').forEach(el => {
        el.addEventListener('click', () => {
            const target = document.getElementById(el.dataset.target);
            const icon = el.querySelector('i');
            if (target.type === 'password') {
                target.type = 'text';
                icon.className = 'bi bi-eye-slash';
            } else {
                target.type = 'password';
                icon.className = 'bi bi-eye';
            }
        });
    });

    // 登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 注册表单
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // 如果已登录，跳转到主页
    if (sessionStorage.getItem('currentUser')) {
        const currentPage = window.location.pathname;
        if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
            window.location.href = '/';
        }
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showAuthAlert('loginAlert', '请输入用户名和密码');
        return;
    }

    const btn = document.getElementById('loginBtn');
    setBtnLoading(btn, true);

    try {
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showAuthAlert('loginAlert', data.error || '登录失败');
            setBtnLoading(btn, false);
            return;
        }

        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        window.location.href = '/';
    } catch (err) {
        showAuthAlert('loginAlert', '网络错误，请稍后重试');
        setBtnLoading(btn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();

    // 验证
    if (!username || !password || !confirmPassword) {
        showAuthAlert('registerAlert', '请填写所有必填字段');
        return;
    }
    if (username.length < 3) {
        showAuthAlert('registerAlert', '用户名至少3个字符');
        return;
    }
    if (password.length < 6) {
        showAuthAlert('registerAlert', '密码长度不能少于6位');
        return;
    }
    if (password !== confirmPassword) {
        showAuthAlert('registerAlert', '两次密码输入不一致');
        return;
    }

    const btn = document.getElementById('registerBtn');
    setBtnLoading(btn, true);

    try {
        const res = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email, phone })
        });

        const data = await res.json();

        if (!res.ok) {
            showAuthAlert('registerAlert', data.error || '注册失败');
            setBtnLoading(btn, false);
            return;
        }

        showAuthAlert('registerAlert', '注册成功！即将跳转到登录页...', 'success');
        setTimeout(() => window.location.href = '/login.html', 1500);
    } catch (err) {
        showAuthAlert('registerAlert', '网络错误，请稍后重试');
        setBtnLoading(btn, false);
    }
}

function showAuthAlert(alertId, message, type) {
    const alert = document.getElementById(alertId);
    if (!alert) return;
    alert.textContent = message;
    alert.className = type === 'success'
        ? 'alert alert-success'
        : 'alert alert-danger';
    alert.classList.remove('d-none');
}

function setBtnLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.origHtml = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>处理中...';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.origHtml;
    }
}
