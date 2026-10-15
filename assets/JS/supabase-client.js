/**
 * راه‌اندازی کلاینت Supabase
 * فقط از کلید anon استفاده می‌شود. امنیت با RLS تضمین می‌شود.
 */
(function () {
  'use strict';

  if (!window.DOT_CONFIG || !window.DOT_CONFIG.SUPABASE_URL || !window.DOT_CONFIG.SUPABASE_ANON_KEY) {
    console.error('[DOT] config.js بارگذاری نشده یا ناقص است. از config.example.js کپی کنید.');
    return;
  }

  if (typeof supabase === 'undefined') {
    console.error('[DOT] کتابخانه supabase-js بارگذاری نشده است.');
    return;
  }

  window.dotSupabase = supabase.createClient(
    window.DOT_CONFIG.SUPABASE_URL,
    window.DOT_CONFIG.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    }
  );
})();
