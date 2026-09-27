/* -------------------------------------------------------------------------
   Instagram reels — the FALLBACK player.

   Used only where no local video file is available. Instagram embeds cannot
   autoplay, and reels carrying licensed music are locked to Instagram's own
   player ("Watch on Instagram"), so a local mp4 always looks better. See
   inline-video.js for that path.

   Paste urls from the address bar or the app's "Copy link". A ?stkn=... share
   token is stripped automatically. Posts must be PUBLIC.
   ------------------------------------------------------------------------- */

/* The रील्स grid.
 *
 *   file — an mp4 in this repo. Autoplays muted and looped, no Instagram
 *          chrome. This is what you want. Add the file and it takes over.
 *   reel — the Instagram url, used only while that file is missing.
 *
 * Both are optional; give at least one. Name the files whatever you like.
 */
/* reel-1 is used in the नवरात्रौत्सव section and utsav.mp4 in the hero, so
   the grid shows the remaining clips. */
window.REELS = [
  { file: 'assets/video/reel-2.mp4', reel: 'https://www.instagram.com/reel/DPEsmTUCACS/' },
  { file: 'assets/video/reel-3.mp4', reel: 'https://www.instagram.com/reel/DPDOx21kXtJ/' },
  { file: 'assets/video/reel-4.mp4', reel: 'https://www.instagram.com/reel/DPBmJ17ESc6/' },
  { file: 'assets/video/hero.mp4',   reel: 'https://www.instagram.com/reel/DPVVirWCC0W/' }
];

window.IG_PROFILE = 'https://www.instagram.com/shivchatrapati_mandal_/';

/* Shared embed helper, also used by inline-video.js when an mp4 is missing. */
window.IGEmbed = (function () {
  'use strict';

  var VALID = /^https:\/\/www\.instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+/;
  var loading = false, ready = false, queued = false;

  function clean(url) {
    var u = String(url || '').trim().split('?')[0];
    if (u && u.slice(-1) !== '/') u += '/';
    return u;
  }

  function quote(url) {
    return '<blockquote class="instagram-media" data-instgrm-permalink="' +
      clean(url) + '" data-instgrm-version="14" ' +
      'style="margin:0 auto;width:100%;min-width:0;max-width:540px"></blockquote>';
  }

  /** Loads embed.js once, however many blockquotes arrive and whenever. */
  function hydrate() {
    if (ready) {
      if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
      return;
    }
    queued = true;
    if (loading) return;
    loading = true;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.instagram.com/embed.js';
    s.onload = function () {
      ready = true;
      if (queued && window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
    };
    s.onerror = function () {
      // Blocked or offline — never leave empty boxes behind.
      Array.prototype.forEach.call(
        document.querySelectorAll('.instagram-media'), function (b) {
          b.outerHTML = '<p class="muted">रील सध्या दिसू शकत नाही.</p>';
        });
    };
    document.body.appendChild(s);
  }

  function render(el, url) {
    var u = clean(url);
    if (!el || !VALID.test(u)) return false;
    el.innerHTML = quote(u);
    el.classList.add('is-reel');
    hydrate();
    return true;
  }

  return { valid: function (u) { return VALID.test(clean(u)); },
    clean: clean, quote: quote, hydrate: hydrate, render: render };
})();

(function () {
  'use strict';
  var IG = window.IGEmbed;

  // Inline slots. Anything that also carries data-video belongs to
  // inline-video.js, which falls back to here only if the file is missing.
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-ig-reel]:not([data-video])'), function (el) {
      IG.render(el, el.getAttribute('data-ig-reel'));
    });

  var grid = document.getElementById('igGrid');
  if (!grid) return;

  // Whatever is already placed elsewhere in the page is skipped here.
  var placed = {};
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-ig-reel]'), function (el) {
      placed[IG.clean(el.getAttribute('data-ig-reel'))] = true;
    });

  var items = (window.REELS || []).filter(function (r) {
    var u = r.reel ? IG.clean(r.reel) : '';
    if (u && placed[u]) return false;
    return (r.file && /\.(mp4|webm)$/i.test(r.file)) || IG.valid(u);
  });

  if (!items.length) {
    grid.innerHTML = '<div class="ig-empty"><p><strong>रील्स अद्याप जोडलेल्या नाहीत.</strong></p>' +
      '<a class="btn btn-primary btn-sm" href="' + window.IG_PROFILE +
      '" target="_blank" rel="noopener">इन्स्टाग्रामवर पहा</a></div>';
    return;
  }

  // Build the slots. inline-video.js runs after this file and picks up every
  // data-video; anything without a usable file drops back to the embed.
  grid.innerHTML = items.map(function (r) {
    var attrs = '';
    if (r.file) attrs += ' data-video="' + r.file + '"';
    if (r.poster) attrs += ' data-poster="' + r.poster + '"';
    if (r.reel) attrs += ' data-ig-reel="' + IG.clean(r.reel) + '"';
    return '<div class="reel-slot"' + attrs + '></div>';
  }).join('');

  // Only the ones with no local file need Instagram right away.
  Array.prototype.forEach.call(
    grid.querySelectorAll('.reel-slot:not([data-video])'), function (el) {
      IG.render(el, el.getAttribute('data-ig-reel'));
    });
})();
