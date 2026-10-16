/**
 * منطق فرم استخدام — ذخیره در Supabase
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

    var ageVal = form.age.value.trim();
    if (!ageVal) {
      setFieldError(form.age, 'سن الزامی است.');
      valid = false;
    } else {
      var ageNum = parseInt(ageVal, 10);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 80) {
        setFieldError(form.age, 'سن باید حداقل ۱۸ و حداکثر ۸۰ باشد.');
        valid = false;
      }
    }

    if (!form.gender.value) {
      setFieldError(form.querySelector('input[name="gender"]'), 'جنسیت را انتخاب کنید.');
      valid = false;
    }

    if (!form.residence_city.value) {
      setFieldError(form.querySelector('input[name="residence_city"]'), 'شهر و محدوده سکونت را انتخاب کنید.');
      valid = false;
    } else if (form.residence_city.value === 'other') {
      if (!form.residence_other.value.trim()) {
        setFieldError(form.residence_other, 'محدوده سکونت خود را وارد کنید.');
        valid = false;
      }
    }

    if (!form.has_vehicle.value) {
      setFieldError(form.querySelector('input[name="has_vehicle"]'), 'وضعیت وسیله نقلیه را مشخص کنید.');
      valid = false;
    } else if (form.has_vehicle.value === 'دارم' && !form.vehicle_type.value) {
      setFieldError(form.querySelector('input[name="vehicle_type"]'), 'نوع وسیله نقلیه را انتخاب کنید.');
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

  function getResidenceArea() {
    var city = form.residence_city.value;
    if (city === 'other') {
      return form.residence_other.value.trim();
    }
    return city || '';
  }

  function collectData() {
    var hasVehicle = form.has_vehicle.value;
    return {
      id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      tracking_code: generateTrackingCode(),
      full_name: form.full_name.value.trim(),
      phone: normalizePhone(form.phone.value.trim()),
      age: form.age.value ? parseInt(form.age.value, 10) : null,
      gender: form.gender.value || null,
      residence_city: form.residence_city.value === 'other' ? 'other' : form.residence_city.value,
      residence_area: getResidenceArea(),
      has_vehicle: hasVehicle || null,
      vehicle_type: hasVehicle === 'دارم' ? (form.vehicle_type.value || null) : null,
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

    if (!window.dotSupabase) {
      showAlert('اتصال به سرور برقرار نیست. لطفاً بعداً دوباره تلاش کنید.', 'error');
      return;
    }

    submitBtn.disabled = true;
    var originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> در حال ارسال...';

    var payload = collectData();

    window.dotSupabase
      .from('applications')
      .insert([payload])
      .then(function (res) {
        if (res.error) {
          console.error('[DOT] insert error', res.error);
          showAlert('ثبت درخواست با مشکل مواجه شد. لطفاً دوباره تلاش کنید.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
          return;
        }
        formCard.classList.add('hidden');
        successPanel.classList.add('show');
        if (trackingEl) trackingEl.textContent = payload.tracking_code;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function (err) {
        console.error('[DOT] insert exception', err);
        showAlert('ثبت درخواست با مشکل مواجه شد. لطفاً دوباره تلاش کنید.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      });
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

  /* نمایش/مخفی کردن فیلد محدوده دیگر */
  var residenceOtherWrap = document.getElementById('residence-other-wrap');
  form.querySelectorAll('input[name="residence_city"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (residenceOtherWrap) {
        if (radio.value === 'other') {
          residenceOtherWrap.style.display = 'block';
        } else {
          residenceOtherWrap.style.display = 'none';
          if (form.residence_other) form.residence_other.value = '';
          clearFieldError(form.residence_other);
        }
      }
    });
  });

  /* نمایش/مخفی کردن نوع وسیله نقلیه */
  var vehicleTypeWrap = document.getElementById('vehicle-type-wrap');
  form.querySelectorAll('input[name="has_vehicle"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (vehicleTypeWrap) {
        if (radio.value === 'دارم') {
          vehicleTypeWrap.style.display = 'block';
        } else {
          vehicleTypeWrap.style.display = 'none';
          form.querySelectorAll('input[name="vehicle_type"]').forEach(function (r) {
            r.checked = false;
            var item = r.closest('.radio-item');
            if (item) item.classList.remove('selected');
          });
        }
      }
    });
  });
})();
