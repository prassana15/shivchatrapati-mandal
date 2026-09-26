/* -------------------------------------------------------------------------
   Clean in-page video — no Instagram chrome, no "Watch on Instagram".

   Put data-video="<path or url>" on any element:

     <div class="figure" data-video="assets/video/aaras.mp4"
          data-poster="assets/img/aaras.jpg"></div>

   The clip plays muted and looped, starts when it scrolls into view, pauses
   when it scrolls away, and offers a sound button. Because the file is yours,
   nothing is blocked and no third-party player appears.

   An Instagram reel URL will NOT work here. Instagram does not serve its
   video files to other sites, and reels using licensed music are locked to
   their own player. Use an mp4 you hold: export it from the phone that shot
   it, or Instagram > Settings > Accounts Centre > Your information and
   permissions > Download your information > Media only.
   ------------------------------------------------------------------------- */

(function () {
  'use strict';

  var slots = document.querySelectorAll('[data-video]');
  if (!slots.length) return;

  Array.prototype.forEach.call(slots, function (slot) {
    var src = String(slot.getAttribute('data-video') || '').trim();
    if (!src || !/\.(mp4|webm)(\?|$)/i.test(src)) return;

    var wrap = document.createElement('div');
    wrap.className = 'vid';

    var v = document.createElement('video');
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'metadata';
    var poster = slot.getAttribute('data-poster');
    if (poster) v.poster = poster;

    // File missing or unplayable: fall back to the Instagram embed if the
    // slot names one, otherwise leave the placeholder that was already there.
    v.addEventListener('error', function () {
      wrap.remove();
      var reel = slot.getAttribute('data-ig-reel');
      if (reel && window.IGEmbed) window.IGEmbed.render(slot, reel);
    });

    var sound = document.createElement('button');
    sound.type = 'button';
    sound.className = 'vid-sound';
    sound.setAttribute('aria-label', 'आवाज सुरू करा');
    sound.title = 'आवाज सुरू करा';
    sound.textContent = '🔇';
    sound.addEventListener('click', function () {
      v.muted = !v.muted;
      sound.textContent = v.muted ? '🔇' : '🔊';
      var label = v.muted ? 'आवाज सुरू करा' : 'आवाज बंद करा';
      sound.setAttribute('aria-label', label);
      sound.title = label;
      if (!v.muted) v.play();
    });

    wrap.appendChild(v);
    wrap.appendChild(sound);

    v.addEventListener('loadeddata', function () {
      slot.innerHTML = '';
      slot.appendChild(wrap);
      slot.classList.add('is-video');
    });

    // Only play what is actually on screen — several autoplaying clips at
    // once chews through a phone's battery and data for no benefit.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var p = v.play();
            if (p && p.catch) p.catch(function () { /* autoplay refused */ });
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.25 }).observe(wrap);
    } else {
      v.autoplay = true;
    }
  });
})();
