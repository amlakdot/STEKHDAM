/**
 * پنل مدیریت — داده از Supabase
 */
(function () {
  'use strict';

  var loginSection = document.getElementById('login-section');
  var dashboardSection = document.getElementById('dashboard-section');
  var loginForm = document.getElementById('login-form');
  var loginAlert = document.getElementById('login-alert');
  var logoutBtn = document.getElementById('logout-btn');

  var statsTotal = document.getElementById('stat-total');
  var statsNew = document.getElementById('stat-new');
  var statsInterview = document.getElementById('stat-interview');
  var statsAccepted = document.getElementById('stat-accepted');

  var tableBody = document.getElementById('apps-tbody');
  var emptyState = document.getElementById('empty-state');
  var loadingState = document.getElementById('loading-state');
  var paginationEl = document.getElementById('pagination');

  var searchInput = document.getElementById('search-input');
  var filterStatus = document.getElementById('filter-status');
  var filterExp = document.getElementById('filter-experience');
  var exportBtn = document.getElementById('export-csv');

  var modalOverlay = document.getElementById('detail-modal');
  var modalBody = document.getElementById('modal-body');
  var modalTitle = document.getElementById('modal-title');
  var modalClose = document.getElementById('modal-close');

  var currentPage = 1;
  var PAGE_SIZE = 15;
  var debounceTimer = null;
  var appsCache = [];

  var AUTH_KEY = (window.DOT_CONFIG && window.DOT_CONFIG.AUTH_KEY) || 'dot_adm_ok';

  var STATUS_LABELS = (window.DOT_CONFIG && window.DOT_CONFIG.STATUSES) || {
    new: 'جدید',
    reviewing: 'در حال بررسی',
    contacted: 'تماس گرفته‌شده',
    interview: 'دعوت به مصاحبه',
    accepted: 'پذیرفته‌شده',
    rejected: 'رد شده',
  };

  var EXP_LABELS = {
    more_than_3: 'بیش از ۳ سال',
    '1_to_3': '۱ تا ۳ سال',
    less_than_1: 'کمتر از ۱ سال',
    none: 'بدون سابقه',
  };

  var RENTAL_LABELS = {
    independent: 'انجام مستقل معامله',
    assist: 'همکاری و پیگیری مشتری',
    limited: 'تجربه محدود',
    none: 'بدون تجربه عملی',
  };

  /* ---- دسترسی (پراکنده در کد) ---- */
  function _k() {
    var a = String.fromCharCode(48, 52);
    var b = [48, 52].map(function (n) { return String.fromCharCode(n); }).join('');
    return a + b;
  }

  function isAuthed() {
    try {
      return sessionStorage.getItem(AUTH_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setAuthed(ok) {
    try {
      if (ok) sessionStorage.setItem(AUTH_KEY, '1');
      else sessionStorage.removeItem(AUTH_KEY);
    } catch (e) {}
  }

  function showLogin() {
    if (loginSection) loginSection.classList.remove('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');
  }

  function showDashboard() {
    if (loginSection) loginSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
  }

  function showLoginError(msg) {
    if (loginAlert) {
      loginAlert.textContent = msg;
      loginAlert.className = 'alert show alert-error';
    }
  }

  function fetchApps(callback) {
    if (!window.dotSupabase) {
      console.error('[DOT] Supabase آماده نیست');
      appsCache = [];
      if (callback) callback([]);
      return;
    }
    if (loadingState) loadingState.classList.remove('hidden');
    window.dotSupabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (loadingState) loadingState.classList.add('hidden');
        if (res.error) {
          console.error('[DOT] fetch error', res.error);
          appsCache = [];
        } else {
          appsCache = res.data || [];
        }
        if (callback) callback(appsCache);
      })
      .catch(function (err) {
        if (loadingState) loadingState.classList.add('hidden');
        console.error('[DOT] fetch exception', err);
        appsCache = [];
        if (callback) callback([]);
      });
  }

  function loadApps() {
    return appsCache;
  }

  /* ---- ورود ---- */
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var pwdInput = loginForm.querySelector('[name="password"]') || document.getElementById('password');
      var pwd = pwdInput ? pwdInput.value : '';

      // مقایسه با مقدار بازسازی‌شده
      var ok = false;
      try {
        ok = (pwd === _k());
      } catch (err) {
        ok = false;
      }

      if (!ok) {
        showLoginError('رمز عبور نادرست است.');
        return;
      }

      setAuthed(true);
      showDashboard();
      loadDashboard();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      setAuthed(false);
      showLogin();
    });
  }

  /* ---- داشبورد ---- */
  function loadDashboard() {
    fetchApps(function () {
      loadStats();
      loadApplications();
    });
  }

  function loadStats() {
    var list = loadApps();
    var total = list.length;
    var nNew = 0, nInt = 0, nAcc = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].status === 'new') nNew++;
      if (list[i].status === 'interview') nInt++;
      if (list[i].status === 'accepted') nAcc++;
    }
    if (statsTotal) statsTotal.textContent = total;
    if (statsNew) statsNew.textContent = nNew;
    if (statsInterview) statsInterview.textContent = nInt;
    if (statsAccepted) statsAccepted.textContent = nAcc;
  }

  function getFiltered() {
    var list = loadApps();
    var status = filterStatus ? filterStatus.value : '';
    var exp = filterExp ? filterExp.value : '';
    var search = searchInput ? searchInput.value.trim() : '';

    return list.filter(function (row) {
      if (status && row.status !== status) return false;
      if (exp && row.real_estate_experience !== exp) return false;
      if (search) {
        var s = search.toLowerCase();
        var name = (row.full_name || '').toLowerCase();
        var phone = (row.phone || '');
        if (name.indexOf(s) === -1 && phone.indexOf(search) === -1) return false;
      }
      return true;
    });
  }

  function loadApplications() {
    if (loadingState) loadingState.classList.add('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    if (tableBody) tableBody.innerHTML = '';

    var filtered = getFiltered();
    var totalCount = filtered.length;
    var start = (currentPage - 1) * PAGE_SIZE;
    var pageData = filtered.slice(start, start + PAGE_SIZE);

    if (!pageData.length) {
      if (emptyState) emptyState.classList.remove('hidden');
      renderPagination(totalCount);
      return;
    }

    pageData.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(row.full_name) + '</td>' +
        '<td dir="ltr">' + escapeHtml(row.phone) + '</td>' +
        '<td>' + escapeHtml(row.residence_area || '—') + '</td>' +
        '<td>' + (EXP_LABELS[row.real_estate_experience] || row.real_estate_experience || '—') + '</td>' +
        '<td><span class="status-badge status-' + escapeHtml(row.status) + '">' +
          (STATUS_LABELS[row.status] || row.status) + '</span></td>' +
        '<td>' + formatDate(row.created_at) + '</td>' +
        '<td><button type="button" class="btn btn-sm btn-outline view-btn" data-id="' + escapeHtml(row.id) + '">جزئیات</button></td>';
      tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDetail(btn.getAttribute('data-id'));
      });
    });

    renderPagination(totalCount);
  }

  function renderPagination(totalCount) {
    if (!paginationEl) return;
    var totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
    paginationEl.innerHTML = '';
    if (totalPages <= 1) return;

    var prev = document.createElement('button');
    prev.className = 'btn btn-sm btn-outline';
    prev.textContent = 'قبلی';
    prev.disabled = currentPage <= 1;
    prev.addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; loadApplications(); }
    });
    paginationEl.appendChild(prev);

    var info = document.createElement('span');
    info.className = 'text-sm text-muted';
    info.textContent = 'صفحه ' + currentPage + ' از ' + totalPages + ' (' + totalCount + ' مورد)';
    paginationEl.appendChild(info);

    var next = document.createElement('button');
    next.className = 'btn btn-sm btn-outline';
    next.textContent = 'بعدی';
    next.disabled = currentPage >= totalPages;
    next.addEventListener('click', function () {
      if (currentPage < totalPages) { currentPage++; loadApplications(); }
    });
    paginationEl.appendChild(next);
  }

  function onFilterChange() {
    currentPage = 1;
    loadApplications();
  }

  if (filterStatus) filterStatus.addEventListener('change', onFilterChange);
  if (filterExp) filterExp.addEventListener('change', onFilterChange);
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onFilterChange, 300);
    });
  }

  /* ---- جزئیات ---- */
  function openDetail(id) {
    if (!modalOverlay || !modalBody) return;
    var list = loadApps();
    var app = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { app = list[i]; break; }
    }
    if (!app) {
      modalBody.innerHTML = '<p class="text-muted">درخواست یافت نشد.</p>';
      modalOverlay.classList.add('show');
      return;
    }
    renderDetail(app);
    modalOverlay.classList.add('show');
  }

  function renderDetail(app) {
    if (modalTitle) modalTitle.textContent = app.full_name;

    var vehicleLabel = '—';
    if (app.has_vehicle === 'ندارم') {
      vehicleLabel = 'ندارم';
    } else if (app.has_vehicle === 'دارم') {
      vehicleLabel = app.vehicle_type ? ('دارم — ' + app.vehicle_type) : 'دارم';
    }

    var rows = [
      ['کد پیگیری', '<span dir="ltr" class="fw-bold">' + escapeHtml(app.tracking_code) + '</span>'],
      ['نام', escapeHtml(app.full_name)],
      ['موبایل', '<span dir="ltr">' + escapeHtml(app.phone) + '</span> <button type="button" class="btn btn-sm btn-ghost copy-phone" data-phone="' + escapeHtml(app.phone) + '">کپی</button>'],
      ['سن', app.age != null ? app.age : '—'],
      ['جنسیت', escapeHtml(app.gender || '—')],
      ['محدوده سکونت', escapeHtml(app.residence_area || '—')],
      ['وسیله نقلیه', escapeHtml(vehicleLabel)],
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

    var html = '';
    rows.forEach(function (r) {
      html += '<div class="detail-row"><span class="detail-label">' + r[0] + '</span><span class="detail-value">' + r[1] + '</span></div>';
    });

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
      if (confirm('آیا از حذف این درخواست مطمئن هستید؟')) {
        deleteApp(app.id);
      }
    });
  }

  function saveDetail(id) {
    if (!window.dotSupabase) return;
    var status = document.getElementById('detail-status').value;
    var notes = document.getElementById('detail-notes').value || null;
    var iv = document.getElementById('detail-interview').value;
    var interviewAt = iv ? new Date(iv).toISOString() : null;
    var updatedAt = new Date().toISOString();

    window.dotSupabase
      .from('applications')
      .update({
        status: status,
        admin_notes: notes,
        interview_at: interviewAt,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .then(function (res) {
        if (res.error) {
          alert('ذخیره تغییرات ناموفق بود: ' + res.error.message);
          return;
        }
        closeModal();
        loadDashboard();
      })
      .catch(function (err) {
        alert('ذخیره تغییرات ناموفق بود.');
        console.error(err);
      });
  }

  function deleteApp(id) {
    if (!window.dotSupabase) return;
    window.dotSupabase
      .from('applications')
      .delete()
      .eq('id', id)
      .then(function (res) {
        if (res.error) {
          alert('حذف ناموفق بود: ' + res.error.message);
          return;
        }
        closeModal();
        loadDashboard();
      })
      .catch(function (err) {
        alert('حذف ناموفق بود.');
        console.error(err);
      });
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

  /* ---- CSV ---- */
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var data = getFiltered();
      if (!data.length) {
        alert('داده‌ای برای خروجی وجود ندارد.');
        return;
      }
      var headers = ['کد پیگیری', 'نام', 'موبایل', 'سن', 'جنسیت', 'محدوده', 'وسیله نقلیه', 'سابقه', 'تجربه رهن', 'وضعیت', 'تاریخ ثبت'];
      var rows = data.map(function (r) {
        var vehicleCsv = '—';
        if (r.has_vehicle === 'ندارم') vehicleCsv = 'ندارم';
        else if (r.has_vehicle === 'دارم') vehicleCsv = r.vehicle_type ? ('دارم — ' + r.vehicle_type) : 'دارم';
        return [
          csvSafe(r.tracking_code),
          csvSafe(r.full_name),
          csvSafe(r.phone),
          csvSafe(r.age != null ? r.age : ''),
          csvSafe(r.gender),
          csvSafe(r.residence_area),
          csvSafe(vehicleCsv),
          csvSafe(EXP_LABELS[r.real_estate_experience] || r.real_estate_experience),
          csvSafe(RENTAL_LABELS[r.rental_experience] || r.rental_experience),
          csvSafe(STATUS_LABELS[r.status] || r.status),
          csvSafe(formatDate(r.created_at, true)),
        ].join(',');
      });
      var bom = '\uFEFF';
      var csv = bom + headers.join(',') + '\n' + rows.join('\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'applications-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function escapeHtml(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function csvSafe(val) {
    if (val == null) return '';
    var s = String(val);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function formatDate(iso, withTime) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var opts = withTime
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', calendar: 'persian', numberingSystem: 'latn' }
        : { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'persian', numberingSystem: 'latn' };
      return new Intl.DateTimeFormat('fa-IR', opts).format(d);
    } catch (e) {
      return String(iso).slice(0, 10);
    }
  }

  function toLocalDatetime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* شروع */
  if (isAuthed()) {
    showDashboard();
    loadDashboard();
  } else {
    showLogin();
  }
})();
