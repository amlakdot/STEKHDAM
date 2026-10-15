/**
 * منطق فرم استخدام — apply.html
 */
(function () {
  'use strict';

  const form = document.getElementById('apply-form');
  const submitBtn = document.getElementById('submit-btn');
  const alertBox = document.getElementById('form-alert');
  const successPanel = document.getElementById('success-panel');
  const formCard = document.getElementById('form-card');
  const trackingEl = document.getElementById('tracking-code');

  if (!form) return;

  // --- اعتبارسنجی شماره موبایل ایرانی ---
  function isValidIranianMobile(phone) {
    const cleaned = phone.replace(/[\s\-]/g, '');
    // 09xxxxxxxxx یا +989xxxxxxxxx یا 00989xxxxxxxxx
    return /^(?:0|98|\+98|0098)?9\d{9}$/.test(cleaned);
  }

  function normalizePhone(phone) {
    let p = phone.replace(/[\s\-]/g, '');
    if (p.startsWith('+98')) p = '0' + p.slice(3);
    else if (p.startsWith('0098')) p = '0' + p.slice(4);
    else if (p.startsWith('98') && p.length === 12) p = '0' + p.slice(2);
    return p;
  }

  // --- تولید کد پیگیری یکتا (سمت کلاینت؛ uniqueness در DB) ---
  function generateTrackingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DOT-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // --- نمایش خطا ---
  function showAlert(message, type) {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = 'alert show alert-' + (type || 'error');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    if (alertBox) alertBox.className = 'alert';
  }

  // --- اعتبارسنجی فیلد ---
  function setFieldError(el, msg) {
    const group = el.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    const err = group.querySelector('.form-error');
    if (err) err.textContent = msg || 'این فیلد الزامی است.';
    el.classList.add('is-invalid');
  }

  function clearFieldError(el) {
    const group = el.closest('.form-group');
    if (!group) return;
    group.classList.remove('has-error');
    el.classList.remove('is-invalid');
  }

  function validateForm() {
    let valid = true;
    hideAlert();

    // پاک کردن خطاهای قبلی
    form.querySelectorAll('.is-invalid').forEach(function (el) {
      clearFieldError(el);
    });

    const fullName = form.full_name.value.trim();
    if (!fullName || fullName.length < 3) {
      setFieldError(form.full_name, 'نام و نام خانوادگی حداقل ۳ کاراکتر باشد.');
      valid = false;
    }

    const phone = form.phone.value.trim();
    if (!phone) {
      setFieldError(form.phone, 'شماره موبایل الزامی است.');
      valid = false;
    } else if (!isValidIranianMobile(phone)) {
      setFieldError(form.phone, 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).');
      valid = false;
    }

    const residence = form.residence_area.value.trim();
    if (!residence) {
      setFieldError(form.residence_area, 'شهر و محدوده سکونت الزامی است.');
      valid = false;
    }

    const exp = form.real_estate_experience.value;
    if (!exp) {
      setFieldError(form.real_estate_experience, 'وضعیت سابقه را انتخاب کنید.');
      valid = false;
    }

    const rental = form.rental_experience.value;
    if (!rental) {
      setFieldError(form.rental_experience, 'سطح تجربه رهن و اجاره را انتخاب کنید.');
      valid = false;
    }

    const morning = form.morning_availability.value;
    if (!morning) {
      setFieldError(form.morning_availability, 'امکان حضور صبح را مشخص کنید.');
      valid = false;
    }

    const motivation = form.motivation.value.trim();
    if (!motivation || motivation.length < 10) {
      setFieldError(form.motivation, 'لطفاً حداقل چند جمله بنویسید.');
      valid = false;
    }

    const keySkill = form.key_skill_answer.value.trim();
    if (!keySkill || keySkill.length < 5) {
      setFieldError(form.key_skill_answer, 'این فیلد الزامی است.');
      valid = false;
    }

    const consent = form.consent.checked;
    if (!consent) {
      showAlert('برای ارسال درخواست باید تأیید نهایی را بپذیرید.', 'error');
      valid = false;
    }

    // Honeypot
    if (form.website && form.website.value) {
      // ربات احتمالی — بدون پیام خطا، موفق جعلی نشان می‌دهیم
      return { valid: false, isBot: true };
    }

    return { valid: valid, isBot: false };
  }

  // --- جمع‌آوری داده ---
  function collectData() {
    return {
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
    };
  }

  // --- ارسال ---
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const result = validateForm();
    if (result.isBot) {
      // جعل موفقیت برای ربات
      formCard.classList.add('hidden');
      successPanel.classList.add('show');
      if (trackingEl) trackingEl.textContent = 'DOT-XXXXXX';
      return;
    }
    if (!result.valid) {
      showAlert('لطفاً فیلدهای مشخص‌شده را بررسی کنید.', 'error');
      return;
    }

    if (!window.dotSupabase) {
      showAlert('اتصال به سرویس برقرار نیست. صفحه را رفرش کنید یا بعداً تلاش کنید.', 'error');
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> در حال ارسال...';

    const payload = collectData();

    try {
      const { data, error } = await window.dotSupabase
        .from('applications')
        .insert([payload])
        .select('tracking_code')
        .single();

      if (error) {
        console.error('[DOT] Insert error:', error.message);
        // پیام عمومی؛ جزئیات حساس نشان داده نمی‌شود
        if (error.code === '23505') {
          // unique violation — کد پیگیری تکراری، دوباره تلاش
          payload.tracking_code = generateTrackingCode();
          const retry = await window.dotSupabase
            .from('applications')
            .insert([payload])
            .select('tracking_code')
            .single();
          if (retry.error) throw retry.error;
          showSuccess(retry.data.tracking_code);
        } else {
          throw error;
        }
      } else {
        showSuccess(data.tracking_code);
      }
    } catch (err) {
      console.error('[DOT] Submit failed:', err);
      showAlert('ثبت درخواست با مشکل مواجه شد. لطفاً چند لحظه بعد دوباره تلاش کنید.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  function showSuccess(code) {
    formCard.classList.add('hidden');
    successPanel.classList.add('show');
    if (trackingEl) trackingEl.textContent = code;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // انتخاب رادیو با استایل
  form.querySelectorAll('.radio-item input').forEach(function (input) {
    input.addEventListener('change', function () {
      const group = input.closest('.radio-group');
      if (group) {
        group.querySelectorAll('.radio-item').forEach(function (item) {
          item.classList.remove('selected');
        });
      }
      input.closest('.radio-item').classList.add('selected');
      clearFieldError(input);
    });
  });

  // پاک کردن خطا هنگام تایپ
  form.querySelectorAll('.form-control').forEach(function (el) {
    el.addEventListener('input', function () {
      clearFieldError(el);
    });
  });
})();
