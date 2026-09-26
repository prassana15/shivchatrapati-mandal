/* Records app: login, entry, list, summary. Talks to the Apps Script API. */
(function () {
  'use strict';
  var U = window.MandalUtil;

  var TOKEN = null, USER = null, CFG = null, TAB = 'members', EDITING = null;
  var ROWS = [];

  /* Marathi labels for the English column keys the sheet uses. */
  var LABELS = {
    Date: 'तारीख', Name: 'नाव', Amount: 'रक्कम', Mode: 'पद्धत',
    Reason: 'खर्चाचे कारण', Karyakarta: 'मध्यस्थी कार्यकर्ता',
    Remarks: 'शेरा', Receipt: 'पावती', Voucher: 'व्हाउचर'
  };

  var TABLE_COLS = {
    members:  ['Receipt', 'Date', 'Name', 'Mode', 'Amount'],
    area:     ['Receipt', 'Date', 'Name', 'Mode', 'Amount'],
    expenses: ['Voucher', 'Date', 'Reason', 'Karyakarta', 'Mode', 'Amount']
  };

  var REQUIRED = { Date: true, Amount: true, Name: true, Reason: true };
  var WIDE = { Reason: true, Remarks: true, Karyakarta: true };

  function $(id) { return document.getElementById(id); }

  function flash(el, text, kind) {
    el.textContent = text;
    el.className = 'msg show ' + kind;
    if (kind === 'ok') setTimeout(function () { el.className = 'msg'; }, 4500);
  }

  /* ================================================================ auth */

  if (!U.configured()) {
    flash($('loginMsg'), 'API URL सेट केलेला नाही. assets/js/config.js तपासा.', 'err');
  }

  var saved = null;
  try { saved = localStorage.getItem('mandalToken'); } catch (e) { /* private mode */ }
  if (saved && U.configured()) {
    U.post({ action: 'ping', token: saved }).then(function (r) {
      if (r && r.ok) { TOKEN = saved; USER = r.user; CFG = r.config; enter(); }
    }).catch(function () { /* stay on login */ });
  }

  $('loginBtn').addEventListener('click', doLogin);
  $('pin').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });

  function doLogin() {
    var btn = $('loginBtn');
    btn.disabled = true; btn.textContent = 'थांबा…';
    U.post({ action: 'login', email: $('email').value, pin: $('pin').value })
      .then(function (r) {
        btn.disabled = false; btn.textContent = 'लॉगिन करा';
        if (!r.ok) { flash($('loginMsg'), r.error, 'err'); return; }
        TOKEN = r.token; USER = r.user; CFG = r.config;
        try { localStorage.setItem('mandalToken', TOKEN); } catch (e) { /* ignore */ }
        enter();
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'लॉगिन करा';
        flash($('loginMsg'), 'जोडणी होऊ शकली नाही. इंटरनेट तपासा.', 'err');
      });
  }

  $('logoutBtn').addEventListener('click', function () {
    U.post({ action: 'logout', token: TOKEN });
    try { localStorage.removeItem('mandalToken'); } catch (e) { /* ignore */ }
    location.reload();
  });

  function enter() {
    $('loginView').classList.add('hide');
    $('appView').classList.remove('hide');
    $('whoName').textContent = USER.name;
    $('whoRole').textContent = { admin: 'ॲडमिन', entry: 'नोंद', view: 'फक्त पाहणे' }[USER.role] || USER.role;
    $('yearChip').textContent = CFG.year;
    switchTab('members');
  }

  function fail(r) {
    if (r && r.expired) {
      try { localStorage.removeItem('mandalToken'); } catch (e) { /* ignore */ }
      alert('सत्र संपले. पुन्हा लॉगिन करा.');
      location.reload();
      return true;
    }
    return false;
  }

  /* ================================================================ tabs */

  Array.prototype.forEach.call($('tabs').querySelectorAll('button'), function (b) {
    b.addEventListener('click', function () { switchTab(b.dataset.tab); });
  });

  function switchTab(tab) {
    TAB = tab;
    EDITING = null;
    Array.prototype.forEach.call($('tabs').querySelectorAll('button'), function (b) {
      b.classList.toggle('on', b.dataset.tab === tab);
    });

    var summary = tab === 'summary';
    $('summaryPanel').classList.toggle('hide', !summary);
    $('listPanel').classList.toggle('hide', summary);
    $('formPanel').classList.toggle('hide', summary || USER.role === 'view');

    if (summary) { loadSummary(); return; }

    $('listTitle').textContent = CFG.registers[tab].label;
    buildForm();
    loadList();
  }

  /* ================================================================ form */

  function buildForm() {
    var fields = CFG.registers[TAB].fields;
    $('formFields').innerHTML = fields.map(function (f) {
      var id = 'f_' + f, input;
      if (f === 'Mode') {
        input = '<select id="' + id + '">' + CFG.modes.map(function (m) {
          return '<option value="' + U.esc(m) + '">' + U.esc(m) + '</option>';
        }).join('') + '</select>';
      } else if (f === 'Amount') {
        input = '<input id="' + id + '" type="number" min="1" step="1" inputmode="numeric">';
      } else if (f === 'Date') {
        input = '<input id="' + id + '" type="date">';
      } else {
        input = '<input id="' + id + '" type="text">';
      }
      return '<div' + (WIDE[f] ? ' class="full"' : '') + '>' +
        '<label for="' + id + '">' + U.esc(LABELS[f] || f) +
        (REQUIRED[f] ? ' *' : '') + '</label>' + input + '</div>';
    }).join('');
    $('f_Date').value = CFG.today;
    $('formTitle').textContent = 'नवीन नोंद — ' + CFG.registers[TAB].label;
  }

  $('saveBtn').addEventListener('click', function () {
    var rec = {};
    CFG.registers[TAB].fields.forEach(function (f) { rec[f] = $('f_' + f).value; });
    if (EDITING) rec.ID = EDITING;

    var btn = $('saveBtn');
    btn.disabled = true; btn.textContent = 'जतन होत आहे…';
    U.post({ action: 'save', token: TOKEN, register: TAB, record: rec })
      .then(function (r) {
        btn.disabled = false;
        btn.textContent = EDITING ? 'बदल जतन करा' : 'नोंद जतन करा';
        if (fail(r)) return;
        if (!r.ok) { flash($('formMsg'), r.error, 'err'); return; }
        var num = r.record.Receipt || r.record.Voucher;
        flash($('formMsg'), (EDITING ? 'बदलले' : 'जतन झाले') + ' — ' + num +
          ' · ' + U.money(r.record.Amount), 'ok');
        cancelEdit();
        loadList();
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'नोंद जतन करा';
        flash($('formMsg'), 'जतन होऊ शकले नाही. पुन्हा प्रयत्न करा.', 'err');
      });
  });

  $('cancelBtn').addEventListener('click', cancelEdit);

  function cancelEdit() {
    EDITING = null;
    $('cancelBtn').classList.add('hide');
    $('saveBtn').textContent = 'नोंद जतन करा';
    buildForm();
  }

  function startEdit(rec) {
    EDITING = rec.ID;
    CFG.registers[TAB].fields.forEach(function (f) {
      var el = $('f_' + f);
      if (el) el.value = rec[f] === null || rec[f] === undefined ? '' : rec[f];
    });
    $('formTitle').textContent = 'बदल — ' + (rec.Receipt || rec.Voucher);
    $('saveBtn').textContent = 'बदल जतन करा';
    $('cancelBtn').classList.remove('hide');
    $('formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ================================================================ list */

  ['q', 'from', 'to'].forEach(function (id) {
    var t;
    $(id).addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(loadList, 350);
    });
  });

  $('clearBtn').addEventListener('click', function () {
    $('q').value = ''; $('from').value = ''; $('to').value = '';
    loadList();
  });

  function loadList() {
    $('listCount').textContent = 'लोड होत आहे…';
    U.post({
      action: 'list', token: TOKEN, register: TAB,
      filter: { q: $('q').value, from: $('from').value, to: $('to').value }
    }).then(function (r) {
      if (fail(r)) return;
      if (!r.ok) { $('listCount').textContent = r.error; return; }
      ROWS = r.rows;
      render(r);
    }).catch(function () {
      $('listCount').textContent = 'नोंदी आणता आल्या नाहीत.';
    });
  }

  function render(r) {
    var cols = TABLE_COLS[TAB];
    var canEdit = USER.role === 'admin' || USER.role === 'entry';

    if (!r.rows.length) {
      $('tbl').innerHTML = '<tr><td class="empty">अद्याप एकही नोंद नाही.</td></tr>';
    } else {
      var head = '<tr>' + cols.map(function (c) {
        return '<th' + (c === 'Amount' ? ' class="amt"' : '') + '>' +
          U.esc(LABELS[c] || c) + '</th>';
      }).join('') + (canEdit ? '<th class="actions"></th>' : '') + '</tr>';

      var body = r.rows.map(function (row, i) {
        var tds = cols.map(function (c) {
          if (c === 'Amount') return '<td class="amt">' + U.money(row.Amount) + '</td>';
          if (c === 'Date') return '<td>' + U.esc(U.dateOut(row.Date)) + '</td>';
          return '<td>' + U.esc(row[c]) + '</td>';
        }).join('');
        var act = canEdit
          ? '<td class="actions">' +
            '<button class="btn btn-ghost btn-sm" data-edit="' + i + '">बदला</button>' +
            (USER.role === 'admin'
              ? ' <button class="btn btn-ghost btn-sm" data-del="' + i + '">काढा</button>'
              : '') + '</td>'
          : '';
        return '<tr>' + tds + act + '</tr>';
      }).join('');

      $('tbl').innerHTML = head + body;
    }

    $('listCount').textContent = r.count + ' नोंदी' +
      (r.count > r.rows.length ? ' (अलीकडच्या ' + r.rows.length + ' दाखवल्या)' : '');
    $('listTotal').textContent = U.money(r.total);

    Array.prototype.forEach.call($('tbl').querySelectorAll('[data-edit]'), function (b) {
      b.addEventListener('click', function () { startEdit(ROWS[b.dataset.edit]); });
    });
    Array.prototype.forEach.call($('tbl').querySelectorAll('[data-del]'), function (b) {
      b.addEventListener('click', function () { doDelete(ROWS[b.dataset.del], b); });
    });
  }

  function doDelete(row, btn) {
    var label = (row.Receipt || row.Voucher) + ' · ' +
      (row.Name || row.Reason) + ' · ' + U.money(row.Amount);
    if (!confirm('ही नोंद काढायची?\n\n' + label +
      '\n\nनोंद शीटमध्ये राहील, फक्त "काढलेली" म्हणून खूण होईल.')) return;

    btn.disabled = true;
    U.post({ action: 'remove', token: TOKEN, register: TAB, id: row.ID })
      .then(function (r) {
        if (fail(r)) return;
        if (!r.ok) { alert(r.error); btn.disabled = false; return; }
        loadList();
      })
      .catch(function () { btn.disabled = false; alert('काढता आले नाही.'); });
  }

  /* CSV of exactly what is on screen, so a filtered view prints correctly. */
  $('csvBtn').addEventListener('click', function () {
    if (!ROWS.length) { alert('उतरवण्यासाठी नोंदी नाहीत.'); return; }
    var cols = TABLE_COLS[TAB];
    var lines = [cols.map(function (c) { return LABELS[c] || c; }).join(',')];
    ROWS.forEach(function (row) {
      lines.push(cols.map(function (c) {
        var v = c === 'Date' ? U.dateOut(row.Date) : row[c];
        return '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"';
      }).join(','));
    });
    // BOM so Excel opens Marathi text correctly instead of showing boxes.
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = TAB + '-' + CFG.year + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });

  /* ============================================================= summary */

  function loadSummary() {
    $('sumStats').innerHTML = '<p class="muted">लोड होत आहे…</p>';
    U.post({ action: 'summary', token: TOKEN }).then(function (s) {
      if (fail(s)) return;
      if (!s.ok) { $('sumStats').innerHTML = '<p class="muted">' + U.esc(s.error) + '</p>'; return; }

      $('sumStats').innerHTML =
        stat('एकूण जमा', U.money(s.income), (s.memberCount + s.areaCount) + ' नोंदी', '') +
        stat('एकूण खर्च', U.money(s.spent), s.expenseCount + ' नोंदी', '') +
        stat(s.balance < 0 ? 'तूट' : 'शिल्लक', U.money(Math.abs(s.balance)),
          'सभासद ' + U.moneyShort(s.memberTotal) + ' · क्षेत्र ' + U.moneyShort(s.areaTotal),
          s.balance < 0 ? 'bad' : 'good');

      bars($('sumMode'), s.byMode);
      bars($('sumExpenses'), s.topExpenses);
      bars($('sumDonors'), s.topDonors);
      bars($('sumKaryakarta'), s.byKaryakarta);
    }).catch(function () {
      $('sumStats').innerHTML = '<p class="muted">हिशोब आणता आला नाही.</p>';
    });
  }

  function stat(k, v, s, cls) {
    return '<div class="stat ' + cls + '"><div class="k">' + U.esc(k) +
      '</div><div class="v">' + U.esc(v) + '</div><div class="s">' + U.esc(s) + '</div></div>';
  }

  function bars(el, rows) {
    if (!rows || !rows.length) { el.innerHTML = '<p class="muted">नोंद नाही.</p>'; return; }
    var max = rows.reduce(function (m, r) { return Math.max(m, r.amount); }, 0) || 1;
    el.innerHTML = rows.map(function (r) {
      return '<div class="row"><div class="top"><span>' + U.esc(r.label) +
        '</span><b>' + U.money(r.amount) + '</b></div>' +
        '<div class="track"><div class="fill" style="width:' +
        Math.max(3, Math.round(r.amount / max * 100)) + '%"></div></div></div>';
    }).join('');
  }
})();
