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
  SUPABASE_URL: 'https://qrxxmvdzrgqvzvlgradlg.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyeHhtdmR6cmdxdnp2bGdhZGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzcwNjUsImV4cCI6MjEwNzY1MzA2NX0.m_A_BPhAWcjoClRHZ83tKzT4xI58yWMe0f4Yz2eUkLQ',

  STORAGE_KEY: 'dot_apps_v1',
  AUTH_KEY: 'dot_adm_ok',
};
