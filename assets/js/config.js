/* -------------------------------------------------------------------------
   One setting for the whole site.

   Paste the Apps Script web app URL here after deploying. It ends in /exec.
   Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.

   Re-deploying after a code change gives a NEW url unless you use
   Deploy > Manage deployments > edit (pencil) > Version: New version,
   which keeps the same url. Always use that, or this line goes stale.
   ------------------------------------------------------------------------- */
window.MANDAL_API = 'https://script.google.com/macros/s/AKfycbzrLHSIY2HyRBxiGkVYV0MwL0vGPrzvPKIjwJ0hKSMH5v90WKpj6RBp_NGL3gfPk_Um/exec';

/* Shared helpers ---------------------------------------------------------- */

/* ---------------------------------------------------------- activity bar */

/* Apps Script can take a few seconds to wake. Without a visible signal the
   page looks frozen and people tap the button again, so every request drives
   a thin bar across the top of the window. */
var netPending = 0;

function netBar() {
  var el = document.getElementById('netBar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'netBar';
    document.body.appendChild(el);
  }
  return el;
}

function netStart() {
  if (++netPending === 1) netBar().classList.add('on');
}

function netStop() {
  if (--netPending <= 0) { netPending = 0; netBar().classList.remove('on'); }
}

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

  /** 11 -> ११ */
  dev: function (n) {
    return String(n).replace(/\d/g, function (d) { return '०१२३४५६७८९'[d]; });
  },

  /** 11 -> "११ वे पर्व". Marathi ordinals are irregular below five. */
  parva: function (n) {
    if (!n || n < 1) return '';
    var suffix = { 1: 'ले', 2: 'रे', 3: 'रे', 4: 'थे' }[n] || 'वे';
    return this.dev(n) + ' ' + suffix + ' पर्व';
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
    netStart();
    return fetch(window.MANDAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (j) { netStop(); return j; })
      .catch(function (e) { netStop(); throw e; });
  },

  /**
   * Reads go through POST as well. A GET to /exec is answered with a redirect
   * to googleusercontent.com, and that hop is flaky from some networks —
   * POST is the path already proven by the login, so use it for everything.
   */
  get: function (action, extra) {
    var payload = { action: action };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
      }
    }
    return this.post(payload);
  },

  configured: function () {
    return window.MANDAL_API && window.MANDAL_API.indexOf('script.google.com') > -1;
  }
};
