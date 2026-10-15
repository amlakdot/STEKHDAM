/**
 * پنل مدیریت — admin.html
 * فقط کاربران احراز هویت‌شده با نقش ادمین به داده‌ها دسترسی دارند (RLS).
 */
(function () {
  'use strict';

  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const loginForm = document.getElementById('login-form');
  const loginAlert = document.getElementById('login-alert');
  const logoutBtn = document.getElementById('logout-btn');
  const adminEmailEl = document.getElementById('admin-email');

  const statsTotal = document.getElementById('stat-total');
  const statsNew = document.getElementById('stat-new');
  const statsInterview = document.getElementById('stat-interview');
  const statsAccepted = document.getElementById('stat-accepted');

  const tableBody = document.getElementById('apps-tbody');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');
  const paginationEl = document.getElementById('pagination');

  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  const filterExp = document.getElementById('filter-experience');
  const exportBtn = document.getElementById('export-csv');

  const modalOverlay = document.getElementById('detail-modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');
  const modalClose = document.getElementById('modal-close');

  let currentPage = 1;
  const PAGE_SIZE = 15;
  let totalCount = 0;
  let currentUser = null;
  let debounceTimer = null;

  const STATUS_LABELS = (window.DOT_CONFIG && window.DOT_CONFIG.STATUSES) || {
    new: 'جدید',
    reviewing: 'در حال بررسی',
    contacted: 'تماس گرفته‌شده',
    interview: 'دعوت به مصاحبه',
    accepted: 'پذیرفته‌شده',
    rejected: 'رد شده',
  };

  const EXP_LABELS = {
    more_than_3: 'بیش از ۳ سال',
    '1_to_3': '۱ تا ۳ سال',
    less_than_1: 'کمتر از ۱ سال',
    none: 'بدون سابقه',
  };

  const RENTAL_LABELS = {
    independent: 'انجام مستقل معامله',
    assist: 'همکاری و پیگیری مشتری',
    limited: 'تجربه محدود',
    none: 'بدون تجربه عملی',
  };

  // --- Session ---
  async function init() {
    if (!window.dotSupabase) {
      showLoginError('تنظیمات اتصال بارگذاری نشده است.');
      return;
    }

    const { data: { session } } = await window.dotSupabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      // بررسی نقش ادمین
      const isAdmin = await checkIsAdmin();
      if (isAdmin) {
        showDashboard();
        await loadDashboard();
      } else {
        await window.dotSupabase.auth.signOut();
        showLoginError('حساب شما دسترسی مدیریتی ندارد.');
      }
    } else {
      showLogin();
    }

    window.dotSupabase.auth.onAuthStateChange(async function (event, session) {
      if (event === 'SIGNED_OUT' || !session) {
        currentUser = null;
        showLogin();
      }
    });
  }

  async function checkIsAdmin() {
    // RLS روی جدول admin_users فقط به خود کاربر اجازه SELECT می‌دهد
    try {
      const { data, error } = await window.dotSupabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (error) {
        console.error('[DOT] Admin check error:', error.message);
        return false;
      }
      return !!data;
    } catch (e) {
      return false;
    }
  }

  function showLogin() {
    if (loginSection) loginSection.classList.remove('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');
  }

  function showDashboard() {
    if (loginSection) loginSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
    if (adminEmailEl && currentUser) {
      adminEmailEl.textContent = currentUser.email || '';
    }
  }

  function showLoginError(msg) {
    if (loginAlert) {
      loginAlert.textContent = msg;
      loginAlert.className = 'alert show alert-error';
    }
  }

  // --- Login ---
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      if (!email || !password) {
        showLoginError('ایمیل و رمز عبور را وارد کنید.');
        return;
      }

      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner"></span> ورود...';

      try {
        const { data, error } = await window.dotSupabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          showLoginError('ایمیل یا رمز عبور نادرست است.');
          btn.disabled = false;
          btn.textContent = 'ورود';
          return;
        }

        currentUser = data.user;
        const isAdmin = await checkIsAdmin();
        if (!isAdmin) {
          await window.dotSupabase.auth.signOut();
          currentUser = null;
          showLoginError('حساب شما دسترسی مدیریتی ندارد.');
          btn.disabled = false;
          btn.textContent = 'ورود';
          return;
        }

        showDashboard();
        await loadDashboard();
      } catch (err) {
        showLoginError('خطا در ارتباط با سرور. دوباره تلاش کنید.');
        btn.disabled = false;
        btn.textContent = 'ورود';
      }
    });
  }

  // --- Logout ---
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      await window.dotSupabase.auth.signOut();
      currentUser = null;
      showLogin();
    });
  }

  // --- Load data ---
  async function loadDashboard() {
    await Promise.all([loadStats(), loadApplications()]);
  }

  async function loadStats() {
    try {
      const { count: total } = await window.dotSupabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      const { count: newCount } = await window.dotSupabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');

      const { count: interviewCount } = await window.dotSupabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'interview');

      const { count: acceptedCount } = await window.dotSupabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted');

      if (statsTotal) statsTotal.textContent = total ?? 0;
      if (statsNew) statsNew.textContent = newCount ?? 0;
      if (statsInterview) statsInterview.textContent = interviewCount ?? 0;
      if (statsAccepted) statsAccepted.textContent = acceptedCount ?? 0;
    } catch (e) {
      console.error('[DOT] Stats error:', e);
    }
  }

  async function loadApplications() {
    if (loadingState) loadingState.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    if (tableBody) tableBody.innerHTML = '';

    try {
      let query = window.dotSupabase
        .from('applications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      const status = filterStatus ? filterStatus.value : '';
      const exp = filterExp ? filterExp.value : '';
      const search = searchInput ? searchInput.value.trim() : '';

      if (status) query = query.eq('status', status);
      if (exp) query = query.eq('real_estate_experience', exp);
      if (search) {
        // جستجو روی نام یا شماره
        query = query.or('full_name.ilike.%' + search + '%,phone.ilike.%' + search + '%');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      totalCount = count || 0;

      if (loadingState) loadingState.classList.add('hidden');

      if (!data || data.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        renderPagination();
        return;
      }

      data.forEach(function (row) {
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(row.full_name) + '</td>' +
          '<td dir="ltr">' + escapeHtml(row.phone) + '</td>' +
          '<td>' + escapeHtml(row.residence_area || '—') + '</td>' +
          '<td>' + (EXP_LABELS[row.real_estate_experience] || row.real_estate_experience || '—') + '</td>' +
          '<td><span class="status-badge status-' + escapeHtml(row.status) + '">' +
            (STATUS_LABELS[row.status] || row.status) + '</span></td>' +
          '<td>' + formatDate(row.created_at) + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-outline view-btn" data-id="' + row.id + '">جزئیات</button></td>';
        tableBody.appendChild(tr);
      });

      tableBody.querySelectorAll('.view-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openDetail(btn.getAttribute('data-id'));
        });
      });

      renderPagination();
    } catch (e) {
      console.error('[DOT] Load apps error:', e);
      if (loadingState) loadingState.classList.add('hidden');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">خطا در بارگذاری داده‌ها. صفحه را رفرش کنید.</td></tr>';
      }
    }
  }

  function renderPagination() {
    if (!paginationEl) return;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
    paginationEl.innerHTML = '';

    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.className = 'btn btn-sm btn-outline';
    prev.textContent = 'قبلی';
    prev.disabled = currentPage <= 1;
    prev.addEventListener('click', function () {
      if (currentPage > 1) {
        currentPage--;
        loadApplications();
      }
    });
    paginationEl.appendChild(prev);

    const info = document.createElement('span');
    info.className = 'text-sm text-muted';
    info.textContent = 'صفحه ' + currentPage + ' از ' + totalPages + ' (' + totalCount + ' مورد)';
    paginationEl.appendChild(info);

    const next = document.createElement('button');
    next.className = 'btn btn-sm btn-outline';
    next.textContent = 'بعدی';
    next.disabled = currentPage >= totalPages;
    next.addEventListener('click', function () {
      if (currentPage < totalPages) {
        currentPage++;
        loadApplications();
      }
    });
    paginationEl.appendChild(next);
  }

  // --- Filters ---
  function onFilterChange() {
    currentPage = 1;
    loadApplications();
  }

  if (filterStatus) filterStatus.addEventListener('change', onFilterChange);
  if (filterExp) filterExp.addEventListener('change', onFilterChange);
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onFilterChange, 350);
    });
  }

  // --- Detail Modal ---
  async function openDetail(id) {
    if (!modalOverlay || !modalBody) return;
    modalBody.innerHTML = '<div class="loading-overlay"><span class="loading-spinner"></span> در حال بارگذاری...</div>';
    modalOverlay.classList.add('show');
    if (modalTitle) modalTitle.textContent = 'جزئیات درخواست';

    try {
      const { data, error } = await window.dotSupabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      renderDetail(data);
    } catch (e) {
      modalBody.innerHTML = '<p class="text-muted">خطا در بارگذاری جزئیات.</p>';
    }
  }

  function renderDetail(app) {
    if (modalTitle) modalTitle.textContent = app.full_name;

    const rows = [
      ['کد پیگیری', '<span dir="ltr" class="fw-bold">' + escapeHtml(app.tracking_code) + '</span>'],
      ['نام', escapeHtml(app.full_name)],
      ['موبایل', '<span dir="ltr">' + escapeHtml(app.phone) + '</span> <button type="button" class="btn btn-sm btn-ghost copy-phone" data-phone="' + escapeHtml(app.phone) + '">کپی</button>'],
      ['محدوده سکونت', escapeHtml(app.residence_area || '—')],
      ['سن', app.age != null ? app.age : '—'],
      ['سابقه املاک', EXP_LABELS[app.real_estate_experience] || app.real_estate_experience || '—'],
      ['مدت سابقه', escapeHtml(app.experience_duration || '—')],
      ['تجربه رهن و اجاره', RENTAL_LABELS[app.rental_experience] || app.rental_experience || '—'],
      ['آشنایی با دیوار', escapeHtml(app.divar_experience || '—')],
      ['تجربه مذاکره', escapeHtml(app.negotiation_experience || '—')],
      ['وضعیت اشتغال', escapeHtml(app.employment_status || '—')],
      ['حضور صبح', escapeHtml(app.morning_availability || '—')],
      ['فعالیت عصر', escapeHtml(app.evening_availability || '—')],
      ['پنجشنبه و جمعه', escapeHtml(app.holiday_availability || '—')],
      ['آمادگی شروع', escapeHtml(app.start_availability || '—')],
      ['انگیزه', '<div style="white-space:pre-wrap">' + escapeHtml(app.motivation || '—') + '</div>'],
      ['مهارت کلیدی', '<div style="white-space:pre-wrap">' + escapeHtml(app.key_skill_answer || '—') + '</div>'],
      ['درباره خود', '<div style="white-space:pre-wrap">' + escapeHtml(app.about_applicant || '—') + '</div>'],
      ['تاریخ ثبت', formatDate(app.created_at, true)],
    ];

    let html = '';
    rows.forEach(function (r) {
      html += '<div class="detail-row"><span class="detail-label">' + r[0] + '</span><span class="detail-value">' + r[1] + '</span></div>';
    });

    // Admin controls
    html += '<div class="form-section" style="margin-top:1.5rem;border-top:1px solid var(--color-gray-200);padding-top:1.5rem">';
    html += '<div class="form-section-title">مدیریت درخواست</div>';

    html += '<div class="form-group"><label>وضعیت</label><select id="detail-status" class="form-control">';
    Object.keys(STATUS_LABELS).forEach(function (k) {
      html += '<option value="' + k + '"' + (app.status === k ? ' selected' : '') + '>' + STATUS_LABELS[k] + '</option>';
    });
    html += '</select></div>';

    html += '<div class="form-group"><label>یادداشت خصوصی مدیر</label><textarea id="detail-notes" class="form-control" rows="3">' + escapeHtml(app.admin_notes || '') + '</textarea></div>';

    html += '<div class="form-group"><label>تاریخ و ساعت مصاحبه</label><input type="datetime-local" id="detail-interview" class="form-control" value="' + (app.interview_at ? toLocalDatetime(app.interview_at) : '') + '"></div>';

    html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem">';
    html += '<button type="button" class="btn btn-primary" id="save-detail">ذخیره تغییرات</button>';
    html += '<button type="button" class="btn btn-danger btn-sm" id="delete-app">حذف درخواست</button>';
    html += '</div></div>';

    modalBody.innerHTML = html;

    // Copy phone
    modalBody.querySelectorAll('.copy-phone').forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(btn.getAttribute('data-phone')).then(function () {
          btn.textContent = 'کپی شد';
          setTimeout(function () { btn.textContent = 'کپی'; }, 1500);
        });
      });
    });

    document.getElementById('save-detail').addEventListener('click', function () {
      saveDetail(app.id);
    });

    document.getElementById('delete-app').addEventListener('click', function () {
      if (confirm('آیا از حذف این درخواست مطمئن هستید؟ این عمل قابل بازگشت نیست.')) {
        deleteApp(app.id);
      }
    });
  }

  async function saveDetail(id) {
    const status = document.getElementById('detail-status').value;
    const notes = document.getElementById('detail-notes').value;
    const interviewVal = document.getElementById('detail-interview').value;

    const updates = {
      status: status,
      admin_notes: notes || null,
      interview_at: interviewVal ? new Date(interviewVal).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await window.dotSupabase
        .from('applications')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      closeModal();
      await loadDashboard();
    } catch (e) {
      alert('ذخیره تغییرات با خطا مواجه شد.');
      console.error(e);
    }
  }

  async function deleteApp(id) {
    try {
      const { error } = await window.dotSupabase
        .from('applications')
        .delete()
        .eq('id', id);
      if (error) throw error;
      closeModal();
      await loadDashboard();
    } catch (e) {
      alert('حذف با خطا مواجه شد.');
    }
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('show');
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // --- CSV Export ---
  if (exportBtn) {
    exportBtn.addEventListener('click', async function () {
      try {
        const { data, error } = await window.dotSupabase
          .from('applications')
          .select('tracking_code,full_name,phone,residence_area,real_estate_experience,rental_experience,status,created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || !data.length) {
          alert('داده‌ای برای خروجی وجود ندارد.');
          return;
        }

        const headers = ['کد پیگیری', 'نام', 'موبایل', 'محدوده', 'سابقه', 'تجربه رهن', 'وضعیت', 'تاریخ ثبت'];
        const rows = data.map(function (r) {
          return [
            csvSafe(r.tracking_code),
            csvSafe(r.full_name),
            csvSafe(r.phone),
            csvSafe(r.residence_area),
            csvSafe(EXP_LABELS[r.real_estate_experience] || r.real_estate_experience),
            csvSafe(RENTAL_LABELS[r.rental_experience] || r.rental_experience),
            csvSafe(STATUS_LABELS[r.status] || r.status),
            csvSafe(formatDate(r.created_at, true)),
          ].join(',');
        });

        // BOM for Excel UTF-8
        const bom = '\uFEFF';
        const csv = bom + headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'applications-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('خروجی CSV با خطا مواجه شد.');
        console.error(e);
      }
    });
  }

  // --- Helpers ---
  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function csvSafe(val) {
    if (val == null) return '';
    let s = String(val);
    // جلوگیری از CSV Injection
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function formatDate(iso, withTime) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      // نمایش تقریبی شمسی با Intl اگر پشتیبانی شود
      const opts = withTime
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', calendar: 'persian', numberingSystem: 'latn' }
        : { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'persian', numberingSystem: 'latn' };
      return new Intl.DateTimeFormat('fa-IR', opts).format(d);
    } catch (e) {
      return iso.slice(0, 10);
    }
  }

  function toLocalDatetime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // Start
  init();
})();
