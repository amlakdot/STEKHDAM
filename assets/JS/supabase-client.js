/**
 * راه‌اندازی کلاینت Supabase
 * فقط از کلید anon استفاده می‌شود.
 */
(function () {
  'use strict';

  if (!window.DOT_CONFIG || !window.DOT_CONFIG.SUPABASE_URL || !window.DOT_CONFIG.SUPABASE_ANON_KEY) {
    console.error('[DOT] config.js بارگذاری نشده یا SUPABASE_URL / SUPABASE_ANON_KEY خالی است.');
    return;
  }

  if (typeof supabase === 'undefined') {
    console.error('[DOT] کتابخانه supabase-js بارگذاری نشده است. تگ CDN را در HTML چک کنید.');
    return;
  }

  var url = window.DOT_CONFIG.SUPABASE_URL;
  var key = window.DOT_CONFIG.SUPABASE_ANON_KEY;

  if (url.indexOf('XXXXXXXX') !== -1 || key.indexOf('....') !== -1) {
    console.warn('[DOT] هنوز SUPABASE_URL یا SUPABASE_ANON_KEY را با مقادیر واقعی عوض نکرده‌اید.');
  }

  window.dotSupabase = supabase.createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
})();
