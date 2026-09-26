/* -------------------------------------------------------------------------
   Background video for the top of the page.

   Put ONE url below. Three kinds work:

   1. A file in this repo          'assets/video/hero.mp4'
      Upload the mp4 to the repo alongside index.html. Simplest and fastest,
      and it keeps working forever because you own the file.
      Keep it under about 5MB or the page crawls on mobile data.

   2. Any direct video link        'https://example.com/aarti.mp4'
      Must end in .mp4 or .webm and be publicly readable.

   3. A YouTube link              'https://www.youtube.com/watch?v=XXXXXXXXXXX'
      Works with unlisted videos too, so it need not be public on your
      channel. YouTube hosts it free and handles all the bandwidth.

   INSTAGRAM REEL LINKS DO NOT WORK HERE. Instagram blocks direct playback of
   its videos on other sites. Reels are shown further down the page as proper
   Instagram embeds instead — see instagram.js.

   Leave it empty ('') and the hero keeps its plain saffron-maroon gradient,
   which looks perfectly good on its own.
   ------------------------------------------------------------------------- */

window.HERO_VIDEO = 'assets/video/hero.mp4';

(function () {
  'use strict';

  var slot = document.getElementById('heroVideo');
  if (!slot) return;

  var hero = slot.closest('.hero');
  // Marks the hero as carrying video: turns on the cream veil and the
  // text shadow. Removed again if the video fails to load.
  function on() { if (hero) hero.classList.add('has-video'); }
  function off() { if (hero) hero.classList.remove('has-video'); }

  var url = String(window.HERO_VIDEO || '').trim();
  if (!url) return;

  // Respect a phone set to reduce motion - a looping video is exactly the
  // kind of thing that setting exists for.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);

  if (yt) {
    var id = yt[1];
    var params = [
      'autoplay=1', 'mute=1', 'controls=0', 'loop=1', 'playlist=' + id,
      'playsinline=1', 'modestbranding=1', 'rel=0', 'showinfo=0',
      'iv_load_policy=3', 'disablekb=1'
    ].join('&');

    var frame = document.createElement('iframe');
    frame.className = 'hero-frame';
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?' + params;
    frame.title = 'मंडळाचा व्हिडिओ';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('aria-hidden', 'true');
    slot.appendChild(frame);
    slot.classList.add('is-frame');
    on();
    return;
  }

  if (!/\.(mp4|webm)(\?|$)/i.test(url)) return;

  var v = document.createElement('video');
  v.className = 'hero-video';
  v.autoplay = true;
  v.muted = true;          // required, or the browser refuses to autoplay
  v.loop = true;
  v.playsInline = true;
  v.preload = 'metadata';
  v.setAttribute('aria-hidden', 'true');
  v.poster = 'assets/img/hero-poster.jpg';
  v.src = url;
  // Missing file, wrong path, blocked host - drop it and keep the gradient.
  v.onerror = function () { v.remove(); off(); };
  v.addEventListener('loadeddata', on);
  slot.appendChild(v);

  // Safari sometimes ignores the autoplay attribute until asked directly.
  var p = v.play();
  if (p && p.catch) p.catch(function () { v.remove(); off(); });
})();
