/**
 * منطق فرم استخدام — ذخیره فقط در مرورگر (localStorage)
 */
(function () {
  'use strict';

  var form = document.getElementById('apply-form');
  var submitBtn = document.getElementById('submit-btn');
  var alertBox = document.getElementById('form-alert');
  var successPanel = document.getElementById('success-panel');
  var formCard = document.getElementById('form-card');
  var trackingEl = document.getElementById('tracking-code');

  if (!form) return;

  var STORAGE_KEY = (window.DOT_CONFIG && window.DOT_CONFIG.STORAGE_KEY) || 'dot_apps_v1';

  function isValidIranianMobile(phone) {
    var cleaned = phone.replace(/[\s\-]/g, '');
    return /^(?:0|98|\+98|0098)?9\d{9}$/.test(cleaned);
  }

  function normalizePhone(phone) {
    var p = phone.replace(/[\s\-]/g, '');
    if (p.indexOf('+98') === 0) p = '0' + p.slice(3);
    else if (p.indexOf('0098') === 0) p = '0' + p.slice(4);
    else if (p.indexOf('98') === 0 && p.length === 12) p = '0' + p.slice(2);
    return p;
  }

  function generateTrackingCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'DOT-';
    for (var i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function showAlert(message, type) {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = 'alert show alert-' + (type || 'error');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    if (alertBox) alertBox.className = 'alert';
  }

  function setFieldError(el, msg) {
    var group = el.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    var err = group.querySelector('.form-error');
    if (err) err.textContent = msg || 'این فیلد الزامی است.';
    el.classList.add('is-invalid');
  }

  function clearFieldError(el) {
    var group = el.closest('.form-group');
    if (!group) return;
    group.classList.remove('has-error');
    el.classList.remove('is-invalid');
  }

  function validateForm() {
    var valid = true;
    hideAlert();
    form.querySelectorAll('.is-invalid').forEach(function (el) {
      clearFieldError(el);
    });

    if (!form.full_name.value.trim() || form.full_name.value.trim().length < 3) {
      setFieldError(form.full_name, 'نام و نام خانوادگی حداقل ۳ کاراکتر باشد.');
      valid = false;
    }

    var phone = form.phone.value.trim();
    if (!phone) {
      setFieldError(form.phone, 'شماره موبایل الزامی است.');
      valid = false;
    } else if (!isValidIranianMobile(phone)) {
      setFieldError(form.phone, 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).');
      valid = false;
    }

    if (!form.residence_area.value.trim()) {
      setFieldError(form.residence_area, 'شهر و محدوده سکونت الزامی است.');
      valid = false;
    }

    if (!form.real_estate_experience.value) {
      setFieldError(form.real_estate_experience, 'وضعیت سابقه را انتخاب کنید.');
      valid = false;
    }

    if (!form.rental_experience.value) {
      setFieldError(form.rental_experience, 'سطح تجربه رهن و اجاره را انتخاب کنید.');
      valid = false;
    }

    if (!form.morning_availability.value) {
      setFieldError(form.morning_availability, 'امکان حضور صبح را مشخص کنید.');
      valid = false;
    }

    if (!form.motivation.value.trim() || form.motivation.value.trim().length < 10) {
      setFieldError(form.motivation, 'لطفاً حداقل چند جمله بنویسید.');
      valid = false;
    }

    if (!form.key_skill_answer.value.trim() || form.key_skill_answer.value.trim().length < 5) {
      setFieldError(form.key_skill_answer, 'این فیلد الزامی است.');
      valid = false;
    }

    if (!form.consent.checked) {
      showAlert('برای ارسال درخواست باید تأیید نهایی را بپذیرید.', 'error');
      valid = false;
    }

    if (form.website && form.website.value) {
      return { valid: false, isBot: true };
    }

    return { valid: valid, isBot: false };
  }

  function collectData() {
    return {
      id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      tracking_code: generateTrackingCode(),
      full_name: form.full_name.value.trim(),
      phone: normalizePhone(form.phone.value.trim()),
      residence_area: form.residence_area.value.trim(),
      age: form.age.value ? parseInt(form.age.value, 10) : null,
      real_estate_experience: form.real_estate_experience.value,
      experience_duration: form.experience_duration.value.trim() || null,
      rental_experience: form.rental_experience.value,
      divar_experience: form.divar_experience.value || null,
      negotiation_experience: form.negotiation_experience.value.trim() || null,
      employment_status: form.employment_status.value || null,
      morning_availability: form.morning_availability.value,
      evening_availability: form.evening_availability.value || null,
      holiday_availability: form.holiday_availability.value || null,
      start_availability: form.start_availability.value.trim() || null,
      motivation: form.motivation.value.trim(),
      key_skill_answer: form.key_skill_answer.value.trim(),
      about_applicant: form.about_applicant.value.trim() || null,
      status: 'new',
      admin_notes: null,
      interview_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  function loadApps() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveApps(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var result = validateForm();
    if (result.isBot) {
      formCard.classList.add('hidden');
      successPanel.classList.add('show');
      if (trackingEl) trackingEl.textContent = 'DOT-XXXXXX';
      return;
    }
    if (!result.valid) {
      showAlert('لطفاً فیلدهای مشخص‌شده را بررسی کنید.', 'error');
      return;
    }

    submitBtn.disabled = true;
    var originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> در حال ارسال...';

    try {
      var payload = collectData();
      var list = loadApps();
      list.unshift(payload);
      saveApps(list);

      formCard.classList.add('hidden');
      successPanel.classList.add('show');
      if (trackingEl) trackingEl.textContent = payload.tracking_code;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showAlert('ثبت درخواست با مشکل مواجه شد. لطفاً دوباره تلاش کنید.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  form.querySelectorAll('.radio-item input').forEach(function (input) {
    input.addEventListener('change', function () {
      var group = input.closest('.radio-group');
      if (group) {
        group.querySelectorAll('.radio-item').forEach(function (item) {
          item.classList.remove('selected');
        });
      }
      input.closest('.radio-item').classList.add('selected');
      clearFieldError(input);
    });
  });

  form.querySelectorAll('.form-control').forEach(function (el) {
    el.addEventListener('input', function () {
      clearFieldError(el);
    });
  });
})();
