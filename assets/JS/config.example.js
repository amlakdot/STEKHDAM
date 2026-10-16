/**
 * تنظیمات پروژه — این فایل را کپی کنید به config.js و مقادیر را پر کنید
 *
 * ۱. از supabase.com یک پروژه بسازید
 * ۲. Project Settings → API → Project URL و anon public key را کپی کنید
 * ۳. همین دو مقدار را پایین جایگزین کنید
 */
window.DOT_CONFIG = {
  BRAND: {
    name: 'املاک دات',
    shortName: 'دات',
    officeAddress: 'تهران',
    officePhone: '',
    workingHours: 'شنبه تا چهارشنبه ۹ تا ۱۳',
  },
  STATUSES: {
    new: 'جدید',
    reviewing: 'در حال بررسی',
    contacted: 'تماس گرفته‌شده',
    interview: 'دعوت به مصاحبه',
    accepted: 'پذیرفته‌شده',
    rejected: 'رد شده',
  },
  /* این دو خط را با مقادیر واقعی پروژه Supabase خودتان عوض کنید */
  SUPABASE_URL: 'https://XXXXXXXX.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....',

  STORAGE_KEY: 'dot_apps_v1',
  AUTH_KEY: 'dot_adm_ok',
};
