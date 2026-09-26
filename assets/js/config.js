/* -------------------------------------------------------------------------
   One setting for the whole site.

   Paste the Apps Script web app URL here after deploying. It ends in /exec.
   Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.

   Re-deploying after a code change gives a NEW url unless you use
   Deploy > Manage deployments > edit (pencil) > Version: New version,
   which keeps the same url. Always use that, or this line goes stale.
   ------------------------------------------------------------------------- */
window.MANDAL_API = 'PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE';

/* Shared helpers ---------------------------------------------------------- */

window.MandalUtil = {
  /** ₹1,67,569 - Indian digit grouping, no paise unless there are any. */
  money: function (n) {
    var v = Number(n || 0);
    return '₹' + v.toLocaleString('en-IN', {
      maximumFractionDigits: v % 1 ? 2 : 0
    });
  },

  /** Short form for tight spaces: ₹2.36 लाख */
  moneyShort: function (n) {
    var v = Number(n || 0);
    if (v >= 100000) return '₹' + (v / 100000).toFixed(2).replace(/\.00$/, '') + ' लाख';
    if (v >= 1000) return '₹' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return '₹' + v;
  },

  /** yyyy-mm-dd -> dd/mm/yyyy for display. Blank stays blank. */
  dateOut: function (s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : (s || '');
  },

  esc: function (s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /**
   * POST to the Apps Script API.
   * Content-Type is text/plain on purpose: that keeps it a "simple" CORS
   * request, so the browser skips the preflight OPTIONS call that Apps
   * Script cannot answer. Do not change it to application/json.
   */
  post: function (payload) {
    return fetch(window.MANDAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  },

  get: function (action) {
    return fetch(window.MANDAL_API + '?action=' + encodeURIComponent(action))
      .then(function (r) { return r.json(); });
  },

  configured: function () {
    return window.MANDAL_API && window.MANDAL_API.indexOf('script.google.com') > -1;
  }
};
