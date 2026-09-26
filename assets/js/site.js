/* Public site behaviour: mobile nav + live जमाखर्च figures. */
(function () {
  'use strict';
  var U = window.MandalUtil;

  document.getElementById('year').textContent = new Date().getFullYear();

  /* --------------------------------------------------------- header state */

  var header = document.querySelector('.site-header');

  function onScroll() {
    // Solid once past roughly the first screen of the hero.
    header.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------ mobile nav */

  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Tapping a link should close the drawer, not leave it covering the section.
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* --------------------------------------------------------- live figures */

  function bars(container, rows) {
    if (!rows || !rows.length) {
      container.innerHTML = '<p class="muted">अद्याप नोंद नाही.</p>';
      return;
    }
    var max = rows.reduce(function (m, r) { return Math.max(m, r.amount); }, 0) || 1;
    container.innerHTML = rows.map(function (r) {
      return '<div class="row">' +
        '<div class="top"><span>' + U.esc(r.label) + '</span><b>' + U.money(r.amount) + '</b></div>' +
        '<div class="track"><div class="fill" style="width:' +
          Math.max(3, Math.round(r.amount / max * 100)) + '%"></div></div>' +
        '</div>';
    }).join('');
  }

  function offline(note) {
    document.getElementById('psVargani').innerHTML = '<p class="muted">' + note + '</p>';
    document.getElementById('psExpenses').innerHTML = '<p class="muted">' + note + '</p>';
    document.getElementById('psNote').textContent = note;
  }

  if (!U.configured()) {
    offline('जमाखर्च जोडणी अद्याप झालेली नाही (assets/js/config.js मध्ये API URL टाका).');
    return;
  }

  U.get('public').then(function (d) {
    if (!d || !d.ok) { offline('जमाखर्च सध्या उपलब्ध नाही.'); return; }

    // "११ वे पर्व" — worked out from the founding year, so it is right
    // every year without anyone editing the page.
    var parva = U.parva(d.parva);
    if (parva) {
      document.getElementById('heroTitle').textContent = parva + ' — नवरात्रौत्सव';
      document.getElementById('heroEyebrow').textContent =
        U.dev(d.foundedYear || 2016) + ' पासून · दत्तनगर, कोडोली, जि. सातारा';
    }

    document.getElementById('hsIncome').textContent = U.moneyShort(d.income);
    document.getElementById('hsSpent').textContent = U.moneyShort(d.spent);
    document.getElementById('hsDonors').textContent =
      (d.memberCount + d.areaCount + (d.sponsorCount || 0)) || '—';
    document.getElementById('hsYear').textContent = parva ? U.dev(d.year) : (d.year || '—');

    document.getElementById('psIncome').textContent = U.money(d.income);
    document.getElementById('psIncomeSub').textContent =
      (d.memberCount + d.areaCount) + ' नोंदी';
    document.getElementById('psSpent').textContent = U.money(d.spent);
    document.getElementById('psSpentSub').textContent = d.expenseCount + ' नोंदी';

    var bal = document.getElementById('psBalance');
    bal.textContent = U.money(Math.abs(d.balance));
    document.getElementById('psBalanceCard').classList.add(d.balance < 0 ? 'bad' : 'good');
    document.getElementById('psBalanceSub').textContent =
      d.balance < 0 ? 'तूट' : 'शिल्लक';

    var sources = [
      { label: 'सभासद वर्गणी', amount: d.memberTotal },
      { label: 'क्षेत्र वर्गणी', amount: d.areaTotal }
    ];
    if (d.sponsorTotal) sources.push({ label: 'देणगी', amount: d.sponsorTotal });
    bars(document.getElementById('psVargani'), sources);

    // वस्तू स्वरूपात देणगी never becomes cash, so it is noted apart from the
    // totals rather than folded into them.
    if (d.sponsorKindTotal) {
      document.getElementById('psVargani').insertAdjacentHTML('beforeend',
        '<p class="muted" style="margin:12px 0 0">वस्तू स्वरूपात देणगी: ' +
        U.money(d.sponsorKindTotal) + ' (रकमेत धरलेली नाही)</p>');
    }

    if (d.byPurpose && d.byPurpose.length) {
      var box = document.getElementById('psPurpose');
      if (box) { bars(box, d.byPurpose); box.closest('.card').hidden = false; }
    }
    bars(document.getElementById('psExpenses'), d.topExpenses);

    document.getElementById('psNote').textContent =
      'आकडे ' + new Date().toLocaleDateString('en-IN') + ' पर्यंतचे.';
  }).catch(function () {
    offline('जमाखर्च सध्या उपलब्ध नाही. कृपया नंतर पहा.');
  });
})();
