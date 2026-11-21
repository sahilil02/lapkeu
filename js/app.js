/* ============================================================================
   LAPKEU — Frontend SPA (js/app.js) · berbicara dengan backend GAS lewat fetch()
   Prinsip instant UX:
   1) SPA: semua halaman sudah ada di DOM → pindah menu = tampil/sembunyi (0 ms)
   2) Optimistic UI: tampilan diperbarui DULU, server menyimpan di antrean latar
      belakang; gagal → dikembalikan + notifikasi. ID dibuat di klien (UUID).
   3) Data keuangan hanya di memori (bukan localStorage, sesuai PRD).
      localStorage hanya untuk preferensi tampilan & token sesi.
   4) Filter, pencarian, diagram, laporan pratinjau dihitung lokal (tanpa server).
   ========================================================================== */
(function () {
  'use strict';

  // ════════════════════════════════════════════════════════════════════════
  //  0. KONSTANTA & UTILITAS
  // ════════════════════════════════════════════════════════════════════════
  const PUB = window.__PUBLIC__ || {};
  const SYS = { TRANSFER: 'SYS-TRANSFER', TABUNGAN: 'SYS-TABUNGAN' };
  const SYS_SET = new Set([SYS.TRANSFER, SYS.TABUNGAN]);
  const ADMIN = 'Super Admin';
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const COLORS = ['#12B886', '#7C5CFC', '#FF6B9D', '#38BDF8', '#FF7A59', '#FFB020', '#0EA5E9', '#8B5CF6', '#EC4899', '#F97316', '#06B6D4', '#64748B'];
  const ICONS_KAT = ['bi-egg-fried', 'bi-cup-hot', 'bi-cup-straw', 'bi-cake2', 'bi-basket', 'bi-bag-heart', 'bi-cart3', 'bi-shop', 'bi-scooter', 'bi-bus-front', 'bi-car-front', 'bi-fuel-pump', 'bi-train-front', 'bi-airplane', 'bi-controller', 'bi-film', 'bi-music-note-beamed', 'bi-collection-play', 'bi-lightning-charge', 'bi-droplet', 'bi-wifi', 'bi-phone', 'bi-house-door', 'bi-building', 'bi-mortarboard', 'bi-book', 'bi-heart-pulse', 'bi-capsule', 'bi-bandaid', 'bi-stars', 'bi-scissors', 'bi-gift', 'bi-balloon-heart', 'bi-heart', 'bi-person-hearts', 'bi-tools', 'bi-cash-stack', 'bi-trophy', 'bi-laptop', 'bi-briefcase', 'bi-envelope-paper-heart', 'bi-graph-up-arrow', 'bi-credit-card', 'bi-receipt', 'bi-globe2', 'bi-camera', 'bi-bicycle', 'bi-dribbble', 'bi-tree', 'bi-emoji-smile', 'bi-tag', 'bi-three-dots'];
  const ICONS_TAB = ['bi-piggy-bank', 'bi-heart', 'bi-house-heart', 'bi-airplane', 'bi-luggage', 'bi-shield-check', 'bi-car-front', 'bi-scooter', 'bi-laptop', 'bi-phone', 'bi-mortarboard', 'bi-gem', 'bi-gift', 'bi-balloon-heart', 'bi-camera', 'bi-bicycle', 'bi-briefcase', 'bi-trophy', 'bi-tree', 'bi-stars'];
  const TAGIHAN_PRESET = [
    { nama: 'Listrik Rumah', ikon: 'bi-lightning-charge', kat: 'KAT-UTILITAS' }, { nama: 'Listrik Kos', ikon: 'bi-plug', kat: 'KAT-UTILITAS' },
    { nama: 'Internet WiFi', ikon: 'bi-wifi', kat: 'KAT-PULSA' }, { nama: 'Bayar Kos', ikon: 'bi-building', kat: 'KAT-KOS' },
    { nama: 'Pesmad', ikon: 'bi-book', kat: 'KAT-PENDIDIKAN' }, { nama: 'SPP', ikon: 'bi-mortarboard', kat: 'KAT-PENDIDIKAN' },
    { nama: 'Air PDAM', ikon: 'bi-droplet', kat: 'KAT-UTILITAS' }, { nama: 'Langganan', ikon: 'bi-collection-play', kat: 'KAT-LANGGANAN' },
    { nama: 'Cicilan', ikon: 'bi-credit-card', kat: 'KAT-LAIN-K' }
  ];
  const PALETTES = [
    { nama: 'Jelly Mint', utama: '#12B886', aksen: '#7C5CFC' }, { nama: 'Grape Pop', utama: '#7C5CFC', aksen: '#FF6B9D' },
    { nama: 'Sky Breeze', utama: '#0EA5E9', aksen: '#12B886' }, { nama: 'Coral Sunset', utama: '#FF7A59', aksen: '#7C5CFC' },
    { nama: 'Bubblegum', utama: '#EC4899', aksen: '#38BDF8' }, { nama: 'Teal Night', utama: '#0F766E', aksen: '#F59E0B' }
  ];
  const NAV = [
    ['beranda', 'Beranda', 'bi-grid-1x2'], ['dompet', 'Dompet', 'bi-wallet2'], ['mutasi', 'Mutasi', 'bi-receipt'],
    ['analisis', 'Analisis', 'bi-pie-chart'], ['tabungan', 'Tabungan', 'bi-piggy-bank'], ['tagihan', 'Tagihan', 'bi-calendar2-check'],
    ['laporan', 'Laporan', 'bi-file-earmark-text'], ['kategori', 'Kategori', 'bi-tags'], ['pengaturan', 'Pengaturan', 'bi-gear'],
    ['admin', 'Admin Panel', 'bi-shield-lock', true]
  ];
  const FORM_PAGES = new Set(['pengaturan', 'admin', 'laporan']);
  const PAGE_SIZE = 20;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NF = new Intl.NumberFormat('id-ID');
  const fmtNum = n => NF.format(Math.round(Number(n) || 0));
  const rp = (n, sign) => { const v = Math.round(Number(n) || 0); return (v < 0 ? '-' : (sign && v > 0 ? '+' : '')) + 'Rp ' + fmtNum(Math.abs(v)); };
  const rpShort = n => {
    const a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace('.', ',').replace(',0', '') + ' M';
    if (a >= 1e6) return s + (a / 1e6).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + ' Jt';
    if (a >= 1e3) return s + Math.round(a / 1e3) + ' rb';
    return s + Math.round(a);
  };
  const parseNom = s => Number(String(s == null ? '' : s).replace(/[^\d]/g, '')) || 0;
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => ymd(new Date());
  const nowLocal = () => { const d = new Date(); return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const nowFull = () => nowLocal() + ':' + pad(new Date().getSeconds());
  const toInputDT = s => String(s || nowLocal()).replace(' ', 'T').slice(0, 16);
  const parseD = s => { const p = String(s).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
  const addMonths = (s, n) => { const d = parseD(s); return ymd(new Date(d.getFullYear(), d.getMonth() + n, 1)); };
  const endOfMonth = s => { const d = parseD(s); return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
  const fmtTgl = s => { if (!s) return '-'; const d = parseD(s); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtTglPendek = s => { const d = parseD(s); return d.getDate() + ' ' + BLN[d.getMonth()]; };
  const fmtBulan = s => { const d = parseD(s); return BLN[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtHari = s => { const d = parseD(s); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); };
  const relDay = s => { const n = daysBetween(s, today()); return n === 0 ? 'Hari ini' : n === 1 ? 'Kemarin' : fmtHari(s); };
  const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15); return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const hexRgb = h => { h = String(h || '#94A3B8').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) || 0); };
  const tint = (hex, a) => { const c = hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const shadeHex = (hex, f) => '#' + hexRgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');
  const isDarkMode = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const ink = hex => { if (isDarkMode()) return hex; const c = hexRgb(hex); const l = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; return l > 0.6 ? shadeHex(hex, 0.6) : l > 0.45 ? shadeHex(hex, 0.78) : hex; };
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const debounce = (fn, ms) => { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); }; };
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const motionOK = () => pref.motion !== false && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pct = (a, b) => (b ? Math.max(0, Math.min(1, a / b)) : 0);

  // ── Penyimpanan lokal: HANYA preferensi tampilan & token sesi ──────────
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privat */ } }
  };
  const pref = Object.assign({ dark: false, motion: true, hide: false, lastPage: 'beranda' }, store.get('lapkeu_pref', {}));
  const savePref = () => store.set('lapkeu_pref', pref);
  function saveSession(token, remember) {
    try {
      (remember ? localStorage : sessionStorage).setItem('lapkeu_sess', token);
      (remember ? sessionStorage : localStorage).removeItem('lapkeu_sess');
    } catch (e) { /* abaikan */ }
  }
  function loadSession() { try { return sessionStorage.getItem('lapkeu_sess') || localStorage.getItem('lapkeu_sess'); } catch (e) { return null; } }
  function clearSession() { try { sessionStorage.removeItem('lapkeu_sess'); localStorage.removeItem('lapkeu_sess'); } catch (e) { /* abaikan */ } }

  // ════════════════════════════════════════════════════════════════════════
  //  1. STATE (di memori) & INDEKS
  // ════════════════════════════════════════════════════════════════════════
  const defMutasi = () => ({ q: '', periode: 'bulan', dari: '', sampai: '', dompet: '', kategori: '', jenis: '', privasi: '', page: 1 });
  const S = {
    token: null, remember: false, me: null, users: [], dompet: [], kategori: [], transaksi: [], tabungan: [], mutasiTabungan: [], tagihan: [],
    settings: {}, admin: null, page: 'beranda', pending: 0, mounted: {}, dirty: new Set(),
    f: {
      mutasi: defMutasi(), analisis: { periode: 'bulan', scope: 'semua' }, tagTab: 'belum', tagSort: 'tempo', tabTab: 'semua', katTab: 'Keluar',
      laporan: { preset: 'bulan', dari: '', sampai: '', dompet: '', kategori: '', jenis: '', privasi: '' }, adminTab: 'pengguna'
    }
  };
  const idx = { dompet: new Map(), kategori: new Map(), user: new Map(), tab: new Map(), saldo: new Map() };
  const charts = {};
  const countMem = {};
  const strukCache = new Map();     // struk yang sudah diunduh (memori sesi)
  const localStruk = new Map();     // struk baru yang belum tersinkron

  const cmpDesc = (a, b) => (b.tanggal < a.tanggal ? -1 : b.tanggal > a.tanggal ? 1 : String(b.tanggalInput || '').localeCompare(String(a.tanggalInput || '')));
  function reindex() {
    idx.dompet = new Map(S.dompet.map(d => [d.id, d]));
    idx.kategori = new Map(S.kategori.map(k => [k.id, k]));
    idx.user = new Map(S.users.map(u => [u.id, u]));
    idx.tab = new Map(S.tabungan.map(t => [t.id, t]));
    const m = new Map();
    S.dompet.forEach(d => m.set(d.id, (Number(d.saldoAwal) || 0) + (Number(d.hiddenNet) || 0)));
    S.transaksi.forEach(t => { if (m.has(t.dompetId)) m.set(t.dompetId, m.get(t.dompetId) + (t.jenis === 'Masuk' ? 1 : -1) * t.nominal); });
    idx.saldo = m;
    S.transaksi.sort(cmpDesc);
  }
  const NOKAT = { id: '', nama: 'Tanpa kategori', ikon: 'bi-question-circle', warna: '#94A3B8', jenis: '-', tipe: '-' };
  const kat = id => idx.kategori.get(id) || NOKAT;
  const dompetName = id => { const d = idx.dompet.get(id); return d ? d.nama : 'Dompet privat'; };
  const dompetColor = id => { const d = idx.dompet.get(id); return d ? d.warna : '#94A3B8'; };
  const userName = id => { if (S.me && id === S.me.id) return S.me.nama; const u = idx.user.get(id); return u ? u.nama : 'Anggota'; };
  const userObj = id => (S.me && id === S.me.id ? S.me : idx.user.get(id)) || { nama: 'Anggota', warna: '#94A3B8' };
  const isMine = x => S.me && x.pemilik === S.me.id;
  const isAdmin = () => S.me && S.me.peran === ADMIN;
  const isFlow = t => !SYS_SET.has(t.kategoriId);
  const saldoOf = d => idx.saldo.get(d.id) || 0;
  const activeDompet = () => S.dompet.filter(d => d.status !== 'Arsip');
  const firstName = () => String(S.me ? S.me.nama : '').split(' ')[0];
  const jenisIcon = j => ({ 'Cash': 'bi-cash-coin', 'Rekening Bank': 'bi-bank', 'E-Wallet': 'bi-phone' }[j] || 'bi-wallet2');

  function range(key, c) {
    const t = today(), first = t.slice(0, 8) + '01', d = parseD(t);
    c = c || {};
    switch (key) {
      case 'bulanlalu': { const f = addMonths(first, -1); return { dari: f, sampai: endOfMonth(f), label: BULAN[parseD(f).getMonth()] + ' ' + parseD(f).getFullYear() }; }
      case '7h': return { dari: addDays(t, -6), sampai: t, label: '7 hari terakhir' };
      case '30h': return { dari: addDays(t, -29), sampai: t, label: '30 hari terakhir' };
      case '3bulan': return { dari: addMonths(first, -2), sampai: endOfMonth(first), label: '3 bulan terakhir' };
      case '6bulan': return { dari: addMonths(first, -5), sampai: endOfMonth(first), label: '6 bulan terakhir' };
      case 'tahun': return { dari: d.getFullYear() + '-01-01', sampai: d.getFullYear() + '-12-31', label: 'Tahun ' + d.getFullYear() };
      case 'semua': return { dari: '0000-01-01', sampai: '9999-12-31', label: 'Semua waktu' };
      case 'kustom': { const a = c.dari || first, b = c.sampai || t; return { dari: a, sampai: b, label: fmtTgl(a) + ' – ' + fmtTgl(b) }; }
      default: return { dari: first, sampai: endOfMonth(first), label: BULAN[d.getMonth()] + ' ' + d.getFullYear() };
    }
  }
  const inRange = (t, r) => { const d = t.tanggal.slice(0, 10); return d >= r.dari && d <= r.sampai; };
  function flows(list) {
    let masuk = 0, keluar = 0;
    list.forEach(t => { if (!isFlow(t)) return; if (t.jenis === 'Masuk') masuk += t.nominal; else keluar += t.nominal; });
    return { masuk, keluar, net: masuk - keluar };
  }
  function byKategori(list) {
    const m = new Map();
    list.forEach(t => {
      if (!isFlow(t) || t.jenis !== 'Keluar') return;
      const e = m.get(t.kategoriId) || { id: t.kategoriId, total: 0, n: 0 };
      e.total += t.nominal; e.n++; m.set(t.kategoriId, e);
    });
    return Array.from(m.values()).map(e => Object.assign(e, { k: kat(e.id) })).sort((a, b) => b.total - a.total);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  2. API + ANTREAN SINKRON (optimistic)
  // ════════════════════════════════════════════════════════════════════════
  const API_TIMEOUT_MS = 150000;   // laporan besar bisa lama; GAS maksimal ±6 menit
  const gasUrl = () => String((window.LAPKEU_CONFIG && window.LAPKEU_CONFIG.GAS_URL) || '').trim();
  function assertUrl() {
    const u = gasUrl();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(u)) {
      throw new Error('GAS_URL belum diisi dengan benar. Edit js/config.js dan isi URL Web App berakhiran /exec.');
    }
    return u;
  }
  function netError(e) {
    if (e && e.name === 'AbortError') return new Error('Server terlalu lama menjawab. Coba lagi sebentar.');
    return new Error('Tidak dapat terhubung ke server. Periksa koneksi internet dan pastikan Web App sudah di-deploy (Execute as: Me, Access: Anyone).');
  }

  /** Panggil fungsi backend: POST { action, args } → { success, data, message, code }.
   *  Content-Type text/plain sengaja dipakai agar browser TIDAK mengirim preflight CORS (GAS tidak menjawabnya). */
  async function api(fn) {
    const args = Array.prototype.slice.call(arguments, 1);
    const url = assertUrl();
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    let text;
    try {
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: fn, args: args }), signal: ctrl.signal
      });
      text = await r.text();
    } catch (e) { throw netError(e); } finally { clearTimeout(timer); }
    let res = null;
    try { res = JSON.parse(text); } catch (e) { /* bukan JSON */ }
    if (!res) throw new Error('Respons server tidak valid. Pastikan Web App sudah di-deploy ulang dengan versi terbaru.');
    if (res.success) return res.data;
    const err = new Error(res.message || 'Terjadi kesalahan.'); err.code = res.code;
    if (res.code === 'AUTH') sessionExpired(res.message);
    throw err;
  }

  /** GET data publik (tanpa login): nama, warna, logo, status setup. */
  async function fetchPublicConfig() {
    const u = assertUrl();
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const r = await fetch(u + '?action=publicConfig', { cache: 'no-store', signal: ctrl.signal });
      const res = JSON.parse(await r.text());
      if (!res || !res.success) throw new Error((res && res.message) || 'Konfigurasi gagal dimuat.');
      return res.data;
    } catch (e) { throw (e instanceof SyntaxError ? new Error('Respons server tidak valid.') : (e.name === 'AbortError' || e instanceof TypeError ? netError(e) : e)); }
    finally { clearTimeout(timer); }
  }

  let queue = Promise.resolve();
  function enqueue(task) {
    S.pending++; updateSync();
    const p = queue.then(task).finally(() => { S.pending--; updateSync(); });
    queue = p.catch(() => {});
    return p;
  }
  function updateSync() {
    const el = $('#syncState');
    if (!el) return;
    el.hidden = S.pending === 0;
    $('#syncText').textContent = S.pending > 1 ? 'Menyimpan ' + S.pending + '…' : 'Menyimpan…';
  }

  /** Ubah state lokal (instan) → antre ke server → gagal? kembalikan. */
  function upsert(key, obj) {
    const arr = S[key], i = arr.findIndex(x => x.id === obj.id), old = i >= 0 ? arr[i] : null;
    if (i >= 0) arr[i] = obj; else arr.unshift(obj);
    return () => {
      const j = S[key].findIndex(x => x.id === obj.id);
      if (old) { if (j >= 0) S[key][j] = old; else S[key].push(old); } else if (j >= 0) S[key].splice(j, 1);
    };
  }
  function removeById(key, id) {
    const arr = S[key], i = arr.findIndex(x => x.id === id);
    if (i < 0) return () => {};
    const old = arr[i]; arr.splice(i, 1);
    return () => { if (!S[key].some(x => x.id === id)) S[key].push(old); };
  }
  const putServer = (key, obj) => { if (!obj) return; const i = S[key].findIndex(x => x.id === obj.id); if (i >= 0) S[key][i] = obj; else S[key].unshift(obj); };

  function mutate(opt) {
    const undos = opt.apply() || [];
    reindex(); refresh();
    if (opt.ok) toast(opt.ok, 'success');
    return enqueue(opt.call).then(res => {
      if (opt.done) opt.done(res);
      reindex(); refresh();
      return res;
    }).catch(err => {
      if (err.code === 'AUTH') return;
      undos.slice().reverse().forEach(u => u());
      if (opt.undo) opt.undo();
      reindex(); refresh();
      toast((opt.fail || 'Gagal menyimpan') + ': ' + err.message + ' Perubahan dibatalkan.', 'danger', 6500);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  3. UI DASAR: toast, modal, konfirmasi, tombol loading, animasi
  // ════════════════════════════════════════════════════════════════════════
  function toast(msg, type, ms) {
    type = type || 'success';
    const ico = { success: 'bi-check2-circle', danger: 'bi-exclamation-octagon', warning: 'bi-exclamation-triangle', info: 'bi-info-circle' }[type];
    const el = document.createElement('div');
    el.className = 'toast-x ' + type;
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    el.innerHTML = '<span class="t-ico"><i class="bi ' + ico + '"></i></span><span class="t-msg">' + esc(msg) + '</span><button type="button" class="t-close" aria-label="Tutup"><i class="bi bi-x-lg"></i></button>';
    const box = $('#toasts');
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
    el.querySelector('.t-close').onclick = close;
    setTimeout(close, ms || 3200);
  }
  const modal = id => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
  function hideModalAsync(el) {
    return new Promise(res => {
      if (!el || !el.classList.contains('show')) return res();
      el.addEventListener('hidden.bs.modal', () => res(), { once: true });
      const inst = bootstrap.Modal.getInstance(el); if (inst) inst.hide(); else res();
    });
  }
  async function showModal(id) {
    const open = document.querySelector('.modal.show');
    if (open && open.id !== id) await hideModalAsync(open);
    modal(id).show();
  }
  async function confirmBox(o) {
    const prev = document.querySelector('.modal.show');
    if (prev) await hideModalAsync(prev);
    return new Promise(resolve => {
      const el = $('#mConfirm'), ok = $('#cfOk');
      $('#cfTitle').textContent = o.title || 'Yakin?';
      $('#cfBody').textContent = o.body || '';
      ok.innerHTML = esc(o.ok || 'Hapus');
      ok.className = 'btn-x ' + (o.tone === 'primary' ? 'btn-primary-x' : 'btn-danger-x');
      $('#cfIcon').innerHTML = '<i class="bi ' + (o.icon || 'bi-exclamation-triangle') + '"></i>';
      let yes = false;
      ok.onclick = () => { yes = true; modal('mConfirm').hide(); };
      el.addEventListener('hidden.bs.modal', () => { resolve(yes); if (!yes && prev && o.reopen !== false) modal(prev.id).show(); }, { once: true });
      modal('mConfirm').show();
    });
  }
  async function withBtn(btn, fn) {
    if (!btn) return fn();
    const h = btn.innerHTML;
    btn.classList.add('is-loading'); btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Memproses…';
    try { return await fn(); } finally { btn.classList.remove('is-loading'); btn.disabled = false; btn.innerHTML = h; }
  }
  function runCounters(root) {
    $$('[data-count]', root).forEach(el => {
      const to = Number(el.dataset.count), key = el.dataset.key;
      const from = key && countMem[key] !== undefined ? countMem[key] : 0;
      if (key) countMem[key] = to;
      const fmt = v => el.dataset.fmt === 'rp' ? rp(v, el.dataset.sign === '1') : el.dataset.fmt === 'pct' ? Math.round(v) + '%' : fmtNum(v);
      if (!motionOK() || from === to) { el.textContent = fmt(to); return; }
      const t0 = performance.now(), dur = 750;
      const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('[data-w]', root).forEach(el => { el.style.width = el.dataset.w + '%'; });
      $$('[data-off]', root).forEach(el => { el.style.strokeDashoffset = el.dataset.off; });
    }));
  }
  function confetti() {
    if (!motionOK()) return;
    const box = document.createElement('div'); box.className = 'confetti';
    const cs = ['#12B886', '#7C5CFC', '#FF6B9D', '#FFB020', '#38BDF8', '#FF7A59'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw'; p.style.background = cs[i % cs.length];
      p.style.animationDelay = Math.random() * 0.5 + 's'; p.style.animationDuration = 1.4 + Math.random() * 1.2 + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3400);
  }
  function downloadB64(data, mime, name) {
    const bin = atob(data), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── Potongan HTML yang dipakai ulang ───────────────────────────────────
  const badgePriv = p => p === 'Privat'
    ? '<span class="pill badge-privat"><i class="bi bi-lock-fill"></i>Privat</span>'
    : '<span class="pill badge-bersama"><i class="bi bi-people-fill"></i>Bersama</span>';
  const tile = (icon, color, cls) => '<span class="tile ' + (cls || '') + '" style="background:' + tint(color, isDarkMode() ? 0.22 : 0.14) + ';color:' + ink(color) + '"><i class="bi ' + esc(icon) + '"></i></span>';
  const katTile = (k, cls) => tile(k.ikon, k.warna, cls);
  const avatar = (u, cls) => '<span class="avatar ' + (cls || '') + '" style="background:' + esc(u.warna || '#12B886') + '" title="' + esc(u.nama) + '">' + esc(initials(u.nama)) + '</span>';
  const empty = (title, sub, action) => '<div class="empty"><svg class="koin koin-sm koin-bob" aria-hidden="true"><use href="#koin"/></svg><h3>' + title + '</h3><p>' + sub + '</p>' + (action || '') + '</div>';
  const pageHead = o => '<div class="page-head"><div class="ph-left"><span class="ph-icon"><i class="bi ' + o.icon + '"></i></span><div class="min-w-0"><div class="ph-title-row"><h1 class="ph-title">' + o.title + '</h1>' + (o.chip || '') + '</div>' + (o.sub ? '<p class="ph-sub">' + o.sub + '</p>' : '') + '</div></div><div class="ph-actions">' + (o.actions || '') + '</div></div>';
  const kpi = o => '<div class="' + (o.col || 'col-6 col-xl-3') + '"><div class="card-x kpi h-100" style="--kc:' + o.color + ';--kbg:' + tint(o.color, 0.14) + '"><div class="kpi-head"><span class="small-label">' + o.label + '</span><span class="kpi-icon"><i class="bi ' + o.icon + '"></i></span></div><div class="kpi-value ' + (o.cls || '') + '"' + (o.count !== undefined ? ' data-count="' + o.count + '" data-fmt="' + (o.fmt || 'rp') + '" data-key="' + o.key + '"' + (o.sign ? ' data-sign="1"' : '') : '') + '>' + o.value + '</div><div class="kpi-foot">' + (o.foot || '') + '</div></div></div>';
  const ring = (p, color) => { const C = 2 * Math.PI * 30, off = C * (1 - Math.min(1, p)); return '<div class="ring" style="--rc:' + color + '"><svg viewBox="0 0 72 72" aria-hidden="true"><circle class="ring-bg" cx="36" cy="36" r="30" fill="none" stroke-width="7"/><circle class="ring-fg" cx="36" cy="36" r="30" fill="none" stroke-width="7" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '" data-off="' + off.toFixed(1) + '"/></svg><b>' + Math.round(p * 100) + '%</b></div>'; };
  const prog = (p, color) => '<div class="prog" role="progressbar" aria-valuenow="' + Math.round(p * 100) + '" aria-valuemin="0" aria-valuemax="100"><span style="--pc:' + (color || 'var(--c-primary)') + '" data-w="' + Math.round(p * 100) + '"></span></div>';
  const pendTag = '<span class="pend"><span class="spin"></span>Menyimpan…</span>';

  function trxView(t) {
    const k = kat(t.kategoriId);
    let title = t.catatan || k.nama, sub = t.catatan ? k.nama : '';
    let cls = t.jenis === 'Masuk' ? 'text-income' : 'text-expense', sign = t.jenis === 'Masuk' ? '+' : '-';
    if (t.kategoriId === SYS.TRANSFER) {
      const pair = S.transaksi.find(x => x.id === t.refId);
      title = 'Pindah Saldo';
      sub = t.jenis === 'Keluar' ? 'Ke ' + (pair ? dompetName(pair.dompetId) : 'dompet lain') : 'Dari ' + (pair ? dompetName(pair.dompetId) : 'dompet lain');
      if (t.catatan) sub += ' · ' + t.catatan;
      cls = 'text-2';
    } else if (t.kategoriId === SYS.TABUNGAN) { title = t.catatan || 'Tabungan'; sub = 'Tabungan'; cls = 'text-2'; }
    if (!isMine(t)) sub = 'oleh ' + userName(t.pemilik) + (sub ? ' · ' + sub : '');
    return { k: k, title: title, sub: sub, cls: cls, amt: sign + rp(t.nominal) };
  }
  function mItem(t, extra) {
    const v = trxView(t);
    return '<div class="mitem ' + (t._pending ? 'is-pending' : '') + '" data-trx="' + t.id + '" role="button" tabindex="0">' + katTile(v.k) +
      '<div class="mi-main"><div class="mi-title">' + esc(v.title) + '</div><div class="mi-sub">' + esc(v.sub || dompetName(t.dompetId)) + ' · ' + t.tanggal.slice(11, 16) + (t.privasi === 'Privat' ? ' · <i class="bi bi-lock-fill"></i>' : '') + '</div>' + pendTag + '</div>' +
      '<div class="mi-amt ' + v.cls + '">' + v.amt + (extra || '') + '</div></div>';
  }

  // ════════════════════════════════════════════════════════════════════════
  //  4. TEMA, MERK, PREFERENSI
  // ════════════════════════════════════════════════════════════════════════
  function effectiveColors() {
    const s = S.settings && S.settings.warnaUtama ? S.settings : { warnaUtama: PUB.warnaUtama, warnaAksen: PUB.warnaAksen, kustomisasi: PUB.kustomisasi };
    if (s.kustomisasi === 'Ya' && S.me && S.me.tema && S.me.tema.utama) return S.me.tema;
    return { utama: s.warnaUtama || '#12B886', aksen: s.warnaAksen || '#7C5CFC' };
  }
  function applyTheme(c) {
    c = c || effectiveColors();
    window.__applyColors(c.utama, c.aksen);
    pref.lastColors = c; savePref();
    chartDefaults();
  }
  function applyBrand() {
    const name = (S.settings && S.settings.nama) || PUB.nama || 'LAPKEU', tag = (S.settings && S.settings.tagline) || PUB.tagline || 'Keuangan Berdua';
    const logo = PUB.logo
      ? '<img src="' + esc(PUB.logo) + '" alt="Logo ' + esc(name) + '">'
      : '<i class="bi bi-wallet2" aria-hidden="true"></i>';
    $$('.brand-logo').forEach(el => { el.innerHTML = logo; el.classList.toggle('has-img', !!PUB.logo); });
    $$('.authName, #sbName, #splashName').forEach(el => { el.textContent = name; });
    $$('.authTag, #sbTag').forEach(el => { el.textContent = tag; });
    $('#sbVer').textContent = 'v' + (PUB.versi || '1.0.0');
    document.title = name + ' · ' + tag;
  }
  function setDark(on) {
    pref.dark = on; savePref();
    document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
    $('#ddDark').textContent = on ? 'Mode terang' : 'Mode gelap';
    chartDefaults(); rerenderCurrent();
  }
  function setHide(on) {
    pref.hide = on; savePref();
    document.body.classList.toggle('hide-amt', on);
    $('#ddHide').textContent = on ? 'Tampilkan saldo' : 'Sembunyikan saldo';
    $$('[data-action="toggle-hide"] i').forEach(i => { i.className = 'bi ' + (on ? 'bi-eye-slash' : 'bi-eye'); });
  }
  function setMotion(on) {
    pref.motion = on; savePref();
    document.documentElement.classList.toggle('reduce-motion', !on);
    chartDefaults();
  }
  function chartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Nunito Sans', system-ui, sans-serif";
    Chart.defaults.font.weight = 600;
    Chart.defaults.color = cssVar('--text-2') || '#6B7A8C';
    Chart.defaults.borderColor = cssVar('--border') || '#E3EFE9';
    Chart.defaults.animation = motionOK() ? { duration: 800, easing: 'easeOutQuart' } : false;
    Chart.defaults.maintainAspectRatio = false;
    const tt = Chart.defaults.plugins.tooltip;
    tt.backgroundColor = '#1F2A37'; tt.padding = 12; tt.cornerRadius = 12; tt.boxPadding = 5; tt.usePointStyle = true;
    tt.titleFont = { weight: 800 }; tt.bodyFont = { weight: 600 };
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
  }
  function mkChart(id, cfg) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    if (typeof Chart === 'undefined') { el.parentElement.innerHTML = '<div class="chart-fallback"><span><i class="bi bi-wifi-off d-block fs-3 mb-1"></i>Diagram tidak dapat dimuat. Periksa koneksi internet.</span></div>'; return null; }
    charts[id] = new Chart(el, cfg);
    return charts[id];
  }
  const tipRp0 = { callbacks: { label: c => ' ' + (c.dataset.label ? c.dataset.label + ': ' : '') + rp(c.parsed.y !== undefined && c.chart.config.type !== 'doughnut' ? (c.chart.options.indexAxis === 'y' ? c.parsed.x : c.parsed.y) : c.parsed) } };
  const axisRp0 = { ticks: { callback: v => rpShort(v) }, grid: { color: () => cssVar('--border') }, border: { display: false } };
  /* Objek opsi selalu baru per diagram (Chart.js dapat memodifikasi objek opsi) */
  const tipRp = () => ({ callbacks: Object.assign({}, tipRp0.callbacks) });
  const axisRp = () => ({ ticks: Object.assign({}, axisRp0.ticks), grid: Object.assign({}, axisRp0.grid), border: { display: false } });

  // ════════════════════════════════════════════════════════════════════════
  //  5. NAVIGASI SPA (tanpa URL, tanpa reload, aman di iframe)
  // ════════════════════════════════════════════════════════════════════════
  const RENDER = {};
  function buildNav() {
    const items = NAV.filter(n => !n[3] || isAdmin());
    $('#sbNav').innerHTML = items.map((n, i) => (n[0] === 'pengaturan' ? '<div class="sb-sep"></div>' : '') +
      '<button type="button" class="sb-link" data-go="' + n[0] + '" title="' + n[1] + '"><i class="bi ' + n[2] + '"></i><span>' + n[1] + '</span><span class="nav-badge" data-badge="' + n[0] + '" hidden></span></button>').join('');
    $('#menuGrid').innerHTML = items.map(n => '<button type="button" class="qa" data-go="' + n[0] + '" data-bs-dismiss="modal"><span class="qa-ico" style="background:rgba(var(--c-primary-rgb),.12);color:var(--c-primary-strong)"><i class="bi ' + n[2] + '"></i></span><b>' + n[1] + '</b></button>').join('') +
      '<button type="button" class="qa" data-action="toggle-dark"><span class="qa-ico" style="background:var(--privat-bg);color:var(--privat-fg)"><i class="bi bi-moon-stars"></i></span><b>Mode Gelap</b></button>' +
      '<button type="button" class="qa" data-action="logout" data-bs-dismiss="modal"><span class="qa-ico" style="background:var(--danger-bg);color:var(--c-expense-text)"><i class="bi bi-box-arrow-left"></i></span><b>Keluar</b></button>';
  }
  function go(page, opt) {
    opt = opt || {};
    const def = NAV.find(n => n[0] === page);
    if (!def || (def[3] && !isAdmin())) page = 'beranda';
    const changed = S.page !== page;
    S.page = page;
    $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === page));
    $$('[data-go]').forEach(b => { if (b.classList.contains('sb-link') || b.classList.contains('bn-item')) b.classList.toggle('active', b.dataset.go === page); });
    $('#tbTitle').textContent = (NAV.find(n => n[0] === page) || NAV[0])[1];
    if (opt.force || S.dirty.has(page) || !S.mounted[page]) renderPage(page);
    if (changed) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    pref.lastPage = page; savePref();
  }
  function renderPage(page) {
    const el = $('#page-' + page);
    if (!el || !RENDER[page]) return;
    const first = !S.mounted[page];
    RENDER[page](el, first);
    S.mounted[page] = true;
    S.dirty.delete(page);
    runCounters(el);
  }
  function rerenderCurrent() { S.dirty.add(S.page); renderPage(S.page); }
  let rafRefresh = 0;
  /** Setelah data berubah: tandai semua halaman kotor, render halaman aktif saja. */
  function refresh() {
    if (rafRefresh) return;
    rafRefresh = requestAnimationFrame(() => {
      rafRefresh = 0;
      Object.keys(RENDER).forEach(p => S.dirty.add(p));
      if (!FORM_PAGES.has(S.page)) renderPage(S.page);
      else if (S.page === 'admin' && S.mounted.admin) updAdminLists();
      else if (S.page === 'laporan' && S.mounted.laporan) updLaporan();
      updateGlobal();
    });
  }
  function gotoMutasi(patch) {
    S.f.mutasi = Object.assign(defMutasi(), patch || {});
    S.dirty.add('mutasi');
    go('mutasi');
  }

  // ── Elemen global: badge, notifikasi, profil di topbar ─────────────────
  function urgentBills() {
    const t = today();
    return S.tagihan.filter(b => b.lunas !== 'Lunas' && daysBetween(t, b.jatuhTempo) <= 7);
  }
  function updateGlobal() {
    if (!S.me) return;
    const u = S.me;
    $('#tbAvatar').textContent = initials(u.nama); $('#tbAvatar').style.background = u.warna;
    $('#tbName').textContent = u.nama; $('#tbRole').textContent = u.peran === ADMIN ? 'Super Admin' : 'Pengguna';
    $('#ddName').textContent = u.nama; $('#ddEmail').textContent = u.email;
    const nToday = S.transaksi.filter(x => x.tanggal.slice(0, 10) === today()).length;
    const bills = urgentBills();
    $$('[data-badge="mutasi"]').forEach(b => { b.hidden = !nToday; b.textContent = nToday; });
    $$('[data-badge="tagihan"]').forEach(b => { b.hidden = !bills.length; b.textContent = bills.length; b.classList.add('warn'); });
    // Notifikasi
    const t = today(), items = [];
    bills.sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo)).forEach(b => {
      const d = daysBetween(t, b.jatuhTempo), u2 = urgency(d);
      items.push('<div class="notif-item" data-action="bayar" data-id="' + b.id + '">' + tile(b.ikon || 'bi-receipt', u2.color) + '<div class="min-w-0"><b>' + esc(b.nama) + ' · ' + rp(b.nominal) + '</b><small>' + u2.text + ' — jatuh tempo ' + fmtTgl(b.jatuhTempo) + '</small></div></div>');
    });
    S.tabungan.filter(g => g.saldo >= g.target && g.target > 0).slice(0, 3).forEach(g => {
      items.push('<div class="notif-item" data-go="tabungan">' + tile('bi-trophy', '#FFB020') + '<div><b>Target tercapai: ' + esc(g.nama) + '</b><small>Hebat! ' + rp(g.saldo) + ' sudah terkumpul.</small></div></div>');
    });
    const ang = Number(u.anggaran) || 0;
    if (ang) {
      const k = flows(S.transaksi.filter(x => inRange(x, range('bulan')))).keluar;
      if (k >= ang * 0.9) items.unshift('<div class="notif-item" data-go="analisis">' + tile('bi-exclamation-triangle', '#FF7A59') + '<div><b>' + (k > ang ? 'Anggaran terlampaui' : 'Anggaran hampir habis') + '</b><small>Terpakai ' + Math.round(k / ang * 100) + '% dari ' + rp(ang) + ' bulan ini.</small></div></div>');
    }
    $('#notifDot').hidden = !items.length;
    $('#notifMenu').innerHTML = '<div class="d-flex justify-content-between align-items-center px-2 py-1 mb-1"><b class="font-head">Notifikasi</b><span class="pill">' + items.length + '</span></div>' +
      (items.length ? items.join('') : '<div class="text-center text-2 py-4"><svg class="koin koin-xs"><use href="#koin"/></svg><div class="mt-2 small fw-bold">Semua aman! Tidak ada pengingat.</div></div>');
  }
  function urgency(d) {
    if (d < 0) return { text: 'Terlambat ' + Math.abs(d) + ' hari', cls: 'pill-danger', color: '#FF7A59' };
    if (d === 0) return { text: 'Hari ini', cls: 'pill-danger', color: '#FF7A59' };
    if (d === 1) return { text: 'Mendesak (H-1)', cls: 'pill-danger', color: '#FF7A59' };
    if (d <= 3) return { text: 'Mendekati (H-' + d + ')', cls: 'pill-warn', color: '#FFB020' };
    if (d <= 7) return { text: 'Akan datang (H-' + d + ')', cls: 'pill-info', color: '#38BDF8' };
    return { text: 'H-' + d, cls: '', color: '#7C5CFC' };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  6. HALAMAN: BERANDA
  // ════════════════════════════════════════════════════════════════════════
  RENDER.beranda = function (el) {
    const r = range('bulan'), rl = range('bulanlalu'), t0 = today();
    const mon = S.transaksi.filter(t => inRange(t, r)), lm = S.transaksi.filter(t => inRange(t, rl));
    const cur = flows(mon), prev = flows(lm);
    const dompet = activeDompet();
    const total = dompet.reduce((a, d) => a + saldoOf(d), 0);
    const netAllMonth = mon.filter(t => idx.dompet.has(t.dompetId)).reduce((a, t) => a + (t.jenis === 'Masuk' ? 1 : -1) * t.nominal, 0);
    const prevTotal = total - netAllMonth;
    const growth = prevTotal ? (total - prevTotal) / Math.abs(prevTotal) * 100 : 0;
    const h = new Date().getHours();
    const salam = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
    const ang = Number(S.me.anggaran) || 0;
    let status = cur.net >= 0 ? ['bi-emoji-smile', 'Arus Kas Positif'] : ['bi-emoji-neutral', 'Arus Kas Minus'];
    if (ang) status = cur.keluar <= ang * 0.7 ? ['bi-check2-circle', 'Anggaran Aman'] : cur.keluar <= ang ? ['bi-exclamation-circle', 'Waspada Anggaran'] : ['bi-exclamation-triangle', 'Melebihi Anggaran'];
    let insight = 'Yuk catat pengeluaran hari ini supaya pola keuanganmu makin jelas.';
    if (prev.keluar > 0 && mon.length) {
      const dd = Math.round((cur.keluar - prev.keluar) / prev.keluar * 100);
      insight = dd <= 0 ? 'Pengeluaran bulan ini ' + Math.abs(dd) + '% lebih hemat dibanding bulan lalu. Pertahankan!' : 'Pengeluaran bulan ini sudah ' + dd + '% dari bulan lalu — pantau kategori terbesar ya.';
      if (dd > 0) insight = 'Pengeluaran bulan ini naik ' + dd + '% dibanding bulan lalu. Cek kategori terbesar di bawah ya.';
    } else if (cur.net > 0) insight = 'Keuangan bulan ini sehat: pemasukan masih di atas pengeluaran. Saatnya sisihkan untuk tabungan!';
    const nDue = urgentBills().length;
    const qa = [
      ['bi-piggy-bank', '#12B886', '+ Pemasukan', 'Gaji & Bonus', 'data-action="trx" data-jenis="Masuk"', 'Masuk'],
      ['bi-bag', '#FF7A59', '+ Pengeluaran', 'Jajan, Belanja', 'data-action="trx" data-jenis="Keluar"', 'Keluar'],
      ['bi-arrow-left-right', '#38BDF8', 'Pindah Saldo', 'Antar Dompet', 'data-action="trx" data-jenis="Transfer"', 'Pindah'],
      ['bi-receipt', '#FFB020', 'Bayar Tagihan', nDue + ' Jatuh Tempo', 'data-go="tagihan"', 'Tagihan'],
      ['bi-stars', '#7C5CFC', 'Setor Tabungan', 'Pos Impian', 'data-go="tabungan"', 'Tabung']
    ];
    const wallets = dompet.slice().sort((a, b) => saldoOf(b) - saldoOf(a)).map(d =>
      '<button type="button" class="wallet-card" data-action="dompet-mutasi" data-id="' + d.id + '"><div class="wc-top">' + tile(jenisIcon(d.jenis), d.warna, 'tile-sm') +
      '<span class="wc-name">' + esc(d.nama) + '</span></div><div class="d-flex justify-content-between align-items-center mb-1 gap-2"><small class="text-2 fw-bold">' + (d.jenis === 'Cash' ? 'Uang Kas Fisik' : d.privasi === 'Privat' ? 'Saldo Pribadi' : 'Saldo Tersedia') + '</small>' + badgePriv(d.privasi) + '</div><div class="wc-amt amt">' + rp(saldoOf(d)) + '</div></button>').join('');
    const kats = byKategori(mon);
    const totalK = kats.reduce((a, x) => a + x.total, 0);
    const top = kats.slice(0, 5);
    if (kats.length > 5) top.push({ id: '__lain', total: kats.slice(5).reduce((a, x) => a + x.total, 0), k: { nama: 'Lainnya', warna: '#94A3B8' } });
    const bills = S.tagihan.filter(b => b.lunas !== 'Lunas').sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo)).slice(0, 3);
    const goals = S.tabungan.filter(g => g.status !== 'Selesai').sort((a, b) => pct(b.saldo, b.target) - pct(a.saldo, a.target)).slice(0, 3);
    const recent = S.transaksi.slice(0, 5);
    const pendingBills = S.tagihan.filter(b => b.lunas !== 'Lunas').length;

    el.innerHTML = '<div class="anim-in">' +
      '<div class="hero mb-3"><div class="hero-chips"><span class="pill pill-glass pill-dot" style="--dot:#fff">Finansial Harmonis · ' + BULAN[new Date().getMonth()] + ' ' + new Date().getFullYear() + '</span><span class="pill pill-sunny"><i class="bi ' + status[0] + '"></i>' + status[1] + '</span></div>' +
      '<h2 class="hero-greet">' + salam + ', ' + esc(firstName()) + '!</h2><p class="hero-text">' + insight + '</p>' +
      '<div class="hero-label">Total Saldo Tergabung <button type="button" data-action="toggle-hide" aria-label="Sembunyikan atau tampilkan saldo"><i class="bi ' + (pref.hide ? 'bi-eye-slash' : 'bi-eye') + '"></i></button></div>' +
      '<div class="hero-total"><span class="amt" data-count="' + total + '" data-fmt="rp" data-key="heroTotal">' + rp(total) + '</span>' +
      (prevTotal ? '<span class="pill pill-glass"><i class="bi ' + (growth >= 0 ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow') + '"></i>' + (growth >= 0 ? '+' : '') + growth.toFixed(1).replace('.', ',') + '% vs bulan lalu</span>' : '') + '</div>' +
      '<div class="hero-tiles"><button type="button" class="glass" data-action="trx" data-jenis="Masuk"><span class="g-ico"><i class="bi bi-arrow-down-left"></i></span><span class="min-w-0"><small>Pemasukan Bulan Ini</small><b class="amt" data-count="' + cur.masuk + '" data-fmt="rp" data-key="heroIn">' + rp(cur.masuk) + '</b></span><i class="bi bi-plus-circle ms-auto"></i></button>' +
      '<button type="button" class="glass" data-action="trx" data-jenis="Keluar"><span class="g-ico"><i class="bi bi-arrow-up-right"></i></span><span class="min-w-0"><small>Pengeluaran Bulan Ini</small><b class="amt" data-count="' + cur.keluar + '" data-fmt="rp" data-key="heroOut">' + rp(cur.keluar) + '</b></span><i class="bi bi-dash-circle ms-auto"></i></button></div>' +
      '<div class="hero-mascot" aria-hidden="true"><svg class="koin koin-lg koin-wave"><use href="#koin"/></svg><svg class="sparkle" style="top:-6px;right:-4px;width:22px;height:22px"><use href="#sparkle"/></svg><svg class="sparkle" style="bottom:4px;left:-10px;width:14px;height:14px;animation-delay:1s"><use href="#sparkle"/></svg></div></div>' +

      '<div class="qa-grid mb-4">' + qa.map(q => '<button type="button" class="qa" ' + q[4] + '><span class="qa-ico" style="background:' + tint(q[1], 0.15) + ';color:' + ink(q[1]) + '"><i class="bi ' + q[0] + '"></i></span><b><span class="lbl-short">' + q[5] + '</span><span class="lbl-long">' + q[2] + '</span></b><small>' + q[3] + '</small></button>').join('') + '</div>' +

      '<div class="d-flex justify-content-between align-items-center mb-2"><h3 class="section-title"><i class="bi bi-wallet2"></i>Dompet &amp; Rekening Aktif</h3><button type="button" class="link-x" data-go="dompet">Kelola Semua <i class="bi bi-chevron-right"></i></button></div>' +
      '<div class="scroll-x mb-3">' + wallets + '<button type="button" class="wallet-card add" data-action="dompet-new"><span><i class="bi bi-plus-circle fs-3"></i><b class="d-block mt-1">+ Dompet Baru</b><small class="text-2">E-wallet / Bank</small></span></button></div>' +

      '<div class="row g-3">' +
      '<div class="col-lg-5"><div class="card-x h-100"><div class="card-head"><div><h3 class="card-title">Kategori Pengeluaran</h3><p class="card-sub">Total alokasi ' + r.label + '</p></div><span class="pill pill-info">Bulan Ini</span></div>' +
      (kats.length ? '<div class="donut-wrap"><canvas id="chHomeDonut" aria-label="Diagram kategori pengeluaran"></canvas><div class="donut-center"><div><small>Total Keluar</small><b>' + rp(totalK).replace('Rp ', 'Rp ') + '</b><small style="color:var(--c-accent)">' + kats.length + ' Kategori</small></div></div></div>' +
        '<div class="legend-grid">' + top.slice(0, 4).map(x => '<button type="button" class="legend-item" ' + (x.id !== '__lain' ? 'data-action="drill-kat" data-id="' + x.id + '" data-range="bulan"' : '') + '><span class="dot" style="background:' + x.k.warna + '"></span><span class="min-w-0"><b>' + esc(x.k.nama) + ' (' + Math.round(x.total / totalK * 100) + '%)</b><span class="text-2">' + rp(x.total) + '</span></span></button>').join('') + '</div>'
        : empty('Belum ada pengeluaran', 'Pengeluaran bulan ini akan tampil sebagai diagram di sini.', '<button type="button" class="btn-x btn-primary-x" data-action="trx" data-jenis="Keluar"><i class="bi bi-plus-lg"></i>Catat Pengeluaran</button>')) + '</div></div>' +
      '<div class="col-lg-7"><div class="card-x h-100"><div class="card-head"><div><h3 class="card-title">Tren Pengeluaran 6 Bulan</h3><p class="card-sub">' + (ang ? 'Garis kuning = batas anggaran bulanan (' + rpShort(ang) + ')' : 'Klik batang untuk melihat detail bulan tersebut') + '</p></div></div>' +
      '<div class="chart-box"><canvas id="chHomeTren" aria-label="Diagram tren pengeluaran 6 bulan"></canvas></div>' +
      (ang ? '<div class="insight-bar ' + (cur.keluar > ang ? 'warn' : '') + '"><i class="bi ' + (cur.keluar > ang ? 'bi-exclamation-triangle' : 'bi-hand-thumbs-up') + '"></i><span class="flex-grow-1">' + (cur.keluar > ang ? 'Melebihi anggaran ' + rp(cur.keluar - ang) + ' bulan ini.' : 'Hemat ' + rp(ang - cur.keluar) + ' dari batas maksimal anggaran bulan ini!') + '</span><button type="button" class="link-x" data-go="analisis">Detail <i class="bi bi-arrow-right"></i></button></div>'
        : '<div class="insight-bar"><i class="bi bi-lightbulb"></i><span class="flex-grow-1">Atur anggaran bulanan agar Koin bisa mengingatkan saat pengeluaran mendekati batas.</span><button type="button" class="link-x" data-go="pengaturan">Atur <i class="bi bi-arrow-right"></i></button></div>') + '</div></div>' +
      '</div>' +

      '<div class="row g-3 mt-1">' +
      '<div class="col-lg-4"><div class="card-x h-100 d-flex flex-column"><div class="card-head"><h3 class="card-title">' + tile('bi-calendar2-check', '#FFB020') + 'Tagihan Mendatang</h3>' + (pendingBills ? '<span class="pill pill-danger">' + pendingBills + ' Menanti</span>' : '') + '</div>' +
      (bills.length ? bills.map(b => { const d = daysBetween(t0, b.jatuhTempo), u = urgency(d); return '<div class="list-row" role="button" tabindex="0" data-action="bayar" data-id="' + b.id + '">' + tile(b.ikon || 'bi-receipt', u.color) + '<div class="lr-main"><div class="lr-title">' + esc(b.nama) + '</div><div class="lr-sub">' + esc(b.dompetId ? dompetName(b.dompetId) : (b.berulang === 'Ya' ? 'Rutin ' + b.periode : 'Sekali bayar')) + '</div></div><div class="lr-end"><b class="d-block amt">' + rp(b.nominal) + '</b><span class="pill ' + u.cls + '">' + u.text + '</span></div></div>'; }).join('')
        : empty('Tidak ada tagihan', 'Semua tagihan sudah lunas. Tambahkan tagihan rutin agar diingatkan otomatis.')) +
      '<button type="button" class="btn-x btn-primary-x btn-block mt-auto" data-go="tagihan"><i class="bi bi-check2-circle"></i>Kelola Tagihan</button></div></div>' +
      '<div class="col-lg-4"><div class="card-x h-100 d-flex flex-column"><div class="card-head"><h3 class="card-title">' + tile('bi-flag', '#12B886') + 'Target Tabungan</h3><button type="button" class="link-x" data-action="tab-new">+ Baru</button></div>' +
      (goals.length ? goals.map(g => { const p = pct(g.saldo, g.target); return '<div class="list-row d-block" role="button" tabindex="0" data-go="tabungan"><div class="d-flex justify-content-between gap-2 mb-2"><b class="text-truncate">' + esc(g.nama) + '</b><b class="text-income">' + Math.round(p * 100) + '%</b></div>' + prog(p, p >= 1 ? '#FFB020' : g.warna) + '<div class="d-flex justify-content-between mt-2 small text-2 fw-bold"><span class="amt">' + rp(g.saldo) + ' terkumpul</span><span>Target: ' + rpShort(g.target) + '</span></div></div>'; }).join('')
        : empty('Belum ada impian', 'Buat pos tabungan pertama kalian, misalnya dana nikah atau liburan.')) +
      '<div class="d-flex justify-content-between align-items-center mt-auto pt-2 small text-2 fw-bold"><span>' + S.tabungan.length + ' pos aktif berjalan</span><button type="button" class="link-x" data-go="tabungan">Kelola Pos Tabungan <i class="bi bi-arrow-right"></i></button></div></div></div>' +
      '<div class="col-lg-4"><div class="card-x h-100 d-flex flex-column"><div class="card-head"><h3 class="card-title">' + tile('bi-clock-history', '#7C5CFC') + 'Aktivitas Terkini</h3><button type="button" class="link-x" data-go="mutasi">Lihat Semua</button></div>' +
      (recent.length ? recent.map(t => { const v = trxView(t); return '<div class="act-row ' + (t._pending ? 'is-pending' : '') + '" data-trx="' + t.id + '" role="button" tabindex="0">' + katTile(v.k, 'tile-sm') + '<div class="flex-grow-1 min-w-0"><div class="fw-bold text-truncate small">' + esc(v.title) + '</div><div class="text-2 text-truncate" style="font-size:12px">' + relDay(t.tanggal) + ', ' + t.tanggal.slice(11, 16) + ' · ' + esc(dompetName(t.dompetId)) + '</div>' + pendTag + '</div><b class="small ' + v.cls + ' text-nowrap">' + v.amt + '</b></div>'; }).join('')
        : empty('Belum ada aktivitas', 'Transaksi terbaru akan muncul di sini.')) +
      '<div class="d-flex justify-content-between align-items-center mt-auto pt-3 small text-2 fw-bold border-top"><span><i class="bi bi-cloud-check"></i> Sinkron otomatis</span><button type="button" class="link-x" data-action="refresh"><i class="bi bi-arrow-clockwise"></i>Muat Ulang</button></div></div></div>' +
      '</div></div>';

    // Diagram
    if (kats.length) {
      mkChart('chHomeDonut', {
        type: 'doughnut',
        data: { labels: top.map(x => x.k.nama), datasets: [{ data: top.map(x => x.total), backgroundColor: top.map(x => x.k.warna), borderColor: cssVar('--surface'), borderWidth: 4, hoverOffset: 10, borderRadius: 6 }] },
        options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: tipRp() }, onClick: (e, els) => { if (els.length && top[els[0].index].id !== '__lain') drillKat(top[els[0].index].id, 'bulan'); }, onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; } }
      });
    }
    const months = [];
    for (let i = 5; i >= 0; i--) months.push(addMonths(r.dari, -i).slice(0, 7));
    const perM = {};
    S.transaksi.forEach(t => { if (isFlow(t) && t.jenis === 'Keluar') { const m = t.tanggal.slice(0, 7); perM[m] = (perM[m] || 0) + t.nominal; } });
    const prim = cssVar('--c-primary'), acc = cssVar('--c-accent');
    const ds = [{ label: 'Pengeluaran', data: months.map(m => perM[m] || 0), backgroundColor: months.map((m, i) => (i === 5 ? acc : tint(prim, 0.38))), hoverBackgroundColor: months.map((m, i) => (i === 5 ? acc : prim)), borderRadius: 12, borderSkipped: false, maxBarThickness: 58, order: 2 }];
    if (ang) ds.push({ type: 'line', label: 'Anggaran', data: months.map(() => ang), borderColor: '#FFB020', borderDash: [6, 6], borderWidth: 2, pointRadius: 0, order: 1 });
    mkChart('chHomeTren', {
      type: 'bar', data: { labels: months.map(m => BLN[Number(m.slice(5)) - 1]), datasets: ds },
      options: {
        plugins: { legend: { display: false }, tooltip: tipRp() }, scales: { y: Object.assign({ beginAtZero: true }, axisRp()), x: { grid: { display: false }, border: { display: false } } },
        onClick: (e, els) => { if (els.length) { const m = months[els[0].index]; drill('Pengeluaran ' + BULAN[Number(m.slice(5)) - 1] + ' ' + m.slice(0, 4), 'Semua kategori', t => isFlow(t) && t.jenis === 'Keluar' && t.tanggal.slice(0, 7) === m, { periode: 'kustom', dari: m + '-01', sampai: endOfMonth(m + '-01'), jenis: 'Keluar' }); } },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
      }
    });
  };

  // ════════════════════════════════════════════════════════════════════════
  //  7. HALAMAN: DOMPET
  // ════════════════════════════════════════════════════════════════════════
  RENDER.dompet = function (el) {
    const act = activeDompet(), arsip = S.dompet.filter(d => d.status === 'Arsip');
    const r = range('bulan');
    const flowBy = {};
    S.transaksi.forEach(t => { if (!inRange(t, r)) return; const f = flowBy[t.dompetId] || (flowBy[t.dompetId] = { m: 0, k: 0 }); if (t.jenis === 'Masuk') f.m += t.nominal; else f.k += t.nominal; });
    const total = act.reduce((a, d) => a + saldoOf(d), 0);
    const shared = act.filter(d => d.privasi === 'Bersama').reduce((a, d) => a + saldoOf(d), 0);
    const priv = act.filter(d => d.privasi === 'Privat').reduce((a, d) => a + saldoOf(d), 0);
    const card = d => {
      const f = flowBy[d.id] || { m: 0, k: 0 }, owner = userObj(d.pemilik);
      return '<div class="col-md-6 col-xl-4"><div class="card-x wallet-big ' + (d.status === 'Arsip' ? 'archived' : '') + '">' +
        '<div class="d-flex align-items-center gap-3">' + tile(jenisIcon(d.jenis), d.warna, 'tile-lg') + '<div class="flex-grow-1 min-w-0"><b class="d-block text-truncate">' + esc(d.nama) + '</b><small class="text-2">' + esc(d.jenis) + ' · ' + (isMine(d) ? 'Milikmu' : 'Milik ' + esc(owner.nama)) + '</small></div>' + badgePriv(d.privasi) + '</div>' +
        '<div><span class="small-label">Saldo saat ini</span><div class="wb-amt amt ' + (saldoOf(d) < 0 ? 'text-expense' : '') + '">' + rp(saldoOf(d)) + '</div></div>' +
        '<div class="wb-flow"><div>Masuk bulan ini<b class="text-income amt">+' + rp(f.m) + '</b></div><div>Keluar bulan ini<b class="text-expense amt">-' + rp(f.k) + '</b></div></div>' +
        '<div class="d-flex gap-2 mt-auto"><button type="button" class="btn-x btn-tint-x btn-sm-x flex-grow-1" data-action="dompet-mutasi" data-id="' + d.id + '"><i class="bi bi-receipt"></i>Lihat Mutasi</button>' +
        (isMine(d) ? '<button type="button" class="btn-x btn-soft-x btn-sm-x" data-action="dompet-edit" data-id="' + d.id + '" aria-label="Ubah dompet ' + esc(d.nama) + '"><i class="bi bi-pencil"></i>Ubah</button>' : '') + '</div></div></div>';
    };
    el.innerHTML = pageHead({ icon: 'bi-wallet2', title: 'Dompet &amp; Rekening', chip: '<span class="pill pill-ok pill-dot" style="--dot:var(--c-income)">' + act.length + ' Dompet Aktif</span>', sub: 'Uang tunai, rekening bank, dan e-wallet kalian dalam satu tempat. Saldo dihitung otomatis dari transaksi.', actions: '<button type="button" class="btn-x btn-primary-x" data-action="dompet-new"><i class="bi bi-plus-circle"></i>Dompet Baru</button>' }) +
      '<div class="row g-3 mb-3 anim-in">' +
      kpi({ col: 'col-12 col-md-4', label: 'Total Saldo', icon: 'bi-safe2', color: '#12B886', value: rp(total), count: total, key: 'dpTotal', cls: 'amt', foot: 'Semua dompet yang bisa kamu lihat' }) +
      kpi({ col: 'col-6 col-md-4', label: 'Saldo Bersama', icon: 'bi-people', color: '#38BDF8', value: rp(shared), count: shared, key: 'dpShared', cls: 'amt', foot: act.filter(d => d.privasi === 'Bersama').length + ' dompet bersama' }) +
      kpi({ col: 'col-6 col-md-4', label: 'Saldo Privat', icon: 'bi-lock', color: '#7C5CFC', value: rp(priv), count: priv, key: 'dpPriv', cls: 'amt', foot: 'Hanya terlihat olehmu' }) + '</div>' +
      (act.length ? '<div class="row g-3 anim-in">' + act.sort((a, b) => saldoOf(b) - saldoOf(a)).map(card).join('') +
        '<div class="col-md-6 col-xl-4"><button type="button" class="card-x add-card w-100 h-100" data-action="dompet-new"><i class="bi bi-plus-circle fs-2 text-2"></i><b>Tambah Dompet</b><small class="text-2">Cash, rekening bank, e-wallet, atau jenis lain</small></button></div></div>'
        : '<div class="card-x">' + empty('Belum ada dompet', 'Tambahkan dompet pertama: uang tunai, rekening bank, atau e-wallet.', '<button type="button" class="btn-x btn-primary-x" data-action="dompet-new"><i class="bi bi-plus-lg"></i>Tambah Dompet</button>') + '</div>') +
      (arsip.length ? '<details class="mt-4"><summary class="section-title mb-3" style="cursor:pointer"><i class="bi bi-archive"></i>Diarsipkan (' + arsip.length + ')</summary><div class="row g-3">' + arsip.map(card).join('') + '</div></details>' : '');
  };

  // ════════════════════════════════════════════════════════════════════════
  //  8. HALAMAN: MUTASI (filter lokal instan + paginasi + saldo berjalan)
  // ════════════════════════════════════════════════════════════════════════
  RENDER.mutasi = function (el, first) {
    if (first) {
      el.innerHTML = '<div id="mtHead"></div><div class="row g-3 mb-3" id="mtKpi"></div>' +
        '<div class="card-x filter-card mb-3"><div class="filter-grid">' +
        '<div class="fg-search input-icon"><i class="bi bi-search"></i><input type="search" class="form-control" id="fQ" placeholder="Cari catatan, tag, merchant…" aria-label="Cari transaksi" autocomplete="off"></div>' +
        '<select class="form-select" id="fPeriode" aria-label="Periode"><option value="bulan">Bulan Ini</option><option value="bulanlalu">Bulan Lalu</option><option value="7h">7 Hari</option><option value="30h">30 Hari</option><option value="3bulan">3 Bulan</option><option value="tahun">Tahun Ini</option><option value="semua">Semua Waktu</option><option value="kustom">Pilih Tanggal…</option></select>' +
        '<select class="form-select" id="fDompet" aria-label="Dompet"></select><select class="form-select" id="fKategori" aria-label="Kategori"></select>' +
        '<select class="form-select" id="fJenis" aria-label="Jenis"><option value="">Semua Jenis</option><option value="Masuk">Pemasukan</option><option value="Keluar">Pengeluaran</option><option value="Transfer">Pindah Saldo</option><option value="Tabungan">Tabungan</option></select>' +
        '<select class="form-select" id="fPrivasi" aria-label="Visibilitas"><option value="">Bersama &amp; Privat</option><option value="Bersama">Bersama</option><option value="Privat">Privat</option></select></div>' +
        '<div class="row g-2 mt-1" id="fCustom" hidden><div class="col-6"><label class="form-label small" for="fDari">Dari</label><input type="date" class="form-control" id="fDari"></div><div class="col-6"><label class="form-label small" for="fSampai">Sampai</label><input type="date" class="form-control" id="fSampai"></div></div>' +
        '<div class="chips-row" id="fChips"></div></div>' +
        '<div class="card-x p-0 overflow-hidden"><div class="tbl-wrap has-mlist"><table class="tbl"><thead id="mtThead"></thead><tbody id="mtBody"></tbody></table></div><div class="mlist px-3 pt-1" id="mtList"></div><div class="px-3 pb-3" id="mtPager"></div></div>';
      const f = () => S.f.mutasi;
      $('#fQ', el).addEventListener('input', debounce(e => { f().q = e.target.value; f().page = 1; updMutasi(); }, 180));
      ['fPeriode', 'fDompet', 'fKategori', 'fJenis', 'fPrivasi', 'fDari', 'fSampai'].forEach(id => $('#' + id, el).addEventListener('change', e => {
        const map = { fPeriode: 'periode', fDompet: 'dompet', fKategori: 'kategori', fJenis: 'jenis', fPrivasi: 'privasi', fDari: 'dari', fSampai: 'sampai' };
        f()[map[id]] = e.target.value; f().page = 1;
        if (id === 'fPeriode' && e.target.value === 'kustom' && !f().dari) { f().dari = today().slice(0, 8) + '01'; f().sampai = today(); }
        updMutasi();
      }));
    }
    updMutasi();
  };
  function mutasiList() {
    const f = S.f.mutasi, r = range(f.periode, f), q = f.q.trim().toLowerCase();
    return S.transaksi.filter(t => {
      if (!inRange(t, r)) return false;
      if (f.dompet && t.dompetId !== f.dompet) return false;
      if (f.kategori && t.kategoriId !== f.kategori) return false;
      if (f.privasi && t.privasi !== f.privasi) return false;
      if (f.jenis === 'Transfer' && t.kategoriId !== SYS.TRANSFER) return false;
      if (f.jenis === 'Tabungan' && t.kategoriId !== SYS.TABUNGAN) return false;
      if ((f.jenis === 'Masuk' || f.jenis === 'Keluar') && (t.jenis !== f.jenis || !isFlow(t))) return false;
      if (q) {
        const hay = (t.catatan + ' ' + kat(t.kategoriId).nama + ' ' + dompetName(t.dompetId) + ' ' + userName(t.pemilik) + ' ' + t.nominal).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function fillSelect(sel, opts, val) {
    sel.innerHTML = opts.map(o => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>').join('');
    sel.value = val || '';
    if (sel.value !== (val || '')) sel.value = '';
  }
  function updMutasi() {
    const el = $('#page-mutasi');
    if (!el || !$('#mtKpi', el)) return;
    const f = S.f.mutasi, r = range(f.periode, f);
    const nMonth = S.transaksi.filter(t => inRange(t, range('bulan'))).length;
    $('#mtHead', el).innerHTML = pageHead({
      icon: 'bi-receipt', title: 'Mutasi Transaksi', chip: '<span class="pill pill-ok pill-dot" style="--dot:var(--c-income)">' + nMonth + ' Transaksi Bulan Ini</span>',
      sub: 'Pantau dan kelola seluruh mutasi kas bersama dan privat secara transparan &amp; rapi.',
      actions: '<button type="button" class="btn-x btn-soft-x" data-action="export-mutasi"><i class="bi bi-download"></i>Ekspor Data</button><button type="button" class="btn-x btn-primary-x" data-action="trx" data-jenis="Keluar"><i class="bi bi-plus-circle"></i>Catat Transaksi Baru</button>'
    });
    // Sinkronkan kontrol filter dengan state
    $('#fQ', el).value !== f.q && ($('#fQ', el).value = f.q);
    $('#fPeriode', el).value = f.periode;
    fillSelect($('#fDompet', el), [['', 'Semua Dompet']].concat(S.dompet.map(d => [d.id, d.nama + (d.status === 'Arsip' ? ' (arsip)' : '')])), f.dompet);
    const kOpts = [['', 'Semua Kategori']].concat(S.kategori.filter(k => k.tipe !== 'Sistem').sort((a, b) => a.jenis.localeCompare(b.jenis) || a.nama.localeCompare(b.nama)).map(k => [k.id, (k.jenis === 'Masuk' ? '↓ ' : '↑ ') + k.nama]));
    fillSelect($('#fKategori', el), kOpts, f.kategori);
    $('#fJenis', el).value = f.jenis; $('#fPrivasi', el).value = f.privasi;
    $('#fCustom', el).hidden = f.periode !== 'kustom';
    $('#fDari', el).value = f.dari; $('#fSampai', el).value = f.sampai;

    const list = mutasiList(), fl = flows(list);
    let bers = 0, prv = 0;
    list.forEach(t => { if (isFlow(t)) { if (t.privasi === 'Privat') prv += t.nominal; else bers += t.nominal; } });
    const rb = bers + prv ? Math.round(bers / (bers + prv) * 100) : 0;
    $('#mtKpi', el).innerHTML =
      kpi({ label: 'Total Pemasukan', icon: 'bi-arrow-down', color: '#12B886', value: rp(fl.masuk), count: fl.masuk, key: 'mtIn', cls: 'amt', foot: '<span class="pill pill-ok">' + list.filter(t => isFlow(t) && t.jenis === 'Masuk').length + ' transaksi</span>' + esc(r.label) }) +
      kpi({ label: 'Total Pengeluaran', icon: 'bi-arrow-up', color: '#FF7A59', value: rp(fl.keluar), count: fl.keluar, key: 'mtOut', cls: 'amt', foot: '<span class="pill pill-danger">' + list.filter(t => isFlow(t) && t.jenis === 'Keluar').length + ' transaksi</span>' + esc(r.label) }) +
      kpi({ label: 'Arus Kas Bersih', icon: 'bi-wallet2', color: '#38BDF8', value: rp(fl.net, true), count: fl.net, key: 'mtNet', sign: true, cls: 'amt ' + (fl.net >= 0 ? 'text-income' : 'text-expense'), foot: fl.net >= 0 ? '<span class="pill pill-ok">Sehat &amp; Positif</span>Surplus siap ditabung' : '<span class="pill pill-danger">Perlu Dicek</span>Pengeluaran &gt; pemasukan' }) +
      kpi({ label: 'Rasio Kas', icon: 'bi-pie-chart', color: '#7C5CFC', value: '<span style="color:var(--c-income-text)">' + rb + '%</span> <small class="text-2 fs-6">Bersama</small> <span style="color:var(--privat-fg)">' + (bers + prv ? 100 - rb : 0) + '%</span> <small class="text-2 fs-6">Privat</small>', foot: '<div class="split-bar w-100"><span style="width:' + rb + '%;background:var(--c-income)"></span><span style="width:' + (bers + prv ? 100 - rb : 0) + '%;background:var(--c-grape)"></span></div>' });

    // Chip filter aktif
    const chips = [];
    chips.push('<button type="button" class="chip-x c-mint" data-action="rm-chip" data-k="periode">Periode: ' + esc(r.label) + (f.periode !== 'bulan' ? ' <i class="bi bi-x-lg"></i>' : '') + '</button>');
    if (f.dompet) chips.push('<button type="button" class="chip-x" data-action="rm-chip" data-k="dompet">Dompet: ' + esc(dompetName(f.dompet)) + ' <i class="bi bi-x-lg"></i></button>');
    if (f.kategori) chips.push('<button type="button" class="chip-x" data-action="rm-chip" data-k="kategori">Kategori: ' + esc(kat(f.kategori).nama) + ' <i class="bi bi-x-lg"></i></button>');
    if (f.jenis) chips.push('<button type="button" class="chip-x" data-action="rm-chip" data-k="jenis">Jenis: ' + esc({ Masuk: 'Pemasukan', Keluar: 'Pengeluaran', Transfer: 'Pindah Saldo', Tabungan: 'Tabungan' }[f.jenis]) + ' <i class="bi bi-x-lg"></i></button>');
    if (f.privasi) chips.push('<button type="button" class="chip-x c-grape" data-action="rm-chip" data-k="privasi">Tipe: ' + esc(f.privasi) + ' <i class="bi bi-x-lg"></i></button>');
    if (f.q) chips.push('<button type="button" class="chip-x" data-action="rm-chip" data-k="q">Cari: “' + esc(f.q) + '” <i class="bi bi-x-lg"></i></button>');
    $('#fChips', el).innerHTML = '<span class="small-label me-1">Filter aktif:</span>' + chips.join('') + '<button type="button" class="link-x ms-auto" data-action="reset-filter"><i class="bi bi-arrow-counterclockwise"></i>Reset Filter</button>';

    // Saldo berjalan bila satu dompet dipilih
    const run = new Map(), dSel = f.dompet ? idx.dompet.get(f.dompet) : null;
    if (dSel) {
      let bal = (Number(dSel.saldoAwal) || 0) + (Number(dSel.hiddenNet) || 0);
      S.transaksi.filter(t => t.dompetId === dSel.id).slice().reverse().forEach(t => { bal += (t.jenis === 'Masuk' ? 1 : -1) * t.nominal; run.set(t.id, bal); });
    }
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (f.page > pages) f.page = pages;
    const slice = list.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE);
    $('#mtThead', el).innerHTML = '<tr><th>Tanggal &amp; Waktu</th><th>Transaksi &amp; Catatan</th><th>Dompet</th><th>Kategori</th><th>Visibilitas</th><th>Bukti</th><th class="text-end">Nominal</th>' + (dSel ? '<th class="text-end">Saldo</th>' : '') + '</tr>';
    const strukBtn = t => t.struk ? '<button type="button" class="btn-icon" style="background:var(--thead);color:#4258A8" data-action="struk" data-id="' + t.id + '" aria-label="Lihat bukti transaksi"><i class="bi ' + (t.struk === 'pdf' ? 'bi-file-earmark-pdf' : 'bi-image') + '"></i></button>' : '<span class="text-3" title="Tanpa bukti"><i class="bi bi-dash-lg"></i></span>';
    $('#mtBody', el).innerHTML = slice.length ? slice.map(t => {
      const v = trxView(t);
      return '<tr data-trx="' + t.id + '" class="' + (t._pending ? 'is-pending' : '') + '" tabindex="0"><td class="t-date"><b>' + fmtTgl(t.tanggal) + '</b><small>' + t.tanggal.slice(11, 16) + ' WIB</small></td>' +
        '<td><div class="t-main">' + katTile(v.k) + '<div class="min-w-0"><b>' + esc(v.title) + '</b><small>' + esc(v.sub || '—') + '</small>' + pendTag + '</div></div></td>' +
        '<td><span class="pill pill-dot" style="--dot:' + esc(dompetColor(t.dompetId)) + '">' + esc(dompetName(t.dompetId)) + '</span></td>' +
        '<td><span class="pill" style="background:' + tint(v.k.warna, 0.14) + ';color:' + ink(v.k.warna) + '"><i class="bi ' + esc(v.k.ikon) + '"></i>' + esc(v.k.nama) + '</span></td>' +
        '<td>' + badgePriv(t.privasi) + '</td><td>' + strukBtn(t) + '</td><td class="t-amt ' + v.cls + '">' + v.amt + '</td>' +
        (dSel ? '<td class="t-amt amt">' + rp(run.get(t.id) || 0) + '</td>' : '') + '</tr>';
    }).join('') : '<tr><td colspan="8">' + empty('Tidak ada transaksi', 'Tidak ada data yang cocok dengan filter ini. Coba ubah periode atau reset filter.', '<button type="button" class="btn-x btn-soft-x" data-action="reset-filter">Reset Filter</button>') + '</td></tr>';
    // Daftar ponsel (dikelompokkan per hari)
    let lastDay = '', mobile = '';
    slice.forEach(t => {
      const d = t.tanggal.slice(0, 10);
      if (d !== lastDay) {
        const dayTot = flows(list.filter(x => x.tanggal.slice(0, 10) === d));
        mobile += '<div class="mday"><span>' + relDay(d) + '</span><span>' + (dayTot.keluar ? '-' + rpShort(dayTot.keluar) : '') + '</span></div>';
        lastDay = d;
      }
      mobile += mItem(t, dSel ? '<div class="text-2 fw-bold" style="font-size:11px">Saldo ' + rpShort(run.get(t.id) || 0) + '</div>' : (t.struk ? '<div><i class="bi bi-paperclip text-2"></i></div>' : ''));
    });
    $('#mtList', el).innerHTML = slice.length ? mobile : empty('Tidak ada transaksi', 'Coba ubah periode atau reset filter.', '<button type="button" class="btn-x btn-soft-x" data-action="reset-filter">Reset Filter</button>');
    // Paginasi
    const a = list.length ? (f.page - 1) * PAGE_SIZE + 1 : 0, b = Math.min(f.page * PAGE_SIZE, list.length);
    const nums = [];
    for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - f.page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
    $('#mtPager', el).innerHTML = '<div class="pager"><span>Menampilkan <b>' + a + '–' + b + '</b> dari <b>' + list.length + '</b> transaksi</span>' +
      (pages > 1 ? '<div class="pager-btns"><button type="button" data-action="page" data-p="' + (f.page - 1) + '" ' + (f.page <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>' +
        nums.map(p => p === '…' ? '<span class="px-1">…</span>' : '<button type="button" data-action="page" data-p="' + p + '" class="' + (p === f.page ? 'active' : '') + '">' + p + '</button>').join('') +
        '<button type="button" data-action="page" data-p="' + (f.page + 1) + '" ' + (f.page >= pages ? 'disabled' : '') + ' aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div>' : '') + '</div>';
    runCounters($('#mtKpi', el));
  }

  // ════════════════════════════════════════════════════════════════════════
  //  9. HALAMAN: ANALISIS (diagram interaktif + drill-down + insight)
  // ════════════════════════════════════════════════════════════════════════
  RENDER.analisis = function (el, first) {
    if (first) {
      el.innerHTML = pageHead({ icon: 'bi-pie-chart', title: 'Analisis Keuangan', sub: 'Ke mana uang paling banyak mengalir? Klik diagram untuk melihat transaksi di baliknya.', actions: '' }) +
        '<div class="d-flex flex-wrap gap-2 mb-3 align-items-center"><div class="seg" id="anPeriode"><button type="button" data-v="bulan">Bulan Ini</button><button type="button" data-v="3bulan">3 Bulan</button><button type="button" data-v="6bulan">6 Bulan</button><button type="button" data-v="tahun">Tahun Ini</button></div>' +
        '<select class="form-select w-auto" id="anScope" aria-label="Cakupan data"><option value="semua">Semua data terlihat</option><option value="saya">Milik saya saja</option><option value="bersama">Data bersama saja</option></select></div>' +
        '<div id="anBody"></div>';
      segBind($('#anPeriode', el), v => { S.f.analisis.periode = v; updAnalisis(); });
      $('#anScope', el).addEventListener('change', e => { S.f.analisis.scope = e.target.value; updAnalisis(); });
    }
    updAnalisis();
  };
  function scopeOk(t) { const s = S.f.analisis.scope; return s === 'semua' || (s === 'saya' ? isMine(t) : t.privasi === 'Bersama'); }
  function updAnalisis() {
    const el = $('#page-analisis'); if (!el || !$('#anBody', el)) return;
    const a = S.f.analisis, r = range(a.periode);
    segSet($('#anPeriode', el), a.periode); $('#anScope', el).value = a.scope;
    const list = S.transaksi.filter(t => inRange(t, r) && scopeOk(t));
    const len = daysBetween(r.dari, r.sampai) + 1;
    const pr = { dari: addDays(r.dari, -len), sampai: addDays(r.dari, -1) };
    const prevList = S.transaksi.filter(t => inRange(t, pr) && scopeOk(t));
    const fl = flows(list), pfl = flows(prevList);
    const kats = byKategori(list);
    const elapsed = Math.max(1, Math.min(len, daysBetween(r.dari, today()) + 1));
    const nKeluar = list.filter(t => isFlow(t) && t.jenis === 'Keluar').length;
    const topK = kats[0];
    const insights = buildInsights(list, fl, pfl, kats, r, elapsed);
    const freq = kats.slice().sort((x, y) => y.n - x.n).slice(0, 7);
    const big = list.filter(t => isFlow(t) && t.jenis === 'Keluar').slice().sort((x, y) => y.nominal - x.nominal).slice(0, 5);
    $('#anBody', el).innerHTML = '<div class="row g-3 mb-3 anim-in">' +
      kpi({ label: 'Total Pengeluaran', icon: 'bi-arrow-up-right', color: '#FF7A59', value: rp(fl.keluar), count: fl.keluar, key: 'anOut', cls: 'amt', foot: pfl.keluar ? '<span class="pill ' + (fl.keluar <= pfl.keluar ? 'pill-ok' : 'pill-danger') + '">' + (fl.keluar <= pfl.keluar ? '↓ ' : '↑ ') + Math.abs(Math.round((fl.keluar - pfl.keluar) / pfl.keluar * 100)) + '%</span>vs periode lalu' : esc(r.label) }) +
      kpi({ label: 'Rata-rata / Hari', icon: 'bi-calendar-day', color: '#38BDF8', value: rp(fl.keluar / elapsed), count: Math.round(fl.keluar / elapsed), key: 'anAvg', foot: elapsed + ' hari berjalan' }) +
      kpi({ label: 'Jumlah Transaksi', icon: 'bi-receipt', color: '#7C5CFC', value: fmtNum(list.length), count: list.length, fmt: 'num', key: 'anN', foot: nKeluar + ' pengeluaran · ' + list.filter(t => isFlow(t) && t.jenis === 'Masuk').length + ' pemasukan' }) +
      kpi({ label: 'Kategori Teratas', icon: 'bi-trophy', color: '#FFB020', value: topK ? '<span class="fs-5">' + esc(topK.k.nama) + '</span>' : '-', foot: topK ? rp(topK.total) + ' · ' + Math.round(topK.total / (fl.keluar || 1) * 100) + '%' : 'Belum ada data' }) + '</div>' +
      (list.length ? '<div class="row g-3">' +
        '<div class="col-lg-6"><div class="card-x h-100"><div class="card-head"><div><h3 class="card-title">Pengeluaran Terbesar per Kategori</h3><p class="card-sub">Klik irisan untuk detail</p></div></div><div class="chart-box tall"><canvas id="chAnDonut" aria-label="Diagram lingkaran pengeluaran per kategori"></canvas></div></div></div>' +
        '<div class="col-lg-6"><div class="card-x h-100"><div class="card-head"><div><h3 class="card-title">Kategori Paling Sering Dipakai</h3><p class="card-sub">Jumlah transaksi per kategori</p></div></div><div class="chart-box tall"><canvas id="chAnFreq" aria-label="Diagram batang kategori paling sering"></canvas></div></div></div>' +
        '<div class="col-12"><div class="card-x"><div class="card-head"><div><h3 class="card-title">Tren Pemasukan vs Pengeluaran</h3><p class="card-sub">' + (len <= 62 ? 'Per hari' : 'Per bulan') + ' · ' + esc(r.label) + ' · klik titik untuk detail</p></div></div><div class="chart-box"><canvas id="chAnTrend" aria-label="Diagram garis tren"></canvas></div></div></div>' +
        '<div class="col-lg-5"><div class="card-x h-100"><div class="card-head"><h3 class="card-title">Pengeluaran per Dompet</h3></div><div class="chart-box short"><canvas id="chAnDompet" aria-label="Diagram pengeluaran per dompet"></canvas></div></div></div>' +
        '<div class="col-lg-7"><div class="card-x h-100" style="background:linear-gradient(140deg,var(--bersama-bg),var(--surface) 55%)"><div class="card-head"><h3 class="card-title"><svg class="koin koin-xs" aria-hidden="true"><use href="#koin"/></svg>Analisis Koin</h3><span class="pill pill-grape"><i class="bi bi-stars"></i>Otomatis</span></div><ul class="list-unstyled m-0 d-grid gap-2">' +
        insights.map(s => '<li class="d-flex gap-2"><i class="bi bi-check2-circle text-income mt-1"></i><span>' + s + '</span></li>').join('') + '</ul></div></div>' +
        '<div class="col-12"><div class="card-x"><div class="card-head"><h3 class="card-title">5 Pengeluaran Terbesar</h3></div>' + (big.length ? big.map(t => mItem(t)).join('') : empty('Belum ada pengeluaran', '')) + '</div></div>' +
        '</div>' : '<div class="card-x">' + empty('Belum ada data di periode ini', 'Catat transaksi atau pilih periode lain untuk melihat analisis.', '<button type="button" class="btn-x btn-primary-x" data-action="trx" data-jenis="Keluar"><i class="bi bi-plus-lg"></i>Catat Transaksi</button>') + '</div>');
    runCounters(el);
    if (!list.length) return;
    const hover = (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; };
    const top = kats.slice(0, 8);
    mkChart('chAnDonut', {
      type: 'pie', data: { labels: top.map(x => x.k.nama), datasets: [{ data: top.map(x => x.total), backgroundColor: top.map(x => x.k.warna), borderColor: cssVar('--surface'), borderWidth: 3, hoverOffset: 12 }] },
      options: { plugins: { legend: { position: 'right', labels: { color: cssVar('--text'), padding: 12 } }, tooltip: tipRp() }, onClick: (e, els) => { if (els.length) drillKat(top[els[0].index].id, a.periode, true); }, onHover: hover }
    });
    mkChart('chAnFreq', {
      type: 'bar', data: { labels: freq.map(x => x.k.nama), datasets: [{ label: 'Transaksi', data: freq.map(x => x.n), backgroundColor: freq.map(x => tint(x.k.warna, 0.85)), borderRadius: 10, borderSkipped: false, maxBarThickness: 26 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + c.parsed.x + ' kali · ' + rp(freq[c.dataIndex].total) } } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: cssVar('--border') }, border: { display: false } }, y: { grid: { display: false }, border: { display: false } } }, onClick: (e, els) => { if (els.length) drillKat(freq[els[0].index].id, a.periode, true); }, onHover: hover }
    });
    const daily = len <= 62, keys = [];
    if (daily) for (let d = r.dari; d <= r.sampai && d <= today(); d = addDays(d, 1)) keys.push(d);
    else for (let m = r.dari.slice(0, 7); m <= r.sampai.slice(0, 7); m = addMonths(m + '-01', 1).slice(0, 7)) keys.push(m);
    const mIn = {}, mOut = {};
    list.forEach(t => { if (!isFlow(t)) return; const k = daily ? t.tanggal.slice(0, 10) : t.tanggal.slice(0, 7); if (t.jenis === 'Masuk') mIn[k] = (mIn[k] || 0) + t.nominal; else mOut[k] = (mOut[k] || 0) + t.nominal; });
    const lbl = k => daily ? fmtTglPendek(k) : BLN[Number(k.slice(5)) - 1] + ' ' + k.slice(2, 4);
    mkChart('chAnTrend', {
      type: 'line', data: { labels: keys.map(lbl), datasets: [
        { label: 'Pemasukan', data: keys.map(k => mIn[k] || 0), borderColor: '#0CA678', backgroundColor: tint('#0CA678', 0.1), fill: true, tension: 0.35, pointRadius: daily ? 0 : 3, pointHoverRadius: 6, borderWidth: 2.5 },
        { label: 'Pengeluaran', data: keys.map(k => mOut[k] || 0), borderColor: '#FF7A59', backgroundColor: tint('#FF7A59', 0.1), fill: true, tension: 0.35, pointRadius: daily ? 0 : 3, pointHoverRadius: 6, borderWidth: 2.5 }] },
      options: {
        interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', align: 'end' }, tooltip: tipRp() }, scales: { y: Object.assign({ beginAtZero: true }, axisRp()), x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 10 } } },
        onClick: (e, els) => { if (!els.length) return; const k = keys[els[0].index]; const dari = daily ? k : k + '-01', sampai = daily ? k : endOfMonth(k + '-01'); drill('Transaksi ' + (daily ? fmtHari(k) : BULAN[Number(k.slice(5)) - 1] + ' ' + k.slice(0, 4)), 'Pemasukan & pengeluaran', t => isFlow(t) && scopeOk(t) && t.tanggal.slice(0, 10) >= dari && t.tanggal.slice(0, 10) <= sampai, { periode: 'kustom', dari: dari, sampai: sampai }); },
        onHover: hover
      }
    });
    const perD = {};
    list.forEach(t => { if (isFlow(t) && t.jenis === 'Keluar') perD[t.dompetId] = (perD[t.dompetId] || 0) + t.nominal; });
    const dk = Object.keys(perD).sort((x, y) => perD[y] - perD[x]);
    mkChart('chAnDompet', {
      type: 'bar', data: { labels: dk.map(dompetName), datasets: [{ label: 'Pengeluaran', data: dk.map(k => perD[k]), backgroundColor: dk.map(k => tint(dompetColor(k), 0.85)), borderRadius: 10, borderSkipped: false, maxBarThickness: 48 }] },
      options: { plugins: { legend: { display: false }, tooltip: tipRp() }, scales: { y: Object.assign({ beginAtZero: true }, axisRp()), x: { grid: { display: false }, border: { display: false } } }, onClick: (e, els) => { if (els.length) { const id = dk[els[0].index]; drill('Pengeluaran · ' + dompetName(id), r.label, t => isFlow(t) && t.jenis === 'Keluar' && t.dompetId === id && inRange(t, r) && scopeOk(t), { periode: a.periode, dompet: id, jenis: 'Keluar' }); } }, onHover: hover }
    });
  }
  function buildInsights(list, fl, pfl, kats, r, elapsed) {
    const out = [], b = s => '<b>' + s + '</b>';
    if (kats[0]) out.push(b(esc(kats[0].k.nama)) + ' menyerap ' + Math.round(kats[0].total / (fl.keluar || 1) * 100) + '% pengeluaran (' + rp(kats[0].total) + ').');
    const freq = kats.slice().sort((x, y) => y.n - x.n)[0];
    if (freq) out.push('Paling sering mencatat ' + b(esc(freq.k.nama)) + ' (' + freq.n + 'x), rata-rata ' + rp(freq.total / freq.n) + ' per transaksi.');
    if (pfl.keluar > 0) { const d = Math.round((fl.keluar - pfl.keluar) / pfl.keluar * 100); out.push(d <= 0 ? 'Pengeluaran ' + b('turun ' + Math.abs(d) + '%') + ' dibanding periode sebelumnya. Mantap, pertahankan!' : 'Pengeluaran ' + b('naik ' + d + '%') + ' dibanding periode sebelumnya. Cek kategori teratas.'); }
    const jajan = kats.find(x => x.id === 'KAT-JAJAN');
    if (jajan && jajan.n >= 5) out.push('Jajan &amp; ngopi ' + jajan.n + 'x senilai ' + rp(jajan.total) + '. Kurangi 2x seminggu bisa hemat ±' + rp(jajan.total / jajan.n * 8) + ' per bulan.');
    if (fl.masuk > 0) { const rate = Math.round((fl.masuk - fl.keluar) / fl.masuk * 100); out.push('Rasio menabung ' + b(rate + '%') + ' dari pemasukan' + (rate >= 20 ? ' — sudah di atas saran 20%.' : '. Target ideal minimal 20%.')); }
    let we = 0, wd = 0;
    list.forEach(t => { if (isFlow(t) && t.jenis === 'Keluar') { const g = parseD(t.tanggal).getDay(); if (g === 0 || g === 6) we += t.nominal; else wd += t.nominal; } });
    if (we + wd > 0) out.push('Akhir pekan menyumbang ' + Math.round(we / (we + wd) * 100) + '% pengeluaran.');
    const ang = Number(S.me.anggaran) || 0;
    if (ang && S.f.analisis.periode === 'bulan') {
      const left = daysBetween(today(), r.sampai) + 1, sisa = ang - fl.keluar;
      out.push(sisa >= 0 ? 'Sisa anggaran ' + b(rp(sisa)) + ' untuk ' + left + ' hari (±' + rp(sisa / Math.max(1, left)) + '/hari).' : 'Anggaran bulan ini ' + b('terlampaui ' + rp(-sisa)) + '.');
    }
    if (!out.length) out.push('Catat lebih banyak transaksi agar Koin bisa memberi analisis yang lebih tajam.');
    return out.slice(0, 6);
  }
  function drill(title, sub, pred, patch) {
    const list = S.transaksi.filter(pred);
    const sum = list.reduce((a, t) => a + t.nominal, 0);
    $('#drTitle').textContent = title;
    $('#drSub').textContent = sub + ' · ' + list.length + ' transaksi · ' + rp(sum);
    $('#drBody').innerHTML = list.length ? list.slice(0, 150).map(t => mItem(t)).join('') + (list.length > 150 ? '<p class="text-center text-2 small">Menampilkan 150 teratas — buka di Mutasi untuk semuanya.</p>' : '') : empty('Tidak ada transaksi', '');
    $('#drGo').onclick = () => { modal('mDrill').hide(); gotoMutasi(patch); };
    showModal('mDrill');
  }
  function drillKat(id, periode, scoped) {
    const k = kat(id), r = range(periode);
    drill(k.nama, r.label, t => t.kategoriId === id && inRange(t, r) && (!scoped || scopeOk(t)), { periode: periode, kategori: id });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  10. HALAMAN: TABUNGAN
  // ════════════════════════════════════════════════════════════════════════
  RENDER.tabungan = function (el) {
    const all = S.tabungan, tab = S.f.tabTab;
    const list = all.filter(g => tab === 'semua' || g.privasi === tab);
    const total = all.reduce((a, g) => a + g.saldo, 0), target = all.reduce((a, g) => a + g.target, 0);
    const since = addMonths(today().slice(0, 8) + '01', -5);
    const setor6 = S.mutasiTabungan.filter(m => m.jenis === 'Setor' && m.tanggal.slice(0, 10) >= since).reduce((a, m) => a + m.nominal, 0);
    const avg = setor6 / 6;
    const bers = all.filter(g => g.privasi === 'Bersama').reduce((a, g) => a + g.saldo, 0);
    const pb = total ? Math.round(bers / total * 100) : 0, p = pct(total, target);
    const msg = !all.length ? 'Mulai impian pertama kalian hari ini!' : p >= 1 ? 'Semua target tercapai! Saatnya merayakan.' : p >= 0.5 ? 'Hebat, sudah lewat setengah jalan!' : p >= 0.2 ? 'Konsisten menabung, impian makin dekat.' : 'Langkah kecil tiap bulan, hasilnya besar nanti.';
    const card = g => {
      const pp = pct(g.saldo, g.target), done = pp >= 1, sisa = Math.max(0, g.target - g.saldo);
      const per = S.mutasiTabungan.filter(m => m.tabunganId === g.id && m.jenis === 'Setor' && m.tanggal.slice(0, 10) >= since).reduce((a, m) => a + m.nominal, 0) / 6;
      let est = '';
      if (!done && g.targetTanggal) { const mo = Math.max(1, Math.ceil(daysBetween(today(), g.targetTanggal) / 30)); est = '<span class="' + (per * mo >= sisa ? 'text-income' : 'text-expense') + '"><i class="bi bi-lightning-charge"></i> Perlu ±' + rpShort(sisa / mo) + '/bln</span>'; }
      else if (!done && per > 0) est = '<span><i class="bi bi-hourglass-split"></i> Estimasi ' + Math.ceil(sisa / per) + ' bulan lagi</span>';
      return '<div class="col-md-6 col-xl-4"><div class="card-x goal-card ' + (done ? 'done' : '') + '">' +
        '<div class="goal-top">' + tile(g.ikon, g.warna, 'tile-lg') + '<div class="flex-grow-1 min-w-0"><div class="d-flex gap-1 flex-wrap">' + badgePriv(g.privasi) + (done ? '<span class="pill pill-sunny"><i class="bi bi-trophy-fill"></i>Tercapai</span>' : '') + '</div><h3 class="goal-name">' + esc(g.nama) + '</h3></div>' +
        (isMine(g) ? '<button type="button" class="btn-icon" data-action="tab-edit" data-id="' + g.id + '" aria-label="Ubah ' + esc(g.nama) + '"><i class="bi bi-three-dots-vertical"></i></button>' : '') + '</div>' +
        '<p class="goal-desc">' + esc(g.catatan || (isMine(g) ? '' : 'Dibuat oleh ' + userName(g.pemilik))) + '</p>' +
        '<div class="goal-box"><div class="min-w-0"><small>Terkumpul</small><span class="amt">' + rp(g.saldo) + '</span><small>dari target <b>' + rp(g.target) + '</b></small></div>' + ring(pp, done ? '#FFB020' : g.warna) + '</div>' +
        '<div class="goal-meta"><span><i class="bi bi-calendar-event"></i> ' + (g.targetTanggal ? 'Target ' + fmtBulan(g.targetTanggal) : 'Tanpa tenggat') + '</span><span>' + (done ? '<i class="bi bi-check-circle"></i> Target terpenuhi' : 'Sisa ' + rp(sisa)) + '</span></div>' +
        (est ? '<div class="goal-meta">' + est + '</div>' : '') +
        '<div class="goal-actions"><button type="button" class="btn-x btn-soft-x btn-sm-x" data-action="tab-tarik" data-id="' + g.id + '"' + (g.saldo <= 0 ? ' disabled' : '') + '><i class="bi bi-dash-circle"></i>Tarik</button><button type="button" class="btn-x btn-primary-x btn-sm-x" data-action="tab-setor" data-id="' + g.id + '"><i class="bi bi-plus-circle"></i>Setor</button></div></div></div>';
    };
    const hist = S.mutasiTabungan.slice().sort((x, y) => (y.tanggal + y.tanggalInput).localeCompare(x.tanggal + x.tanggalInput)).slice(0, 10);
    el.innerHTML = '<div class="d-flex gap-2 align-items-center mb-1 small fw-bold" style="color:var(--bersama-fg)"><i class="bi bi-heart-fill"></i>Perjalanan Finansial Berdua</div>' +
      pageHead({ icon: 'bi-piggy-bank', title: 'Pos Tabungan &amp; Impian', sub: 'Rencanakan masa depan finansial yang kokoh berdua dengan transparansi penuh.', actions: '<button type="button" class="btn-x btn-primary-x" data-action="tab-new"><i class="bi bi-plus-circle"></i>Tambah Pos Impian</button>' }) +
      '<div class="row g-3 mb-3 anim-in">' +
      kpi({ label: 'Total Terkumpul', icon: 'bi-piggy-bank', color: '#12B886', value: rp(total), count: total, key: 'tbTotal', cls: 'amt', foot: 'Dari ' + all.length + ' pos tabungan' }) +
      kpi({ label: 'Target Keseluruhan', icon: 'bi-bullseye', color: '#7C5CFC', value: rp(target), count: target, key: 'tbTarget', foot: '<div class="w-100">' + prog(p, 'linear-gradient(90deg,var(--c-primary),var(--c-accent))') + '<div class="mt-1">' + Math.round(p * 100) + '% tercapai · sisa ' + rpShort(Math.max(0, target - total)) + '</div></div>' }) +
      kpi({ label: 'Rata-rata Setoran', icon: 'bi-calendar-check', color: '#FFB020', value: rp(avg) + '<small class="text-2 fs-6"> /bln</small>', foot: '6 bulan terakhir' + (avg > 0 && target > total ? ' · ±' + Math.ceil((target - total) / avg) + ' bln lagi' : '') }) +
      kpi({ label: 'Split Tabungan', icon: 'bi-pie-chart', color: '#38BDF8', value: pb + '% <small class="text-2 fs-6">Bersama</small>', foot: '<div class="w-100"><div class="split-bar"><span style="width:' + pb + '%;background:var(--c-income)"></span><span style="width:' + (total ? 100 - pb : 0) + '%;background:var(--c-grape)"></span></div><div class="d-flex justify-content-between mt-1"><span>Bersama ' + pb + '%</span><span>Pribadi ' + (total ? 100 - pb : 0) + '%</span></div></div>' }) + '</div>' +
      '<div class="celebrate mb-4"><svg class="koin koin-sm koin-bob flex-shrink-0" aria-hidden="true"><use href="#koin"/></svg><div class="flex-grow-1"><h3 class="font-head fw-bold fs-5 mb-1">' + (all.length ? 'Sudah mencapai ' + Math.round(p * 100) + '% dari target! ' : '') + '<span class="pill pill-ok">' + (p >= 0.5 ? 'Juara Hemat' : 'Semangat!') + '</span></h3><p class="m-0 text-2">' + msg + ' Menabung berdua bukan soal seberapa cepat sampai, tapi komitmen menjaga langkah bersama.</p></div></div>' +
      '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h3 class="section-title">Daftar Impian Aktif <span class="pill pill-info">' + all.length + ' Pos</span></h3>' +
      '<div class="seg" id="tbTabs"><button type="button" data-v="semua">Semua</button><button type="button" data-v="Bersama">Bersama <span class="count">' + all.filter(g => g.privasi === 'Bersama').length + '</span></button><button type="button" data-v="Privat">Pribadi <span class="count">' + all.filter(g => g.privasi === 'Privat').length + '</span></button></div></div>' +
      '<div class="row g-3 anim-in">' + list.map(card).join('') +
      '<div class="col-md-6 col-xl-4"><button type="button" class="card-x add-card w-100 h-100" data-action="tab-new"><span class="tile tile-lg" style="background:var(--bersama-bg);color:var(--bersama-fg)"><i class="bi bi-piggy-bank"></i></span><b class="font-head fs-6">+ Buat Pos Tabungan Baru</b><small class="text-2">Beli motor, biaya lahiran, atau modal usaha? Petakan target berdua sekarang.</small></button></div></div>' +
      '<div class="card-x mt-4"><div class="card-head"><div><h3 class="card-title">Riwayat Alokasi &amp; Setoran Terakhir</h3><p class="card-sub">Setoran dan penarikan di setiap pos impian</p></div><button type="button" class="link-x" data-action="goto-tab-mutasi">Lihat Seluruh Mutasi <i class="bi bi-arrow-right"></i></button></div>' +
      (hist.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:640px"><thead><tr><th>Tanggal</th><th>Pos Impian</th><th>Kontributor</th><th>Dompet Sumber</th><th class="text-end">Nominal</th><th>Status</th></tr></thead><tbody>' +
        hist.map(m => { const g = idx.tab.get(m.tabunganId) || { nama: '-', warna: '#94A3B8' }; const plus = m.jenis !== 'Tarik'; return '<tr style="cursor:default"><td>' + fmtTgl(m.tanggal) + '</td><td><span class="pill pill-dot" style="--dot:' + esc(g.warna) + ';background:transparent;padding-left:0;color:var(--text)">' + esc(g.nama) + '</span></td><td><span class="pill badge-bersama">' + esc(userName(m.oleh)) + '</span></td><td class="text-2">' + (m.dompetId ? esc(dompetName(m.dompetId)) : '—') + '</td><td class="t-amt ' + (plus ? 'text-income' : 'text-expense') + '">' + (plus ? '+ ' : '- ') + rp(m.nominal) + '</td><td><span class="pill ' + (plus ? 'pill-ok' : 'pill-warn') + '">' + esc(m.jenis) + '</span></td></tr>'; }).join('') + '</tbody></table></div>'
        : empty('Belum ada setoran', 'Riwayat setoran dan penarikan akan muncul di sini.')) + '</div>';
    segSet($('#tbTabs', el), tab);
    segBind($('#tbTabs', el), v => { S.f.tabTab = v; rerenderCurrent(); });
  };

  // ════════════════════════════════════════════════════════════════════════
  //  11. HALAMAN: TAGIHAN
  // ════════════════════════════════════════════════════════════════════════
  RENDER.tagihan = function (el) {
    const t0 = today(), mStart = t0.slice(0, 8) + '01', mEnd = endOfMonth(mStart);
    const all = S.tagihan, unpaid = all.filter(b => b.lunas !== 'Lunas'), paid = all.filter(b => b.lunas === 'Lunas');
    const tab = S.f.tagTab, sort = S.f.tagSort;
    let list = tab === 'belum' ? unpaid : tab === 'lunas' ? paid : all.slice();
    list = list.slice().sort((a, b) => {
      if (sort === 'nominal') return b.nominal - a.nominal;
      if (sort === 'nama') return a.nama.localeCompare(b.nama);
      if (a.lunas !== b.lunas) return a.lunas === 'Lunas' ? 1 : -1;
      return a.lunas === 'Lunas' ? b.jatuhTempo.localeCompare(a.jatuhTempo) : a.jatuhTempo.localeCompare(b.jatuhTempo);
    });
    const prio = unpaid.filter(b => daysBetween(t0, b.jatuhTempo) <= 3);
    const month = all.filter(b => b.jatuhTempo >= mStart && b.jatuhTempo <= mEnd);
    const mTot = month.reduce((a, b) => a + b.nominal, 0), mPaid = month.filter(b => b.lunas === 'Lunas').reduce((a, b) => a + b.nominal, 0);
    const pp = pct(mPaid, mTot);
    const hari = String((S.settings && S.settings.hariPengingat) || '3,1').split(',').map(x => 'H-' + x.trim()).join(' &amp; ');
    const row = b => {
      const isPaid = b.lunas === 'Lunas', d = daysBetween(t0, b.jatuhTempo), u = urgency(d);
      return '<div class="card-x bill mb-3 ' + (isPaid ? 'paid' : '') + '">' + tile(b.ikon || 'bi-receipt', isPaid ? '#38BDF8' : u.color, 'tile-lg') +
        '<div class="bill-main"><div class="bill-name"><span class="nm">' + esc(b.nama) + '</span>' + badgePriv(b.privasi) + (b.berulang === 'Ya' ? '<span class="pill pill-info">Rutin ' + esc(b.periode) + '</span>' : '') + (!isMine(b) ? '<span class="pill"><i class="bi bi-person"></i>' + esc(userName(b.pemilik)) + '</span>' : '') + '</div>' +
        '<div class="bill-meta">' + (isPaid ? '<span class="text-income"><i class="bi bi-check-circle"></i> Lunas dibayar ' + fmtTgl(b.tanggalLunas) + (b.dibayarOleh ? ' oleh ' + esc(userName(b.dibayarOleh)) : '') + '</span>'
          : '<span style="color:' + (d <= 1 ? 'var(--c-expense-text)' : d <= 3 ? 'var(--c-sunny-text)' : 'var(--text-2)') + ';font-weight:700"><i class="bi bi-alarm"></i> Jatuh tempo: ' + fmtTgl(b.jatuhTempo) + ' (' + (d < 0 ? 'lewat ' + -d + ' hari' : 'H-' + d) + ')</span>') +
        (b.dompetId ? '<span><i class="bi bi-wallet2"></i> ' + esc(dompetName(b.dompetId)) + '</span>' : '') + (b.catatan ? '<span>' + esc(b.catatan) + '</span>' : '') + '</div></div>' +
        '<div class="bill-end"><div class="bill-amt"><b>' + rp(b.nominal) + '</b>' + (isPaid ? '<span class="pill pill-ok">Sudah Lunas <i class="bi bi-check-lg"></i></span>' : '<span class="pill ' + u.cls + '">' + u.text + '</span>') + '</div>' +
        (isPaid ? '' : '<button type="button" class="btn-x btn-primary-x" data-action="bayar" data-id="' + b.id + '">Tandai Lunas</button>') +
        (isMine(b) ? '<button type="button" class="btn-icon" data-action="tagihan-edit" data-id="' + b.id + '" aria-label="Ubah tagihan ' + esc(b.nama) + '"><i class="bi bi-pencil"></i></button>' : '') + '</div></div>';
    };
    el.innerHTML = pageHead({
      icon: 'bi-calendar2-check', title: 'Daftar Tagihan &amp; Pengingat Rutin',
      chip: '<span class="pill pill-ok"><i class="bi bi-envelope-check"></i>Pengingat otomatis ' + hari + ' via Email ' + (S.me.emailPengingat === 'Tidak' ? 'nonaktif' : 'aktif') + '</span>',
      sub: 'Kelola komitmen berulang berdua tanpa terlambat satu tanggal pun.',
      actions: '<button type="button" class="btn-x btn-soft-x" data-go="pengaturan"><i class="bi bi-envelope"></i>Jadwal Email</button><button type="button" class="btn-x btn-primary-x" data-action="tagihan-new"><i class="bi bi-plus-circle"></i>Tambah Tagihan Baru</button>'
    }) +
      '<div class="row g-3 mb-3 anim-in">' +
      kpi({ col: 'col-12 col-md-4', label: 'Prioritas Pembayaran', icon: 'bi-exclamation-triangle', color: '#FF7A59', value: prio.length + ' <small class="text-2 fs-6">Tagihan Perlu Segera</small>', foot: '<div class="d-flex justify-content-between w-100 p-2 rounded-3" style="background:var(--danger-bg)"><span>Nominal Mendesak</span><b class="text-expense">' + rp(prio.reduce((a, b) => a + b.nominal, 0)) + '</b></div>' }) +
      kpi({ col: 'col-6 col-md-4', label: 'Total Komitmen Bulanan', icon: 'bi-calendar3', color: '#38BDF8', value: rp(mTot), count: mTot, key: 'tgTot', foot: '<span class="pill pill-dot" style="--dot:var(--c-income)">' + month.length + ' Tagihan</span>Periode: ' + BULAN[parseD(t0).getMonth()] }) +
      kpi({ col: 'col-6 col-md-4', label: 'Status Keterbayaran', icon: 'bi-check2-circle', color: '#12B886', value: '<span class="text-income">' + Math.round(pp * 100) + '%</span> <small class="text-2 fs-6">Sudah Lunas</small>', foot: '<div class="w-100">' + prog(pp) + '<div class="d-flex justify-content-between mt-1"><span>' + rp(mPaid) + ' terbayar</span><b>Sisa: ' + rp(mTot - mPaid) + '</b></div></div>' }) + '</div>' +
      '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><div class="seg" id="tgTabs"><button type="button" data-v="belum">Belum Lunas <span class="count">' + unpaid.length + '</span></button><button type="button" data-v="lunas">Sudah Lunas <span class="count">' + paid.length + '</span></button><button type="button" data-v="semua">Semua Tagihan <span class="count">' + all.length + '</span></button></div>' +
      '<select class="form-select w-auto" id="tgSort" aria-label="Urutkan"><option value="tempo">Urutkan: Jatuh Tempo Terdekat</option><option value="nominal">Urutkan: Nominal Terbesar</option><option value="nama">Urutkan: Nama</option></select></div>' +
      '<div class="anim-in">' + (list.length ? list.map(row).join('') : '<div class="card-x">' + empty(tab === 'lunas' ? 'Belum ada tagihan lunas' : 'Tidak ada tagihan', 'Catat tagihan seperti listrik, internet, kos, pesmad, atau SPP agar diingatkan sebelum jatuh tempo.', '<button type="button" class="btn-x btn-primary-x" data-action="tagihan-new"><i class="bi bi-plus-lg"></i>Tambah Tagihan</button>') + '</div>') + '</div>' +
      '<div class="card-x mt-2 d-flex flex-wrap align-items-center gap-3"><span class="tile tile-lg" style="background:var(--bersama-bg)"><svg class="koin koin-xs" aria-hidden="true"><use href="#koin"/></svg></span><div class="flex-grow-1" style="min-width:220px"><b class="font-head">Tips Pengingat dari Koin:</b><p class="m-0 text-2">Aktifkan notifikasi email agar kalian bisa menyiapkan saldo sebelum autodebet bank memotong rekening.</p></div><button type="button" class="btn-x btn-tint-x" data-go="pengaturan">Ubah Pengaturan Notifikasi</button></div>';
    segSet($('#tgTabs', el), tab);
    segBind($('#tgTabs', el), v => { S.f.tagTab = v; rerenderCurrent(); });
    $('#tgSort', el).value = sort;
    $('#tgSort', el).addEventListener('change', e => { S.f.tagSort = e.target.value; rerenderCurrent(); });
  };

  // ════════════════════════════════════════════════════════════════════════
  //  12. HALAMAN: KATEGORI
  // ════════════════════════════════════════════════════════════════════════
  const canEditKat = k => k.tipe === 'Manual' ? isMine(k) : k.tipe === 'Default' ? isAdmin() : false;
  RENDER.kategori = function (el) {
    const tab = S.f.katTab, r = range('bulan');
    const use = {}, sumM = {};
    S.transaksi.forEach(t => { use[t.kategoriId] = (use[t.kategoriId] || 0) + 1; if (inRange(t, r)) sumM[t.kategoriId] = (sumM[t.kategoriId] || 0) + t.nominal; });
    const list = S.kategori.filter(k => k.jenis === tab).sort((a, b) => (a.status === 'Nonaktif') - (b.status === 'Nonaktif') || (Number(a.urutan) || 999) - (Number(b.urutan) || 999) || a.nama.localeCompare(b.nama));
    el.innerHTML = pageHead({ icon: 'bi-tags', title: 'Kategori', chip: '<span class="pill pill-info">' + S.kategori.filter(k => k.tipe !== 'Sistem').length + ' kategori</span>', sub: 'Pilih kategori default yang sesuai kebiasaanmu, atau buat kategori sendiri. Kategori yang sudah dipakai hanya bisa dinonaktifkan.', actions: '<button type="button" class="btn-x btn-primary-x" data-action="kat-new"><i class="bi bi-plus-circle"></i>Tambah Kategori</button>' }) +
      '<div class="seg mb-3" id="ktTabs"><button type="button" data-v="Keluar"><i class="bi bi-arrow-up-right"></i>Pengeluaran <span class="count">' + S.kategori.filter(k => k.jenis === 'Keluar').length + '</span></button><button type="button" data-v="Masuk"><i class="bi bi-arrow-down-left"></i>Pemasukan <span class="count">' + S.kategori.filter(k => k.jenis === 'Masuk').length + '</span></button></div>' +
      '<div class="kat-grid anim-in">' + list.map(k => '<button type="button" class="kat-card ' + (k.status === 'Nonaktif' ? 'off' : '') + '" data-action="kat-edit" data-id="' + esc(k.id) + '">' +
        '<div class="d-flex justify-content-between align-items-start">' + katTile(k) + '<span class="pill ' + (k.status === 'Nonaktif' ? '' : k.tipe === 'Default' ? 'pill-info' : 'pill-grape') + '">' + (k.status === 'Nonaktif' ? 'Nonaktif' : k.tipe) + '</span></div>' +
        '<b>' + esc(k.nama) + '</b><small>Dipakai ' + (use[k.id] || 0) + 'x' + (sumM[k.id] ? ' · ' + rpShort(sumM[k.id]) + ' bln ini' : '') + '</small>' +
        (k.tipe === 'Manual' && !isMine(k) ? '<small>oleh ' + esc(userName(k.pemilik)) + '</small>' : '') + '</button>').join('') +
      '<button type="button" class="kat-card add-card" style="min-height:120px" data-action="kat-new"><i class="bi bi-plus-circle fs-3 text-2"></i><b>Kategori Baru</b></button></div>';
    segSet($('#ktTabs', el), tab);
    segBind($('#ktTabs', el), v => { S.f.katTab = v; rerenderCurrent(); });
  };

  // ════════════════════════════════════════════════════════════════════════
  //  13. HALAMAN: LAPORAN & EKSPOR
  // ════════════════════════════════════════════════════════════════════════
  RENDER.laporan = function (el, first) {
    if (first) {
      el.innerHTML = pageHead({ icon: 'bi-file-earmark-text', title: 'Laporan &amp; Ekspor', sub: 'Pilih rentang tanggal, dompet, dan kategori — pratinjau langsung, lalu unduh Excel atau PDF.' }) +
        '<div class="card-x mb-3"><div class="seg mb-3" id="lpPreset"><button type="button" data-v="bulan">Bulan Ini</button><button type="button" data-v="bulanlalu">Bulan Lalu</button><button type="button" data-v="3bulan">3 Bulan</button><button type="button" data-v="tahun">Tahun Ini</button><button type="button" data-v="kustom">Kustom</button></div>' +
        '<div class="row g-2"><div class="col-6 col-md-2"><label class="form-label" for="lpDari">Dari</label><input type="date" class="form-control" id="lpDari"></div><div class="col-6 col-md-2"><label class="form-label" for="lpSampai">Sampai</label><input type="date" class="form-control" id="lpSampai"></div>' +
        '<div class="col-6 col-md-2"><label class="form-label" for="lpDompet">Dompet</label><select class="form-select" id="lpDompet"></select></div><div class="col-6 col-md-2"><label class="form-label" for="lpKategori">Kategori</label><select class="form-select" id="lpKategori"></select></div>' +
        '<div class="col-6 col-md-2"><label class="form-label" for="lpJenis">Jenis</label><select class="form-select" id="lpJenis"><option value="">Semua</option><option value="Masuk">Pemasukan</option><option value="Keluar">Pengeluaran</option><option value="Transfer">Pindah Saldo</option></select></div>' +
        '<div class="col-6 col-md-2"><label class="form-label" for="lpPrivasi">Visibilitas</label><select class="form-select" id="lpPrivasi"><option value="">Semua</option><option value="Bersama">Bersama</option><option value="Privat">Privat</option></select></div></div>' +
        '<div class="d-flex flex-wrap gap-2 mt-3 align-items-center"><button type="button" class="btn-x btn-primary-x" id="lpXlsx"><i class="bi bi-file-earmark-excel"></i>Unduh Excel</button><button type="button" class="btn-x btn-accent-x" id="lpPdf"><i class="bi bi-file-earmark-pdf"></i>Unduh PDF</button><span class="text-2 small ms-md-2" id="lpNote"></span></div></div>' +
        '<div id="lpPreview"></div>';
      const L = S.f.laporan;
      segBind($('#lpPreset', el), v => { L.preset = v; if (v !== 'kustom') { const r = range(v); L.dari = r.dari; L.sampai = r.sampai; } updLaporan(); });
      const map = { lpDari: 'dari', lpSampai: 'sampai', lpDompet: 'dompet', lpKategori: 'kategori', lpJenis: 'jenis', lpPrivasi: 'privasi' };
      Object.keys(map).forEach(id => $('#' + id, el).addEventListener('change', e => { L[map[id]] = e.target.value; if (id === 'lpDari' || id === 'lpSampai') L.preset = 'kustom'; updLaporan(); }));
      $('#lpXlsx', el).addEventListener('click', e => exportLaporan('xlsx', e.currentTarget));
      $('#lpPdf', el).addEventListener('click', e => exportLaporan('pdf', e.currentTarget));
      if (!L.dari) { const r = range(L.preset); L.dari = r.dari; L.sampai = r.sampai; }
    }
    updLaporan();
  };
  function laporanList() {
    const L = S.f.laporan;
    return S.transaksi.filter(t => {
      const d = t.tanggal.slice(0, 10);
      if (d < L.dari || d > L.sampai) return false;
      if (L.dompet && t.dompetId !== L.dompet) return false;
      if (L.kategori && t.kategoriId !== L.kategori) return false;
      if (L.privasi && t.privasi !== L.privasi) return false;
      if (L.jenis === 'Transfer') return t.kategoriId === SYS.TRANSFER;
      if (L.jenis) return t.jenis === L.jenis && isFlow(t);
      return true;
    }).slice().reverse();
  }
  function updLaporan() {
    const el = $('#page-laporan'); if (!el || !$('#lpPreview', el)) return;
    const L = S.f.laporan;
    segSet($('#lpPreset', el), L.preset);
    $('#lpDari', el).value = L.dari; $('#lpSampai', el).value = L.sampai;
    fillSelect($('#lpDompet', el), [['', 'Semua Dompet']].concat(S.dompet.map(d => [d.id, d.nama])), L.dompet);
    fillSelect($('#lpKategori', el), [['', 'Semua Kategori']].concat(S.kategori.filter(k => k.tipe !== 'Sistem').map(k => [k.id, k.nama])), L.kategori);
    $('#lpJenis', el).value = L.jenis; $('#lpPrivasi', el).value = L.privasi;
    const days = daysBetween(L.dari, L.sampai);
    const list = laporanList(), fl = flows(list), kats = byKategori(list), max = kats[0] ? kats[0].total : 1;
    $('#lpNote', el).innerHTML = days > 366 ? '<span class="text-expense"><i class="bi bi-exclamation-triangle"></i> Rentang maksimal 1 tahun.</span>' : '<i class="bi bi-info-circle"></i> ' + list.length + ' transaksi akan diekspor.';
    $('#lpXlsx', el).disabled = $('#lpPdf', el).disabled = days > 366 || days < 0 || !list.length;
    $('#lpPreview', el).innerHTML = '<div class="row g-3 mb-3">' +
      kpi({ label: 'Pemasukan', icon: 'bi-arrow-down', color: '#12B886', value: rp(fl.masuk), cls: 'amt' }) + kpi({ label: 'Pengeluaran', icon: 'bi-arrow-up', color: '#FF7A59', value: rp(fl.keluar), cls: 'amt' }) +
      kpi({ label: 'Selisih', icon: 'bi-wallet2', color: '#38BDF8', value: rp(fl.net, true), cls: 'amt ' + (fl.net >= 0 ? 'text-income' : 'text-expense') }) + kpi({ label: 'Transaksi', icon: 'bi-receipt', color: '#7C5CFC', value: fmtNum(list.length) }) + '</div>' +
      '<div class="row g-3"><div class="col-lg-4"><div class="card-x h-100"><h3 class="card-title mb-3">Ringkasan per Kategori</h3>' +
      (kats.length ? kats.slice(0, 8).map(x => '<div class="mb-3"><div class="d-flex justify-content-between small fw-bold mb-1"><span>' + esc(x.k.nama) + '</span><span>' + rp(x.total) + '</span></div>' + prog(x.total / max, x.k.warna) + '</div>').join('') : '<p class="text-2">Tidak ada pengeluaran.</p>') + '</div></div>' +
      '<div class="col-lg-8"><div class="card-x p-0 overflow-hidden"><div class="p-3 d-flex justify-content-between"><h3 class="card-title">Pratinjau Mutasi</h3><span class="text-2 small">' + Math.min(50, list.length) + ' dari ' + list.length + '</span></div><div class="tbl-wrap"><table class="tbl" style="min-width:560px"><thead><tr><th>Tanggal</th><th>Transaksi</th><th>Dompet</th><th class="text-end">Masuk</th><th class="text-end">Keluar</th></tr></thead><tbody>' +
      (list.length ? list.slice(0, 50).map(t => { const v = trxView(t); return '<tr data-trx="' + t.id + '"><td class="t-date"><b>' + fmtTgl(t.tanggal) + '</b><small>' + t.tanggal.slice(11, 16) + '</small></td><td><b class="d-block small">' + esc(v.title) + '</b><small class="text-2">' + esc(v.k.nama) + '</small></td><td class="small">' + esc(dompetName(t.dompetId)) + '</td><td class="t-amt text-income">' + (t.jenis === 'Masuk' ? rp(t.nominal) : '') + '</td><td class="t-amt text-expense">' + (t.jenis === 'Keluar' ? rp(t.nominal) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="5">' + empty('Tidak ada data', 'Ubah filter laporan.') + '</td></tr>') +
      '</tbody></table></div></div></div></div>';
    runCounters($('#lpPreview', el));
  }
  async function exportLaporan(fmt, btn) {
    const L = S.f.laporan;
    await withBtn(btn, async () => {
      try {
        const f = { dari: L.dari, sampai: L.sampai, dompetId: L.dompet, kategoriId: L.kategori, jenis: L.jenis, privasi: L.privasi };
        const res = await api('buatLaporan', S.token, f, fmt);
        downloadB64(res.data, res.mime, res.name);
        toast('Laporan ' + (fmt === 'xlsx' ? 'Excel' : 'PDF') + ' berhasil dibuat.', 'success');
      } catch (e) { toast('Gagal membuat laporan: ' + e.message, 'danger', 6000); }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  14. HALAMAN: PENGATURAN
  // ════════════════════════════════════════════════════════════════════════
  RENDER.pengaturan = function (el) {
    const me = S.me, st = S.settings || {}, custom = st.kustomisasi === 'Ya';
    const hari = String(st.hariPengingat || '3,1').split(',').map(x => 'H-' + x.trim()).join(' & ');
    el.innerHTML = pageHead({ icon: 'bi-gear', title: 'Pengaturan', sub: 'Atur profil, keamanan PIN, privasi, pengingat, dan tampilan aplikasi.' }) +
      '<div class="row g-3">' +
      '<div class="col-lg-6"><div class="card-x h-100"><h3 class="card-title mb-3">' + tile('bi-person', '#12B886') + 'Profil</h3>' +
      '<div class="d-flex align-items-center gap-3 mb-3"><span class="avatar" id="stAvatar" style="width:64px;height:64px;font-size:22px;background:' + esc(me.warna) + '">' + esc(initials(me.nama)) + '</span><div><b>' + esc(me.email) + '</b><div class="text-2 small">' + esc(me.peran) + '</div></div></div>' +
      '<label class="form-label" for="stNama">Nama tampilan</label><input class="form-control mb-3" id="stNama" maxlength="40" value="' + esc(me.nama) + '">' +
      '<label class="form-label">Warna avatar</label><div class="swatches mb-3" id="stWarna"></div>' +
      '<label class="form-label" for="stAnggaran">Anggaran pengeluaran bulanan</label><input class="form-control" id="stAnggaran" inputmode="numeric" value="' + (me.anggaran ? fmtNum(me.anggaran) : '') + '" placeholder="mis. 5.000.000"><div class="form-hint mb-3">Dipakai untuk garis batas di diagram dan peringatan saat mendekati batas. Kosongkan untuk menonaktifkan.</div>' +
      '<button type="button" class="btn-x btn-primary-x" id="stSaveProfil"><i class="bi bi-check2-circle"></i>Simpan Profil</button></div></div>' +
      '<div class="col-lg-6"><div class="card-x h-100"><h3 class="card-title mb-3">' + tile('bi-shield-lock', '#7C5CFC') + 'Keamanan PIN</h3>' +
      '<div class="row g-2"><div class="col-12"><label class="form-label" for="pinLama">PIN lama</label><div class="pin" data-pin><input type="password" class="pin-input" id="pinLama" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="current-password" aria-label="PIN lama"><div class="pin-dots"></div><button type="button" class="btn-icon pin-eye" aria-label="Tampilkan PIN"><i class="bi bi-eye"></i></button></div></div>' +
      '<div class="col-sm-6"><label class="form-label" for="pinBaru">PIN baru</label><div class="pin" data-pin><input type="password" class="pin-input" id="pinBaru" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="new-password" aria-label="PIN baru"><div class="pin-dots"></div><button type="button" class="btn-icon pin-eye" aria-label="Tampilkan PIN"><i class="bi bi-eye"></i></button></div></div>' +
      '<div class="col-sm-6"><label class="form-label" for="pinUlang">Ulangi PIN baru</label><div class="pin" data-pin><input type="password" class="pin-input" id="pinUlang" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="new-password" aria-label="Ulangi PIN baru"><div class="pin-dots"></div><button type="button" class="btn-icon pin-eye" aria-label="Tampilkan PIN"><i class="bi bi-eye"></i></button></div></div></div>' +
      '<div class="form-hint">Minimal 6 digit. PIN disimpan sebagai hash — Super Admin pun tidak bisa melihatnya.</div>' +
      '<div class="d-flex flex-wrap gap-2 mt-3"><button type="button" class="btn-x btn-accent-x" id="stPin"><i class="bi bi-key"></i>Ganti PIN</button><button type="button" class="btn-x btn-soft-x" id="stLogoutAll"><i class="bi bi-phone-flip"></i>Keluarkan perangkat lain</button></div></div></div>' +
      '<div class="col-lg-6"><div class="card-x h-100"><h3 class="card-title mb-2">' + tile('bi-bell', '#FFB020') + 'Privasi &amp; Pengingat</h3>' +
      '<div class="set-row"><div><b>Visibilitas default data baru</b><small>Bisa diubah per transaksi saat mencatat</small></div><div class="seg seg-priv" id="stPriv"><button type="button" data-v="Bersama"><i class="bi bi-people-fill"></i>Bersama</button><button type="button" data-v="Privat"><i class="bi bi-lock-fill"></i>Privat</button></div></div>' +
      '<div class="set-row"><div><b>Email pengingat tagihan</b><small>Dikirim ' + esc(hari) + ' sebelum jatuh tempo (diatur Super Admin)</small></div><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="stEmail" ' + (me.emailPengingat !== 'Tidak' ? 'checked' : '') + ' aria-label="Email pengingat"></div></div>' +
      '<div class="set-row"><div><b>Pengingat di aplikasi</b><small>Lonceng notifikasi & badge menu Tagihan</small></div><span class="pill pill-ok">Selalu aktif</span></div></div></div>' +
      '<div class="col-lg-6"><div class="card-x h-100"><h3 class="card-title mb-2">' + tile('bi-palette', '#FF6B9D') + 'Tampilan</h3>' +
      '<div class="set-row"><div><b>Mode gelap</b><small>Disimpan di perangkat ini</small></div><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="stDark" ' + (pref.dark ? 'checked' : '') + ' aria-label="Mode gelap"></div></div>' +
      '<div class="set-row"><div><b>Animasi</b><small>Matikan jika ingin tampilan tanpa gerakan</small></div><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="stMotion" ' + (pref.motion !== false ? 'checked' : '') + ' aria-label="Animasi"></div></div>' +
      '<div class="set-row"><div><b>Sembunyikan nominal saldo</b><small>Berguna saat membuka aplikasi di tempat umum</small></div><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="stHide" ' + (pref.hide ? 'checked' : '') + ' aria-label="Sembunyikan saldo"></div></div>' +
      '<div class="mt-3"><b class="d-block mb-2">Tema warna pribadi</b>' + (custom
        ? '<div class="row g-2 mb-2" id="stPalettes"></div><div class="d-flex flex-wrap gap-3 align-items-center mb-3"><label class="d-flex align-items-center gap-2 small fw-bold">Utama <input type="color" id="stUtama" class="form-control form-control-color p-1" style="width:46px;height:38px"></label><label class="d-flex align-items-center gap-2 small fw-bold">Aksen <input type="color" id="stAksen" class="form-control form-control-color p-1" style="width:46px;height:38px"></label></div>' +
          '<div class="d-flex flex-wrap gap-2"><button type="button" class="btn-x btn-primary-x btn-sm-x" id="stTemaSave"><i class="bi bi-check2"></i>Simpan Tema</button><button type="button" class="btn-x btn-soft-x btn-sm-x" id="stTemaReset">Ikuti tema global</button></div>'
        : '<div class="alert-soft info"><i class="bi bi-info-circle"></i><span>Tema mengikuti pengaturan global dari Super Admin. Kustomisasi tema anggota sedang dinonaktifkan.</span></div>') + '</div></div></div>' +
      '<div class="col-12"><div class="card-x d-flex flex-wrap align-items-center gap-3"><svg class="koin koin-xs" aria-hidden="true"><use href="#koin"/></svg><div class="flex-grow-1"><b>Data &amp; sinkronisasi</b><div class="text-2 small">Data keuangan hanya disimpan di Google Sheets, tidak di browser. ' + esc((S.settings && S.settings.nama) || 'LAPKEU') + ' v' + esc(PUB.versi || '1.0.0') + '</div></div><button type="button" class="btn-x btn-soft-x" data-action="refresh"><i class="bi bi-arrow-clockwise"></i>Muat Ulang Data</button></div></div>' +
      '</div>';
    initPins(el);
    let warna = me.warna;
    const sw = $('#stWarna', el);
    const paintSw = () => swatches(sw, warna, c => { warna = c; $('#stAvatar', el).style.background = c; paintSw(); });
    paintSw();
    nominalInput($('#stAnggaran', el));
    segSet($('#stPriv', el), me.privasiDefault);
    segBind($('#stPriv', el), v => saveProfil({ privasiDefault: v }, 'Visibilitas default: ' + v));
    $('#stEmail', el).addEventListener('change', e => saveProfil({ emailPengingat: e.target.checked ? 'Ya' : 'Tidak' }, e.target.checked ? 'Email pengingat diaktifkan' : 'Email pengingat dimatikan'));
    $('#stDark', el).addEventListener('change', e => setDark(e.target.checked));
    $('#stMotion', el).addEventListener('change', e => setMotion(e.target.checked));
    $('#stHide', el).addEventListener('change', e => setHide(e.target.checked));
    $('#stSaveProfil', el).addEventListener('click', () => {
      const nama = $('#stNama', el).value.trim();
      if (!nama) { $('#stNama', el).classList.add('is-invalid'); return toast('Nama wajib diisi.', 'warning'); }
      $('#stNama', el).classList.remove('is-invalid');
      saveProfil({ nama: nama, warna: warna, anggaran: parseNom($('#stAnggaran', el).value) }, 'Profil disimpan');
    });
    $('#stPin', el).addEventListener('click', e => gantiPin(e.currentTarget));
    $('#stLogoutAll', el).addEventListener('click', async e => {
      const ok = await confirmBox({ title: 'Keluarkan perangkat lain?', body: 'Semua sesi di perangkat lain akan berakhir. Perangkat ini tetap masuk.', ok: 'Ya, keluarkan', tone: 'primary', icon: 'bi-phone-flip' });
      if (!ok) return;
      try { const r = await api('logoutSemua', S.token); setToken(r.token); toast('Perangkat lain sudah dikeluarkan.', 'success'); } catch (err) { toast(err.message, 'danger'); }
    });
    if (custom) {
      let sel = effectiveColors();
      const paint = () => {
        $('#stPalettes', el).innerHTML = PALETTES.map((p, i) => '<div class="col-6 col-md-4"><button type="button" class="palette-btn ' + (p.utama === sel.utama && p.aksen === sel.aksen ? 'active' : '') + '" data-i="' + i + '"><span class="pb-dots"><span style="background:' + p.utama + '"></span><span style="background:' + p.aksen + '"></span></span>' + p.nama + '</button></div>').join('');
        $('#stUtama', el).value = sel.utama; $('#stAksen', el).value = sel.aksen;
      };
      paint();
      $('#stPalettes', el).addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; sel = Object.assign({}, PALETTES[b.dataset.i]); applyTheme(sel); paint(); });
      $('#stUtama', el).addEventListener('input', e => { sel = { utama: e.target.value.toUpperCase(), aksen: sel.aksen }; window.__applyColors(sel.utama, sel.aksen); });
      $('#stAksen', el).addEventListener('input', e => { sel = { utama: sel.utama, aksen: e.target.value.toUpperCase() }; window.__applyColors(sel.utama, sel.aksen); });
      $('#stTemaSave', el).addEventListener('click', () => saveProfil({ tema: sel }, 'Tema pribadi disimpan'));
      $('#stTemaReset', el).addEventListener('click', () => saveProfil({ tema: null }, 'Kembali ke tema global'));
    }
  };
  function saveProfil(p, okMsg) {
    const old = Object.assign({}, S.me);
    Object.assign(S.me, p);
    if (p.tema !== undefined) applyTheme();
    updateGlobal();
    mutate({
      apply: () => [], ok: okMsg, fail: 'Gagal menyimpan pengaturan',
      call: () => api('simpanProfil', S.token, p),
      done: me => { S.me = Object.assign(S.me, me); applyTheme(); updateGlobal(); },
      undo: () => { S.me = old; applyTheme(); updateGlobal(); S.dirty.add('pengaturan'); if (S.page === 'pengaturan') renderPage('pengaturan'); }
    });
  }
  async function gantiPin(btn) {
    const a = $('#pinLama').value, b = $('#pinBaru').value, c = $('#pinUlang').value;
    if (!/^\d{6,12}$/.test(b)) { shakePin('#pinBaru'); return toast('PIN baru minimal 6 digit angka.', 'warning'); }
    if (b !== c) { shakePin('#pinUlang'); return toast('Ulangi PIN tidak sama.', 'warning'); }
    await withBtn(btn, async () => {
      try {
        const r = await api('gantiPin', S.token, a, b);
        setToken(r.token);
        ['#pinLama', '#pinBaru', '#pinUlang'].forEach(s => { $(s).value = ''; $(s).dispatchEvent(new Event('input')); });
        toast('PIN berhasil diganti. Perangkat lain otomatis keluar.', 'success');
      } catch (e) { shakePin('#pinLama'); toast(e.message, 'danger'); }
    });
  }
  function setToken(t) { S.token = t; saveSession(t, S.remember); }

  // ════════════════════════════════════════════════════════════════════════
  //  15. HALAMAN: ADMIN PANEL
  // ════════════════════════════════════════════════════════════════════════
  let adminPreview = null, adminLogo = null;
  RENDER.admin = function (el, first) {
    if (!isAdmin()) { el.innerHTML = ''; return; }
    if (first || !$('#adBody', el)) {
      el.innerHTML = pageHead({ icon: 'bi-shield-lock', title: 'Admin Panel', chip: '<span class="pill pill-grape"><i class="bi bi-stars"></i>Super Admin</span>', sub: 'Kelola akun, akses data privat (wajib PIN pemilik), log akses, logo & warna global.' }) +
        '<div class="seg mb-3" id="adTabs"><button type="button" data-v="pengguna"><i class="bi bi-people"></i>Pengguna</button><button type="button" data-v="privat"><i class="bi bi-lock"></i>Akses Privat</button><button type="button" data-v="log"><i class="bi bi-journal-text"></i>Log Akses</button><button type="button" data-v="tampilan"><i class="bi bi-palette"></i>Tampilan Global</button><button type="button" data-v="sistem"><i class="bi bi-cpu"></i>Sistem</button></div><div id="adBody"></div>';
      segBind($('#adTabs', el), v => { if (adminPreview && v !== 'tampilan') { adminPreview = null; applyTheme(); } S.f.adminTab = v; renderAdminTab(); });
    }
    segSet($('#adTabs', el), S.f.adminTab);
    renderAdminTab();
  };
  function updAdminLists() { if (['pengguna', 'log'].indexOf(S.f.adminTab) >= 0) renderAdminTab(); }
  function renderAdminTab() {
    const body = $('#adBody'); if (!body || !S.admin) return;
    const tab = S.f.adminTab, A = S.admin;
    if (tab === 'pengguna') {
      body.innerHTML = '<div class="card-x"><div class="card-head"><div><h3 class="card-title">Akun Pengguna</h3><p class="card-sub">Tidak ada registrasi terbuka — hanya Super Admin yang membuat akun.</p></div><button type="button" class="btn-x btn-primary-x" data-action="user-new"><i class="bi bi-person-plus"></i>Buat Akun</button></div>' +
        '<div class="tbl-wrap"><table class="tbl" style="min-width:720px"><thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>PIN</th><th>Dibuat</th><th class="text-end">Aksi</th></tr></thead><tbody>' +
        A.users.map(u => '<tr style="cursor:default"><td><div class="d-flex align-items-center gap-2">' + avatar(u) + '<div><b class="d-block">' + esc(u.nama) + (u.id === S.me.id ? ' <span class="pill">Kamu</span>' : '') + '</b><small class="text-2">' + esc(u.email) + '</small></div></div></td>' +
          '<td><span class="pill ' + (u.peran === ADMIN ? 'pill-grape' : 'pill-info') + '">' + esc(u.peran) + '</span></td><td><span class="pill ' + (u.aktif === 'Ya' ? 'pill-ok' : 'pill-danger') + '">' + (u.aktif === 'Ya' ? 'Aktif' : 'Nonaktif') + '</span></td>' +
          '<td>' + (u.pinSet ? '<span class="pill pill-ok"><i class="bi bi-shield-check"></i>Diatur</span>' : '<span class="pill pill-warn"><i class="bi bi-hourglass"></i>Menunggu aktivasi</span>') + '</td><td class="small text-2">' + esc(String(u.dibuat).slice(0, 10)) + '</td>' +
          '<td class="text-end text-nowrap"><button type="button" class="btn-x btn-soft-x btn-sm-x" data-action="user-edit" data-id="' + u.id + '"><i class="bi bi-pencil"></i>Ubah</button> <button type="button" class="btn-x btn-tint-x btn-sm-x" data-action="user-reset" data-id="' + u.id + '"><i class="bi bi-key"></i>' + (u.pinSet ? 'Reset PIN' : 'Kode Baru') + '</button></td></tr>').join('') +
        '</tbody></table></div></div>';
    } else if (tab === 'log') {
      body.innerHTML = '<div class="card-x"><div class="card-head"><div><h3 class="card-title">Log Akses Data Privat</h3><p class="card-sub">Setiap percobaan akses oleh Super Admin dicatat permanen di sheet Log_Akses.</p></div><span class="pill">' + A.logs.length + ' catatan</span></div>' +
        (A.logs.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:720px"><thead><tr><th>Waktu</th><th>Super Admin</th><th>Pemilik Data</th><th>Alasan</th><th>Status</th></tr></thead><tbody>' +
          A.logs.map(l => '<tr style="cursor:default"><td class="small text-nowrap">' + esc(l.waktu) + '</td><td class="small">' + esc(l.admin) + '</td><td class="small">' + esc(l.pemilikData) + '</td><td class="small">' + esc(l.alasan) + '</td><td><span class="pill ' + (l.status === 'Berhasil' ? 'pill-ok' : 'pill-danger') + '">' + esc(l.status) + '</span></td></tr>').join('') + '</tbody></table></div>'
          : empty('Belum ada akses privat', 'Log akan terisi saat Super Admin membuka data privat dengan PIN pemilik.')) + '</div>';
    } else if (tab === 'privat') {
      const others = A.users.filter(u => u.id !== S.me.id && u.aktif === 'Ya' && u.pinSet);
      body.innerHTML = '<div class="row g-3"><div class="col-lg-7"><div class="card-x"><h3 class="card-title mb-2">' + tile('bi-lock', '#7C5CFC') + 'Buka Data Privat Pengguna</h3>' +
        '<div class="alert-soft mb-3"><i class="bi bi-exclamation-triangle"></i><span>Data privat hanya terbuka dengan <b>PIN pemilik data</b>. Minta pemilik memasukkan PIN-nya sendiri. Setiap percobaan dicatat di log.</span></div>' +
        (others.length ? '<label class="form-label" for="apUser">Pemilik data</label><select class="form-select mb-3" id="apUser">' + others.map(u => '<option value="' + u.id + '">' + esc(u.nama) + ' — ' + esc(u.email) + '</option>').join('') + '</select>' +
          '<label class="form-label" for="apAlasan">Alasan akses</label><textarea class="form-control mb-3" id="apAlasan" rows="2" maxlength="200" placeholder="mis. Rekonsiliasi saldo bersama akhir bulan"></textarea>' +
          '<label class="form-label" for="apPin">PIN pemilik data</label><div class="pin mb-3" data-pin><input type="password" class="pin-input" id="apPin" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="off" aria-label="PIN pemilik data"><div class="pin-dots"></div><button type="button" class="btn-icon pin-eye" aria-label="Tampilkan PIN"><i class="bi bi-eye"></i></button></div>' +
          '<button type="button" class="btn-x btn-accent-x" id="apGo"><i class="bi bi-unlock"></i>Buka Data Privat</button>'
          : empty('Tidak ada pengguna lain', 'Buat akun anggota terlebih dahulu (dan pastikan PIN-nya sudah diatur).')) + '</div></div>' +
        '<div class="col-lg-5"><div class="card-x h-100"><h3 class="card-title mb-3">Aturan Privasi</h3><ul class="d-grid gap-2 ps-3 m-0 text-2"><li>Data <b>Bersama</b> terlihat semua anggota.</li><li>Data <b>Privat</b> hanya terlihat pemiliknya.</li><li>Super Admin tidak bisa melihat data privat tanpa PIN pemilik.</li><li>Akses berlaku 30 menit, hanya-baca, dan tercatat di Log Akses.</li><li>Mengubah/menghapus data tetap hanya oleh pemiliknya.</li></ul></div></div></div>';
      initPins(body);
      const go = $('#apGo', body);
      if (go) go.addEventListener('click', () => aksesPrivat(go));
    } else if (tab === 'tampilan') {
      const st = S.settings;
      const sel = adminPreview || { utama: st.warnaUtama, aksen: st.warnaAksen };
      body.innerHTML = '<div class="row g-3"><div class="col-lg-7"><div class="card-x mb-3"><h3 class="card-title mb-3">' + tile('bi-image', '#38BDF8') + 'Logo Aplikasi</h3><div class="d-flex flex-wrap align-items-center gap-3"><div class="logo-drop" id="lgPrev">' + (PUB.logo ? '<img src="' + esc(PUB.logo) + '" alt="Logo saat ini">' : '<i class="bi bi-image fs-2 text-3"></i>') + '</div><div class="flex-grow-1"><p class="text-2 small mb-2">PNG, JPG, atau SVG · maks 1 MB. Tampil di sidebar, halaman login, dan laporan PDF.</p><input type="file" id="lgFile" accept="image/png,image/jpeg,image/svg+xml" hidden><div class="d-flex flex-wrap gap-2"><button type="button" class="btn-x btn-primary-x btn-sm-x" id="lgUp"><i class="bi bi-upload"></i>Unggah Logo</button>' + (PUB.logo ? '<button type="button" class="btn-x btn-danger-x btn-sm-x" id="lgDel"><i class="bi bi-trash3"></i>Hapus</button>' : '') + '</div></div></div></div>' +
        '<div class="card-x"><h3 class="card-title mb-3">' + tile('bi-palette', '#FF6B9D') + 'Warna Global</h3><div class="row g-2 mb-3" id="adPal"></div>' +
        '<div class="d-flex flex-wrap gap-3 align-items-center mb-3"><label class="d-flex align-items-center gap-2 small fw-bold">Warna utama <input type="color" id="adUtama" class="form-control form-control-color p-1" style="width:46px;height:38px" value="' + esc(sel.utama) + '"></label><label class="d-flex align-items-center gap-2 small fw-bold">Warna aksen <input type="color" id="adAksen" class="form-control form-control-color p-1" style="width:46px;height:38px" value="' + esc(sel.aksen) + '"></label><span class="pill pill-info"><i class="bi bi-eye"></i>Pratinjau langsung di seluruh halaman</span></div>' +
        '<div class="set-row"><div><b>Izinkan anggota memilih tema pribadi</b><small>Jika mati, semua anggota memakai tema global ini</small></div><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="adCustom" ' + (st.kustomisasi === 'Ya' ? 'checked' : '') + ' aria-label="Kustomisasi anggota"></div></div>' +
        '<div class="set-row"><div><b>Hari pengingat email</b><small>Pisahkan dengan koma, mis. 3,1 (H-3 dan H-1)</small></div><input class="form-control" id="adHari" style="max-width:110px" value="' + esc(st.hariPengingat || '3,1') + '"></div>' +
        '<div class="d-flex flex-wrap gap-2 mt-3"><button type="button" class="btn-x btn-primary-x" id="adSave"><i class="bi bi-check2-circle"></i>Simpan Tampilan</button><button type="button" class="btn-x btn-soft-x" id="adCancel">Batalkan Pratinjau</button></div></div></div>' +
        '<div class="col-lg-5"><div class="card-x"><h3 class="card-title mb-3">Pratinjau</h3><div class="theme-preview"><div class="tp-hero" style="background:linear-gradient(125deg,var(--c-primary-strong),var(--c-primary) 45%,var(--c-accent) 125%)"><small class="opacity-75 fw-bold">Total Saldo</small><div class="font-head fw-bold fs-3">Rp 48.750.000</div></div><div class="p-3 d-grid gap-2"><button type="button" class="btn-x btn-primary-x">Tombol Utama</button><button type="button" class="btn-x btn-accent-x">Tombol Aksen</button><div class="d-flex gap-2"><span class="pill badge-bersama">Bersama</span><span class="pill badge-privat">Privat</span><span class="pill pill-warn">H-3</span></div>' + prog(0.64) + '</div></div></div></div></div>';
      const paint = cur => { $('#adPal', body).innerHTML = PALETTES.map((p, i) => '<div class="col-6 col-md-4"><button type="button" class="palette-btn ' + (p.utama === cur.utama && p.aksen === cur.aksen ? 'active' : '') + '" data-i="' + i + '"><span class="pb-dots"><span style="background:' + p.utama + '"></span><span style="background:' + p.aksen + '"></span></span>' + p.nama + '</button></div>').join(''); };
      paint(sel);
      const preview = c => { adminPreview = c; window.__applyColors(c.utama, c.aksen); $('#adUtama', body).value = c.utama; $('#adAksen', body).value = c.aksen; paint(c); };
      $('#adPal', body).addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) preview(Object.assign({}, PALETTES[b.dataset.i])); });
      $('#adUtama', body).addEventListener('input', e => preview({ utama: e.target.value.toUpperCase(), aksen: (adminPreview || sel).aksen }));
      $('#adAksen', body).addEventListener('input', e => preview({ utama: (adminPreview || sel).utama, aksen: e.target.value.toUpperCase() }));
      $('#adCancel', body).addEventListener('click', () => { adminPreview = null; applyTheme(); renderAdminTab(); toast('Pratinjau dibatalkan.', 'info'); });
      $('#adSave', body).addEventListener('click', e => withBtn(e.currentTarget, async () => {
        const c = adminPreview || sel;
        try {
          const s = await api('adminSimpanTampilan', S.token, { warnaUtama: c.utama, warnaAksen: c.aksen, kustomisasi: $('#adCustom', body).checked ? 'Ya' : 'Tidak', hariPengingat: $('#adHari', body).value });
          S.settings = s; Object.assign(PUB, { warnaUtama: s.warnaUtama, warnaAksen: s.warnaAksen, kustomisasi: s.kustomisasi, hariPengingat: s.hariPengingat });
          adminPreview = null; applyTheme(); S.dirty.add('pengaturan'); renderAdminTab();
          toast('Tampilan global disimpan untuk semua anggota.', 'success');
        } catch (err) { toast(err.message, 'danger'); }
      }));
      $('#lgUp', body).addEventListener('click', () => $('#lgFile', body).click());
      $('#lgFile', body).addEventListener('change', e => uploadLogo(e.target.files[0], $('#lgUp', body)));
      const del = $('#lgDel', body);
      if (del) del.addEventListener('click', async () => {
        if (!(await confirmBox({ title: 'Hapus logo?', body: 'Logo kembali ke ikon bawaan.', ok: 'Hapus logo' }))) return;
        try { await api('adminHapusLogo', S.token); PUB.logo = ''; applyBrand(); renderAdminTab(); toast('Logo dihapus.', 'success'); } catch (err) { toast(err.message, 'danger'); }
      });
    } else {
      const c = { t: S.transaksi.length, d: S.dompet.length, g: S.tabungan.length, b: S.tagihan.length, k: S.kategori.length };
      body.innerHTML = '<div class="row g-3"><div class="col-lg-6"><div class="card-x h-100"><h3 class="card-title mb-3">' + tile('bi-lightning', '#FFB020') + 'Performa &amp; Cache</h3><p class="text-2">Data dibaca dari CacheService (milidetik). Cache otomatis diperbarui saat menulis dan dibuang saat sheet diedit manual.</p><button type="button" class="btn-x btn-soft-x" id="sysCache"><i class="bi bi-trash3"></i>Bersihkan Cache Server</button></div></div>' +
        '<div class="col-lg-6"><div class="card-x h-100"><h3 class="card-title mb-3">' + tile('bi-envelope', '#12B886') + 'Pengingat Email</h3><p class="text-2">Pemicu harian berjalan otomatis setiap pagi. Uji pengiriman sekarang (satu email per penerima).</p><button type="button" class="btn-x btn-primary-x" id="sysMail"><i class="bi bi-send"></i>Kirim Pengingat Sekarang</button><div class="mt-2 small text-2" id="sysMailRes"></div></div></div>' +
        '<div class="col-12"><div class="card-x"><h3 class="card-title mb-3">Ringkasan Data (yang terlihat olehmu)</h3><div class="row g-2 text-center">' +
        [['Transaksi', c.t, 'bi-receipt'], ['Dompet', c.d, 'bi-wallet2'], ['Tabungan', c.g, 'bi-piggy-bank'], ['Tagihan', c.b, 'bi-calendar2-check'], ['Kategori', c.k, 'bi-tags'], ['Pengguna', S.admin.users.length, 'bi-people']].map(x => '<div class="col-4 col-md-2"><div class="p-3 rounded-4" style="background:var(--surface-soft)"><i class="bi ' + x[2] + ' text-2"></i><div class="font-head fw-bold fs-4">' + fmtNum(x[1]) + '</div><small class="text-2 fw-bold">' + x[0] + '</small></div></div>').join('') + '</div></div></div></div>';
      $('#sysCache', body).addEventListener('click', e => withBtn(e.currentTarget, async () => { try { await api('adminBersihkanCache', S.token); toast('Cache server dibersihkan.', 'success'); } catch (err) { toast(err.message, 'danger'); } }));
      $('#sysMail', body).addEventListener('click', e => withBtn(e.currentTarget, async () => {
        try { const r = await api('adminKirimPengingat', S.token); $('#sysMailRes', body).textContent = r.terkirim + ' email terkirim ke ' + r.penerima + ' penerima (' + r.tagihan + ' tagihan, hari: H-' + (r.hari || []).join(', H-') + ').'; toast('Pengingat diproses.', 'success'); } catch (err) { toast(err.message, 'danger'); }
      }));
    }
  }
  async function uploadLogo(file, btn) {
    if (!file) return;
    if (['image/png', 'image/jpeg', 'image/svg+xml'].indexOf(file.type) < 0) return toast('Format logo harus PNG, JPG, atau SVG.', 'warning');
    if (file.size > 1024 * 1024) return toast('Ukuran logo maksimal 1 MB.', 'warning');
    await withBtn(btn, async () => {
      try {
        const data = await fileB64(file);
        const r = await api('adminUploadLogo', S.token, { mime: file.type, data: data, name: file.name });
        PUB.logo = r.logo; applyBrand(); renderAdminTab();
        toast('Logo diperbarui.', 'success');
      } catch (e) { toast('Gagal mengunggah logo: ' + e.message, 'danger'); }
    });
  }
  async function aksesPrivat(btn) {
    const uid = $('#apUser').value, alasan = $('#apAlasan').value.trim(), pin = $('#apPin').value;
    if (alasan.length < 5) { $('#apAlasan').classList.add('is-invalid'); return toast('Tuliskan alasan akses (min. 5 karakter).', 'warning'); }
    $('#apAlasan').classList.remove('is-invalid');
    if (!/^\d{6,12}$/.test(pin)) { shakePin('#apPin'); return toast('Masukkan PIN pemilik data.', 'warning'); }
    await withBtn(btn, async () => {
      try {
        const r = await api('adminAksesPrivat', S.token, uid, pin, alasan);
        S.admin.logs.unshift(r.log);
        $('#apPin').value = ''; $('#apPin').dispatchEvent(new Event('input')); $('#apAlasan').value = '';
        showPrivat(r);
      } catch (e) {
        shakePin('#apPin'); toast(e.message, 'danger', 6000);
        try { const b = await api('getBoot', S.token); S.admin = b.admin; } catch (err) { /* abaikan */ }
      }
    });
  }
  function showPrivat(r) {
    S.privat = r;
    const kv = (rows, cols) => rows.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:600px"><thead><tr>' + cols.map(c => '<th>' + c[0] + '</th>').join('') + '</tr></thead><tbody>' + rows.map(x => '<tr style="cursor:default">' + cols.map(c => '<td>' + c[1](x) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '<p class="text-2 p-3 m-0">Tidak ada data privat.</p>';
    const tot = r.transaksi.reduce((a, t) => a + (t.jenis === 'Masuk' ? t.nominal : -t.nominal), 0);
    $('#pvtTitle').textContent = 'Data Privat · ' + r.target.nama;
    $('#pvtSub').innerHTML = '<i class="bi bi-clock"></i> Akses hanya-baca berlaku hingga ' + esc(r.berlakuHingga) + ' WIB · tercatat di Log Akses';
    $('#pvtBody').innerHTML = '<div class="row g-3 mb-3">' + [['Transaksi', r.transaksi.length], ['Dompet', r.dompet.length], ['Tabungan', r.tabungan.length], ['Tagihan', r.tagihan.length]].map(x => '<div class="col-6 col-md-3"><div class="p-3 rounded-4" style="background:var(--privat-bg);color:var(--privat-fg)"><small class="fw-bold">' + x[0] + ' privat</small><div class="font-head fw-bold fs-4">' + x[1] + '</div></div></div>').join('') + '</div>' +
      '<h3 class="section-title mb-2">Transaksi <span class="pill">Neto ' + rp(tot, true) + '</span></h3>' +
      kv(r.transaksi.slice(0, 300), [['Tanggal', t => fmtTgl(t.tanggal) + ' <small class="text-2">' + t.tanggal.slice(11, 16) + '</small>'], ['Kategori', t => esc(kat(t.kategoriId).nama)], ['Catatan', t => esc(t.catatan || '-')], ['Dompet', t => esc((r.dompet.find(d => d.id === t.dompetId) || idx.dompet.get(t.dompetId) || { nama: '-' }).nama)], ['Nominal', t => '<b class="' + (t.jenis === 'Masuk' ? 'text-income' : 'text-expense') + '">' + (t.jenis === 'Masuk' ? '+' : '-') + rp(t.nominal) + '</b>'], ['Bukti', t => t.struk ? '<button type="button" class="btn-x btn-tint-x btn-sm-x" data-action="struk" data-id="' + t.id + '"><i class="bi bi-image"></i>Lihat</button>' : '-']]) +
      '<h3 class="section-title mt-4 mb-2">Dompet</h3>' + kv(r.dompet, [['Nama', d => esc(d.nama)], ['Jenis', d => esc(d.jenis)], ['Saldo awal', d => rp(d.saldoAwal)]]) +
      '<h3 class="section-title mt-4 mb-2">Tabungan</h3>' + kv(r.tabungan, [['Nama', g => esc(g.nama)], ['Saldo', g => rp(g.saldo)], ['Target', g => rp(g.target)]]) +
      '<h3 class="section-title mt-4 mb-2">Tagihan</h3>' + kv(r.tagihan, [['Nama', b => esc(b.nama)], ['Nominal', b => rp(b.nominal)], ['Jatuh tempo', b => fmtTgl(b.jatuhTempo)], ['Status', b => esc(b.lunas)]]);
    showModal('mPrivat');
    if (S.f.adminTab === 'log') renderAdminTab();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  16. FORM: CATAT / EDIT TRANSAKSI (input super cepat)
  // ════════════════════════════════════════════════════════════════════════
  const TF = { mode: 'create', jenis: 'Keluar', kategoriId: '', dompetId: '', privasi: 'Bersama', privTouched: false, file: null, hapusStruk: false, orig: null };
  function katUsage(jenis) {
    const since = addDays(today(), -120), u = {};
    S.transaksi.forEach(t => { if (isMine(t) && t.jenis === jenis && t.tanggal >= since) u[t.kategoriId] = (u[t.kategoriId] || 0) + 1; });
    return u;
  }
  function renderTrxKat() {
    const u = katUsage(TF.jenis);
    const list = S.kategori.filter(k => k.jenis === TF.jenis && (k.status !== 'Nonaktif' || k.id === TF.kategoriId))
      .sort((a, b) => (u[b.id] || 0) - (u[a.id] || 0) || (Number(a.urutan) || 999) - (Number(b.urutan) || 999));
    $('#trxKat').innerHTML = list.map(k => '<button type="button" class="pick ' + (k.id === TF.kategoriId ? 'active' : '') + '" data-id="' + esc(k.id) + '" role="radio" aria-checked="' + (k.id === TF.kategoriId) + '">' + katTile(k) + '<span>' + esc(k.nama) + '</span></button>').join('');
  }
  function renderTrxDompet() {
    const list = activeDompet().slice().sort((a, b) => (b.id === pref.lastDompet) - (a.id === pref.lastDompet));
    $('#trxDompet').innerHTML = list.length ? list.map(d => '<button type="button" class="' + (d.id === TF.dompetId ? 'active' : '') + '" data-id="' + d.id + '" role="radio" aria-checked="' + (d.id === TF.dompetId) + '">' + tile(jenisIcon(d.jenis), d.warna, 'tile-sm') + '<span>' + esc(d.nama) + (d.privasi === 'Privat' ? ' <i class="bi bi-lock-fill text-2"></i>' : '') + '<small class="amt">' + rp(saldoOf(d)) + '</small></span></button>').join('')
      : '<button type="button" data-action="dompet-new"><i class="bi bi-plus-circle"></i>Buat dompet dulu</button>';
    const opts = list.map(d => '<option value="' + d.id + '">' + esc(d.nama) + ' (' + rpShort(saldoOf(d)) + ')</option>').join('');
    $('#trxDari').innerHTML = opts; $('#trxKe').innerHTML = opts;
  }
  function setTrxJenis(j) {
    TF.jenis = j;
    segSet($('#trxSeg'), j);
    const tr = j === 'Transfer';
    $('#trxNormal').hidden = tr; $('#trxTransfer').hidden = !tr; $('#trxFileWrap').hidden = tr;
    if (!tr) {
      const k = idx.kategori.get(TF.kategoriId);
      if (!k || k.jenis !== j) TF.kategoriId = pref['lastKat' + j] && idx.kategori.has(pref['lastKat' + j]) ? pref['lastKat' + j] : '';
      renderTrxKat();
    } else {
      const ds = activeDompet();
      if (ds.length > 1) { $('#trxDari').value = TF.dompetId || ds[0].id; $('#trxKe').value = ds.find(d => d.id !== $('#trxDari').value).id; }
    }
    $('#trxSave').className = 'btn-x ' + (j === 'Masuk' ? 'btn-primary-x' : j === 'Transfer' ? 'btn-accent-x' : 'btn-primary-x');
  }
  function setTrxPriv(p) { TF.privasi = p; segSet($('#trxPriv'), p); }
  function setTrxFile(f) {
    TF.file = f;
    const thumb = $('#trxThumb');
    if (f) {
      thumb.innerHTML = f.preview ? '<img src="' + f.preview + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:11px">' : '<i class="bi bi-file-earmark-pdf"></i>';
      $('#trxFileName').textContent = f.name; $('#trxFileInfo').textContent = (f.size / 1024).toFixed(0) + ' KB · siap diunggah';
      $('#trxFileClear').hidden = false;
    } else {
      const has = TF.orig && TF.orig.struk && !TF.hapusStruk;
      thumb.innerHTML = '<i class="bi ' + (has ? 'bi-paperclip' : 'bi-camera') + '"></i>';
      $('#trxFileName').textContent = has ? 'Bukti sudah terlampir' : 'Ambil foto atau pilih file';
      $('#trxFileInfo').textContent = has ? 'Pilih file baru untuk mengganti' : 'Foto otomatis dikompres agar cepat terkirim';
      $('#trxFileClear').hidden = !has;
    }
  }
  function openTrx(jenis, preset) {
    preset = preset || {};
    if (!activeDompet().length) { toast('Buat dompet terlebih dahulu.', 'info'); openDompet(); return; }
    Object.assign(TF, { mode: 'create', orig: null, file: null, hapusStruk: false, privTouched: false, kategoriId: preset.kategoriId || '' });
    TF.dompetId = preset.dompetId || (idx.dompet.has(pref.lastDompet) && idx.dompet.get(pref.lastDompet).status !== 'Arsip' ? pref.lastDompet : activeDompet()[0].id);
    $('#mTrxTitle').textContent = 'Catat Transaksi';
    $('#trxNominal').value = preset.nominal ? fmtNum(preset.nominal) : '';
    $('#trxCatatan').value = preset.catatan || '';
    $('#trxTanggal').value = toInputDT(nowLocal());
    $$('#trxSeg button').forEach(b => { b.disabled = false; });
    $('#trxSaveMore').hidden = false;
    clearTrxErrors();
    renderTrxDompet();
    setTrxJenis(jenis || 'Keluar');
    const d = idx.dompet.get(TF.dompetId);
    setTrxPriv(d && d.privasi === 'Privat' ? 'Privat' : (S.me.privasiDefault || 'Bersama'));
    setTrxFile(null);
    fillCatatanList();
    showModal('mTrx');
  }
  function openEditTrx(id) {
    const t = S.transaksi.find(x => x.id === id);
    if (!t || !isMine(t) || !isFlow(t)) return;
    Object.assign(TF, { mode: 'edit', orig: t, file: null, hapusStruk: false, privTouched: true, kategoriId: t.kategoriId, dompetId: t.dompetId });
    $('#mTrxTitle').textContent = 'Edit Transaksi';
    $('#trxNominal').value = fmtNum(t.nominal);
    $('#trxCatatan').value = t.catatan || '';
    $('#trxTanggal').value = toInputDT(t.tanggal);
    $('#trxSaveMore').hidden = true;
    clearTrxErrors();
    renderTrxDompet();
    setTrxJenis(t.jenis);
    $$('#trxSeg button').forEach(b => { b.disabled = b.dataset.v === 'Transfer'; });
    setTrxPriv(t.privasi);
    setTrxFile(null);
    fillCatatanList();
    showModal('mTrx');
  }
  function fillCatatanList() {
    const seen = new Set(), out = [];
    for (const t of S.transaksi) { if (isMine(t) && t.catatan && !seen.has(t.catatan)) { seen.add(t.catatan); out.push(t.catatan); if (out.length >= 30) break; } }
    $('#dlCatatan').innerHTML = out.map(c => '<option value="' + esc(c) + '">').join('');
  }
  function clearTrxErrors() { ['#trxNominalErr', '#trxKatErr', '#trxDompetErr'].forEach(s => { $(s).hidden = true; }); }
  function submitTrx(more) {
    clearTrxErrors();
    const nominal = parseNom($('#trxNominal').value);
    const tanggal = $('#trxTanggal').value.replace('T', ' ').slice(0, 16);
    const catatan = $('#trxCatatan').value.trim();
    let bad = false;
    if (!nominal) { $('#trxNominalErr').hidden = false; bad = true; }
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(tanggal)) { toast('Tanggal tidak valid.', 'warning'); bad = true; }
    if (TF.jenis === 'Transfer') {
      const dari = $('#trxDari').value, ke = $('#trxKe').value;
      if (!dari || !ke || dari === ke) { toast('Pilih dompet asal dan tujuan yang berbeda.', 'warning'); bad = true; }
      if (bad) return;
      const idK = uuid(), idM = uuid(), base = { tanggal: tanggal, nominal: nominal, catatan: catatan, privasi: TF.privasi, kategoriId: SYS.TRANSFER, struk: '', pemilik: S.me.id, dibuatOleh: S.me.id, tanggalInput: nowFull(), _pending: true };
      const a = Object.assign({}, base, { id: idK, jenis: 'Keluar', dompetId: dari, refId: idM }), b = Object.assign({}, base, { id: idM, jenis: 'Masuk', dompetId: ke, refId: idK });
      mutate({
        apply: () => [upsert('transaksi', a), upsert('transaksi', b)], ok: 'Pindah saldo ' + rp(nominal) + ' dicatat',
        call: () => api('simpanTransfer', S.token, { idKeluar: idK, idMasuk: idM, tanggal: tanggal, dariId: dari, keId: ke, nominal: nominal, catatan: catatan, privasi: TF.privasi }),
        done: res => (res || []).forEach(x => putServer('transaksi', x))
      });
      afterTrxSave(more);
      return;
    }
    if (!TF.kategoriId) { $('#trxKatErr').hidden = false; bad = true; }
    if (!TF.dompetId) { $('#trxDompetErr').hidden = false; bad = true; }
    if (bad) return;
    const o = TF.orig, id = o ? o.id : uuid();
    const obj = Object.assign({}, o || {}, {
      id: id, tanggal: tanggal, dompetId: TF.dompetId, kategoriId: TF.kategoriId, jenis: TF.jenis, nominal: nominal, catatan: catatan, privasi: TF.privasi,
      pemilik: o ? o.pemilik : S.me.id, dibuatOleh: o ? o.dibuatOleh : S.me.id, tanggalInput: o ? o.tanggalInput : nowFull(), refId: o ? o.refId : '',
      struk: TF.file ? (TF.file.mime === 'application/pdf' ? 'pdf' : 'img') : (TF.hapusStruk ? '' : (o ? o.struk : '')), _pending: true
    });
    const payload = { id: id, tanggal: tanggal, dompetId: TF.dompetId, kategoriId: TF.kategoriId, jenis: TF.jenis, nominal: nominal, catatan: catatan, privasi: TF.privasi, hapusStruk: TF.hapusStruk && !TF.file };
    const file = TF.file ? { mime: TF.file.mime, data: TF.file.data, name: TF.file.name } : null;
    if (file) { localStruk.set(id, file); strukCache.delete(id); }
    pref.lastDompet = TF.dompetId; pref['lastKat' + TF.jenis] = TF.kategoriId; savePref();
    const msg = o ? 'Perubahan disimpan' : (TF.jenis === 'Masuk' ? 'Pemasukan ' : 'Pengeluaran ') + rp(nominal) + ' dicatat';
    mutate({
      apply: () => [upsert('transaksi', obj)], ok: msg,
      call: () => api('simpanTransaksi', S.token, payload, file),
      done: res => putServer('transaksi', res),
      undo: () => { if (file) localStruk.delete(id); }
    });
    afterTrxSave(more);
  }
  function afterTrxSave(more) {
    if (more) {
      $('#trxNominal').value = ''; $('#trxCatatan').value = ''; $('#trxTanggal').value = toInputDT(nowLocal());
      setTrxFile(null); renderTrxDompet(); if (TF.jenis !== 'Transfer') renderTrxKat();
      $('#trxNominal').focus();
    } else modal('mTrx').hide();
  }

  // Kompres foto di klien → unggah jauh lebih cepat
  function fileB64(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Gagal membaca file.')); r.readAsDataURL(file); });
  }
  async function prepFile(file) {
    const ok = ['image/jpeg', 'image/png', 'application/pdf'];
    if (ok.indexOf(file.type) < 0) throw new Error('Format harus JPG, PNG, atau PDF.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran file maksimal 5 MB.');
    if (file.type === 'application/pdf') return { mime: file.type, data: await fileB64(file), name: file.name, size: file.size, preview: null };
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Gambar tidak dapat dibaca.')); i.src = url; });
      const max = 1600, sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.82), data = dataUrl.split(',')[1], size = Math.round(data.length * 0.75);
      if (size >= file.size && file.type === 'image/jpeg') return { mime: file.type, data: await fileB64(file), name: file.name, size: file.size, preview: dataUrl };
      return { mime: 'image/jpeg', data: data, name: file.name.replace(/\.\w+$/, '') + '.jpg', size: size, preview: dataUrl };
    } finally { URL.revokeObjectURL(url); }
  }
  async function handleTrxFile(file) {
    if (!file) return;
    try { setTrxFile(await prepFile(file)); TF.hapusStruk = false; } catch (e) { toast(e.message, 'warning'); }
    $('#trxFile').value = '';
  }

  // ── Detail transaksi ───────────────────────────────────────────────────
  function openDetail(id) {
    const t = S.transaksi.find(x => x.id === id);
    if (!t) return;
    const v = trxView(t), mine = isMine(t), u = userObj(t.pemilik);
    $('#detailBody').innerHTML = '<div class="detail-hero">' + katTile(v.k, 'tile-lg') + '<div class="fw-bold mt-2">' + esc(v.title) + '</div><span class="amt ' + v.cls + '">' + v.amt + '</span>' + (t._pending ? '<span class="pill mt-2"><span class="spin" style="width:10px;height:10px;border-width:2px"></span>Menyinkronkan…</span>' : '') + '</div>' +
      '<dl class="kv"><dt>Tanggal</dt><dd>' + fmtHari(t.tanggal) + ', ' + t.tanggal.slice(11, 16) + ' WIB</dd>' +
      '<dt>Dompet</dt><dd><span class="pill pill-dot" style="--dot:' + esc(dompetColor(t.dompetId)) + '">' + esc(dompetName(t.dompetId)) + '</span></dd>' +
      '<dt>Kategori</dt><dd>' + esc(v.k.nama) + '</dd>' +
      (t.kategoriId === SYS.TRANSFER ? '<dt>Arah</dt><dd>' + esc(v.sub) + '</dd>' : '') +
      '<dt>Catatan</dt><dd>' + esc(t.catatan || '—') + '</dd>' +
      '<dt>Dicatat oleh</dt><dd class="d-flex align-items-center gap-2">' + avatar(u, 'avatar-xs') + esc(u.nama) + '</dd>' +
      '<dt>Visibilitas</dt><dd>' + badgePriv(t.privasi) + '</dd>' +
      '<dt>Bukti</dt><dd>' + (t.struk ? '<button type="button" class="btn-x btn-tint-x btn-sm-x" data-action="struk" data-id="' + t.id + '"><i class="bi ' + (t.struk === 'pdf' ? 'bi-file-earmark-pdf' : 'bi-image') + '"></i>Lihat bukti</button>' : '<span class="text-2">Tidak ada</span>') + '</dd>' +
      (t.tanggalInput ? '<dt>Diinput</dt><dd class="text-2">' + esc(String(t.tanggalInput).slice(0, 16)) + '</dd>' : '') + '</dl>';
    let foot = '';
    if (mine && t.kategoriId !== SYS.TABUNGAN) foot += '<button type="button" class="btn-x btn-danger-x me-auto" data-action="trx-del" data-id="' + t.id + '"><i class="bi bi-trash3"></i>Hapus</button>';
    if (mine && isFlow(t)) foot += '<button type="button" class="btn-x btn-primary-x" data-action="trx-edit" data-id="' + t.id + '"><i class="bi bi-pencil"></i>Edit</button>';
    if (!mine) foot = '<span class="text-2 small me-auto"><i class="bi bi-info-circle"></i> Hanya pemilik yang dapat mengubah transaksi ini.</span>';
    if (mine && t.kategoriId === SYS.TABUNGAN) foot = '<span class="text-2 small me-auto"><i class="bi bi-info-circle"></i> Kelola dari halaman Tabungan (Setor/Tarik).</span><button type="button" class="btn-x btn-soft-x" data-go="tabungan" data-bs-dismiss="modal">Ke Tabungan</button>';
    $('#detailFoot').innerHTML = foot || '<button type="button" class="btn-x btn-soft-x" data-bs-dismiss="modal">Tutup</button>';
    showModal('mDetail');
  }
  async function deleteTrx(id) {
    const t = S.transaksi.find(x => x.id === id);
    if (!t) return;
    const pair = t.kategoriId === SYS.TRANSFER ? S.transaksi.find(x => x.id === t.refId) : null;
    const ok = await confirmBox({ title: 'Hapus transaksi?', body: (pair ? 'Kedua sisi pindah saldo akan dihapus. ' : '') + trxView(t).title + ' · ' + rp(t.nominal) + '. Tindakan ini tidak dapat dibatalkan.', ok: 'Ya, hapus', reopen: true });
    if (!ok) return;
    mutate({
      apply: () => [removeById('transaksi', id)].concat(pair ? [removeById('transaksi', pair.id)] : []),
      ok: 'Transaksi dihapus', fail: 'Gagal menghapus',
      call: () => api('hapusTransaksi', S.token, id)
    });
  }

  // ── Pratinjau struk (modal, tanpa tab baru) ────────────────────────────
  async function viewStruk(id) {
    const body = $('#pvBody'), dl = $('#pvDownload');
    body.innerHTML = '<div class="text-center text-2"><span class="spin" style="width:28px;height:28px;color:var(--c-primary)"></span><div class="mt-2 fw-bold">Memuat bukti…</div></div>';
    dl.disabled = true;
    showModal('mPreview');
    try {
      let f = localStruk.get(id) || strukCache.get(id);
      if (!f) { f = await api('getStruk', S.token, id); strukCache.set(id, f); }
      if (/^image\//.test(f.mime)) body.innerHTML = '<img src="data:' + esc(f.mime) + ';base64,' + f.data + '" alt="Bukti transaksi">';
      else {
        const bin = atob(f.data), u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' }));
        body.innerHTML = '<iframe src="' + url + '" title="Bukti PDF"></iframe><p class="text-2 small mt-2 mb-0">PDF tidak tampil? Tekan tombol Unduh.</p>';
      }
      dl.disabled = false;
      dl.onclick = () => downloadB64(f.data, f.mime, f.name || 'bukti');
    } catch (e) {
      body.innerHTML = empty('Bukti tidak dapat dimuat', esc(e.message));
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  17. FORM: DOMPET, KATEGORI, TABUNGAN, SETOR, TAGIHAN, BAYAR
  // ════════════════════════════════════════════════════════════════════════
  function swatches(el, cur, onPick) {
    el.innerHTML = COLORS.map(c => '<button type="button" class="swatch ' + (c.toUpperCase() === String(cur).toUpperCase() ? 'active' : '') + '" style="background:' + c + '" data-c="' + c + '" aria-label="Warna ' + c + '"></button>').join('') +
      '<label class="swatch-custom" title="Warna lain"><input type="color" value="' + esc(cur || '#12B886') + '" aria-label="Pilih warna lain"></label>';
    el.onclick = e => { const b = e.target.closest('[data-c]'); if (b) onPick(b.dataset.c); };
    $('input', el).onchange = e => onPick(e.target.value.toUpperCase());
  }
  function icons(el, list, cur, onPick) {
    el.innerHTML = list.map(i => '<button type="button" class="' + (i === cur ? 'active' : '') + '" data-i="' + i + '" aria-label="' + i.replace('bi-', '') + '"><i class="bi ' + i + '"></i></button>').join('');
    el.onclick = e => { const b = e.target.closest('[data-i]'); if (b) onPick(b.dataset.i); };
  }
  function segSet(el, v) { if (!el) return; $$('button[data-v]', el).forEach(b => { const on = b.dataset.v === v; b.classList.toggle('active', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }); }
  function segGet(el) { const b = $('button.active', el); return b ? b.dataset.v : ''; }
  function segBind(el, cb) { if (!el) return; el.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b || b.disabled) return; segSet(el, b.dataset.v); if (cb) cb(b.dataset.v); }); }
  function nominalInput(el) { if (el && !el._nom) { el._nom = true; el.addEventListener('input', () => { const v = parseNom(el.value); el.value = v ? fmtNum(v) : ''; }); } }
  const invalid = (el, on) => { el.classList.toggle('is-invalid', !!on); return !!on; };

  // Dompet
  let DF = { id: null, warna: '#12B886' };
  function openDompet(id) {
    const d = id ? idx.dompet.get(id) : null;
    if (d && !isMine(d)) return toast('Hanya pemilik yang dapat mengubah dompet ini.', 'info');
    DF = { id: d ? d.id : null, warna: d ? d.warna : COLORS[S.dompet.length % COLORS.length] };
    $('#mDompetTitle').textContent = d ? 'Ubah Dompet' : 'Dompet Baru';
    $('#dpNama').value = d ? d.nama : '';
    const std = ['Cash', 'Rekening Bank', 'E-Wallet'];
    $('#dpJenis').value = !d ? 'Rekening Bank' : std.indexOf(d.jenis) >= 0 ? d.jenis : '__custom';
    $('#dpJenisCustom').value = d && std.indexOf(d.jenis) < 0 ? d.jenis : '';
    $('#dpCustomWrap').hidden = $('#dpJenis').value !== '__custom';
    $('#dpSaldo').value = d ? fmtNum(d.saldoAwal) : '';
    segSet($('#dpPriv'), d ? d.privasi : (S.me.privasiDefault || 'Bersama'));
    const paint = () => swatches($('#dpWarna'), DF.warna, c => { DF.warna = c; paint(); });
    paint();
    const del = $('#dpDel');
    del.hidden = !d;
    if (d) del.innerHTML = d.status === 'Arsip' ? '<i class="bi bi-box-arrow-up"></i>Aktifkan lagi' : '<i class="bi bi-archive"></i>Arsipkan / Hapus';
    $$('#formDompet .is-invalid').forEach(x => x.classList.remove('is-invalid'));
    showModal('mDompet');
  }
  function submitDompet() {
    const nama = $('#dpNama').value.trim(), jSel = $('#dpJenis').value, jenis = jSel === '__custom' ? $('#dpJenisCustom').value.trim() : jSel;
    if (invalid($('#dpNama'), !nama) | invalid($('#dpJenisCustom'), jSel === '__custom' && jenis.length < 2)) return;
    const raw = $('#dpSaldo').value.trim(), neg = /^-/.test(raw), saldoAwal = parseNom(raw) * (neg ? -1 : 1);
    const old = DF.id ? idx.dompet.get(DF.id) : null;
    const obj = Object.assign({}, old || { pemilik: S.me.id, status: 'Aktif', hiddenNet: 0, dibuat: nowFull() }, { id: DF.id || uuid(), nama: nama, jenis: jenis, saldoAwal: saldoAwal, privasi: segGet($('#dpPriv')), warna: DF.warna, _pending: true });
    mutate({
      apply: () => [upsert('dompet', obj)], ok: old ? 'Dompet diperbarui' : 'Dompet "' + nama + '" ditambahkan',
      call: () => api('simpanDompet', S.token, { id: obj.id, nama: nama, jenis: jenis, saldoAwal: saldoAwal, privasi: obj.privasi, warna: obj.warna, status: obj.status }),
      done: res => putServer('dompet', Object.assign(res, { hiddenNet: obj.hiddenNet || 0 }))
    });
    modal('mDompet').hide();
  }
  async function archiveDompet() {
    const d = idx.dompet.get(DF.id);
    if (!d) return;
    if (d.status === 'Arsip') {
      const obj = Object.assign({}, d, { status: 'Aktif', _pending: true });
      mutate({ apply: () => [upsert('dompet', obj)], ok: 'Dompet diaktifkan lagi', call: () => api('simpanDompet', S.token, { id: d.id, nama: d.nama, jenis: d.jenis, saldoAwal: d.saldoAwal, privasi: d.privasi, warna: d.warna, status: 'Aktif' }), done: res => putServer('dompet', Object.assign(res, { hiddenNet: d.hiddenNet || 0 })) });
      modal('mDompet').hide();
      return;
    }
    const used = S.transaksi.some(t => t.dompetId === d.id);
    const ok = await confirmBox({ title: used ? 'Arsipkan dompet?' : 'Hapus dompet?', body: used ? 'Dompet sudah punya transaksi, jadi akan diarsipkan (riwayat tetap aman) dan tidak muncul di pilihan baru.' : 'Dompet belum dipakai dan akan dihapus permanen.', ok: used ? 'Arsipkan' : 'Hapus', icon: used ? 'bi-archive' : 'bi-trash3' });
    if (!ok) return;
    mutate({
      apply: () => [used ? upsert('dompet', Object.assign({}, d, { status: 'Arsip', _pending: true })) : removeById('dompet', d.id)],
      ok: used ? 'Dompet diarsipkan' : 'Dompet dihapus',
      call: () => api('hapusDompet', S.token, d.id),
      done: res => { if (res && res.dompet) putServer('dompet', Object.assign(res.dompet, { hiddenNet: d.hiddenNet || 0 })); }
    });
  }

  // Kategori
  let KF = { id: null, ikon: 'bi-tag', warna: '#FF7A59', jenis: 'Keluar' };
  function openKategori(id, jenis) {
    const k = id ? idx.kategori.get(id) : null;
    if (k && !canEditKat(k)) return toast(k.tipe === 'Default' ? 'Kategori default hanya dapat diubah Super Admin.' : k.tipe === 'Sistem' ? 'Kategori sistem tidak dapat diubah.' : 'Hanya pembuat kategori yang dapat mengubahnya.', 'info');
    KF = { id: k ? k.id : null, ikon: k ? k.ikon : 'bi-tag', warna: k ? k.warna : COLORS[(S.kategori.length + 3) % COLORS.length], jenis: k ? k.jenis : (jenis || 'Keluar') };
    $('#mKatTitle').textContent = k ? 'Ubah Kategori' : 'Kategori Baru';
    $('#ktNama').value = k ? k.nama : '';
    $('#ktStatusWrap').hidden = !k; $('#ktAktif').checked = !k || k.status !== 'Nonaktif';
    $('#ktDel').hidden = !k;
    const prev = () => { $('#ktPreview').style.background = tint(KF.warna, 0.14); $('#ktPreview').style.color = ink(KF.warna); $('#ktPreview').innerHTML = '<i class="bi ' + KF.ikon + '"></i>'; };
    const paintI = () => icons($('#ktIkon'), ICONS_KAT, KF.ikon, i => { KF.ikon = i; paintI(); prev(); });
    const paintW = () => swatches($('#ktWarna'), KF.warna, c => { KF.warna = c; paintW(); prev(); });
    paintI(); paintW(); prev();
    segSet($('#ktJenis'), KF.jenis);
    $('#ktNama').classList.remove('is-invalid');
    showModal('mKategori');
  }
  function submitKategori() {
    const nama = $('#ktNama').value.trim();
    if (invalid($('#ktNama'), !nama)) return;
    const old = KF.id ? idx.kategori.get(KF.id) : null;
    const obj = Object.assign({}, old || { tipe: 'Manual', pemilik: S.me.id, urutan: 999 }, { id: KF.id || uuid(), nama: nama, jenis: segGet($('#ktJenis')), ikon: KF.ikon, warna: KF.warna, status: $('#ktAktif').checked ? 'Aktif' : 'Nonaktif' });
    mutate({ apply: () => [upsert('kategori', obj)], ok: old ? 'Kategori diperbarui' : 'Kategori "' + nama + '" ditambahkan', call: () => api('simpanKategori', S.token, obj), done: res => putServer('kategori', res) });
    S.f.katTab = obj.jenis;
    modal('mKategori').hide();
  }
  async function deleteKategori() {
    const k = idx.kategori.get(KF.id);
    if (!k) return;
    const used = S.transaksi.some(t => t.kategoriId === k.id) || S.tagihan.some(t => t.kategoriId === k.id);
    const ok = await confirmBox({ title: used ? 'Nonaktifkan kategori?' : 'Hapus kategori?', body: used ? 'Kategori sudah dipakai di transaksi, jadi hanya dinonaktifkan (riwayat tetap tampil).' : 'Kategori "' + k.nama + '" akan dihapus permanen.', ok: used ? 'Nonaktifkan' : 'Hapus' });
    if (!ok) return;
    mutate({ apply: () => [used ? upsert('kategori', Object.assign({}, k, { status: 'Nonaktif' })) : removeById('kategori', k.id)], ok: used ? 'Kategori dinonaktifkan' : 'Kategori dihapus', call: () => api('hapusKategori', S.token, k.id), done: res => { if (res && res.kategori) putServer('kategori', res.kategori); } });
  }

  // Tabungan
  let GF = { id: null, ikon: 'bi-piggy-bank', warna: '#12B886' };
  function openTabungan(id) {
    const g = id ? idx.tab.get(id) : null;
    if (g && !isMine(g)) return toast('Hanya pemilik yang dapat mengubah pos tabungan ini.', 'info');
    GF = { id: g ? g.id : null, ikon: g ? g.ikon : 'bi-piggy-bank', warna: g ? g.warna : COLORS[S.tabungan.length % COLORS.length] };
    $('#mTabTitle').textContent = g ? 'Ubah Pos Tabungan' : 'Pos Tabungan Baru';
    $('#tbNama').value = g ? g.nama : ''; $('#tbTarget').value = g ? fmtNum(g.target) : ''; $('#tbTgl').value = g ? g.targetTanggal : '';
    $('#tbCatatan').value = g ? g.catatan : ''; $('#tbAwal').value = ''; $('#tbAwalWrap').hidden = !!g;
    segSet($('#tbPriv'), g ? g.privasi : (S.me.privasiDefault || 'Bersama'));
    const paintI = () => icons($('#tbIkon'), ICONS_TAB, GF.ikon, i => { GF.ikon = i; paintI(); });
    const paintW = () => swatches($('#tbWarna'), GF.warna, c => { GF.warna = c; paintW(); });
    paintI(); paintW();
    $('#tbDel').hidden = !g;
    $$('#formTabungan .is-invalid').forEach(x => x.classList.remove('is-invalid'));
    showModal('mTabungan');
  }
  function submitTabungan() {
    const nama = $('#tbNama').value.trim(), target = parseNom($('#tbTarget').value);
    if (invalid($('#tbNama'), !nama) | invalid($('#tbTarget'), !target)) return;
    const old = GF.id ? idx.tab.get(GF.id) : null, awal = old ? 0 : parseNom($('#tbAwal').value);
    const obj = Object.assign({}, old || { pemilik: S.me.id, saldo: awal, status: 'Aktif', dibuat: nowFull() }, { id: GF.id || uuid(), nama: nama, target: target, privasi: segGet($('#tbPriv')), ikon: GF.ikon, warna: GF.warna, targetTanggal: $('#tbTgl').value, catatan: $('#tbCatatan').value.trim() });
    const mutId = uuid();
    const mut = awal > 0 ? { id: mutId, tabunganId: obj.id, tanggal: nowLocal(), jenis: 'Saldo Awal', nominal: awal, dompetId: '', transaksiId: '', catatan: 'Saldo awal', oleh: S.me.id, tanggalInput: nowFull() } : null;
    mutate({
      apply: () => [upsert('tabungan', obj)].concat(mut ? [upsert('mutasiTabungan', mut)] : []), ok: old ? 'Pos tabungan diperbarui' : 'Pos "' + nama + '" dibuat. Semangat menabung!',
      call: () => api('simpanTabungan', S.token, Object.assign({}, obj, { saldoAwal: awal, mutasiId: mutId })),
      done: res => { putServer('tabungan', res.tabungan); if (res.mutasi) putServer('mutasiTabungan', res.mutasi); }
    });
    modal('mTabungan').hide();
  }
  async function deleteTabungan() {
    const g = idx.tab.get(GF.id);
    if (!g) return;
    if (g.saldo > 0) return toast('Tarik saldo pos ini terlebih dahulu sebelum menghapus.', 'warning');
    if (!(await confirmBox({ title: 'Hapus pos tabungan?', body: '"' + g.nama + '" dan riwayat setorannya akan dihapus.', ok: 'Hapus' }))) return;
    const muts = S.mutasiTabungan.filter(m => m.tabunganId === g.id);
    mutate({ apply: () => [removeById('tabungan', g.id)].concat(muts.map(m => removeById('mutasiTabungan', m.id))), ok: 'Pos tabungan dihapus', call: () => api('hapusTabungan', S.token, g.id) });
  }
  let SF = { id: null };
  function openSetor(id, jenis) {
    const g = idx.tab.get(id);
    if (!g) return;
    SF = { id: id };
    segSet($('#stJenis'), jenis);
    const upd = () => {
      const j = segGet($('#stJenis'));
      $('#mSetorTitle').textContent = (j === 'Setor' ? 'Setor ke ' : 'Tarik dari ') + g.nama;
      $('#stDompetLbl').textContent = j === 'Setor' ? 'Ambil dari dompet' : 'Masukkan ke dompet';
      $('#stSave').className = 'btn-x ' + (j === 'Setor' ? 'btn-primary-x' : 'btn-accent-x');
    };
    $('#stJenis').onclick = e => { if (e.target.closest('button[data-v]')) { segSet($('#stJenis'), e.target.closest('button[data-v]').dataset.v); upd(); } };
    upd();
    $('#stInfo').innerHTML = tile(g.ikon, g.warna) + '<div class="lr-main"><div class="lr-title">' + esc(g.nama) + '</div><div class="lr-sub">Saldo ' + rp(g.saldo) + ' dari target ' + rp(g.target) + '</div></div>' + badgePriv(g.privasi);
    $('#stNominal').value = ''; $('#stCatatan').value = '';
    $('#stDompet').innerHTML = '<option value="">Tidak dicatat di dompet</option>' + activeDompet().map(d => '<option value="' + d.id + '">' + esc(d.nama) + ' (' + rpShort(saldoOf(d)) + ')</option>').join('');
    $('#stDompet').value = idx.dompet.has(pref.lastDompet) ? pref.lastDompet : '';
    showModal('mSetor');
  }
  function submitSetor() {
    const g = idx.tab.get(SF.id), jenis = segGet($('#stJenis')), nominal = parseNom($('#stNominal').value), dompetId = $('#stDompet').value, catatan = $('#stCatatan').value.trim();
    if (!g) return;
    if (!nominal) { $('#stNominal').focus(); return toast('Isi nominal terlebih dahulu.', 'warning'); }
    if (jenis === 'Tarik' && nominal > g.saldo) return toast('Saldo tabungan tidak cukup (' + rp(g.saldo) + ').', 'warning');
    const before = pct(g.saldo, g.target);
    const id = uuid(), trxId = dompetId ? uuid() : '', tanggal = nowLocal();
    const ng = Object.assign({}, g, { saldo: g.saldo + (jenis === 'Setor' ? nominal : -nominal) });
    const mut = { id: id, tabunganId: g.id, tanggal: tanggal, jenis: jenis, nominal: nominal, dompetId: dompetId, transaksiId: trxId, catatan: catatan, oleh: S.me.id, tanggalInput: nowFull() };
    const trx = dompetId ? { id: trxId, tanggal: tanggal, dompetId: dompetId, kategoriId: SYS.TABUNGAN, jenis: jenis === 'Setor' ? 'Keluar' : 'Masuk', nominal: nominal, catatan: (jenis === 'Setor' ? 'Setor ke ' : 'Tarik dari ') + g.nama + (catatan ? ' · ' + catatan : ''), struk: '', pemilik: S.me.id, privasi: g.privasi, dibuatOleh: S.me.id, tanggalInput: nowFull(), refId: g.id, _pending: true } : null;
    if (dompetId) { pref.lastDompet = dompetId; savePref(); }
    mutate({
      apply: () => [upsert('tabungan', ng), upsert('mutasiTabungan', mut)].concat(trx ? [upsert('transaksi', trx)] : []),
      ok: (jenis === 'Setor' ? 'Setor ' : 'Tarik ') + rp(nominal) + (jenis === 'Setor' ? ' ke ' : ' dari ') + g.nama,
      call: () => api('mutasiTabungan', S.token, { id: id, tabunganId: g.id, jenis: jenis, nominal: nominal, dompetId: dompetId, transaksiId: trxId, catatan: catatan, tanggal: tanggal }),
      done: res => { putServer('tabungan', res.tabungan); putServer('mutasiTabungan', res.mutasi); if (res.transaksi) putServer('transaksi', res.transaksi); }
    });
    modal('mSetor').hide();
    if (jenis === 'Setor' && before < 1 && pct(ng.saldo, ng.target) >= 1) { confetti(); setTimeout(() => toast('Target Tercapai! "' + g.nama + '" sudah 100%. Selamat!', 'success', 5000), 400); }
  }

  // Tagihan
  let BF = { id: null, ikon: 'bi-receipt' };
  function dompetOpts(sel, val, none) {
    sel.innerHTML = (none ? '<option value="">' + none + '</option>' : '') + activeDompet().map(d => '<option value="' + d.id + '">' + esc(d.nama) + '</option>').join('');
    sel.value = val || (none ? '' : (activeDompet()[0] || {}).id || '');
  }
  function katKeluarOpts(sel, val, none) {
    sel.innerHTML = (none ? '<option value="">' + none + '</option>' : '') + S.kategori.filter(k => k.jenis === 'Keluar' && (k.status !== 'Nonaktif' || k.id === val)).map(k => '<option value="' + k.id + '">' + esc(k.nama) + '</option>').join('');
    sel.value = val || '';
  }
  function openTagihan(id) {
    const b = id ? S.tagihan.find(x => x.id === id) : null;
    if (b && !isMine(b)) return toast('Hanya pemilik yang dapat mengubah tagihan ini.', 'info');
    BF = { id: b ? b.id : null, ikon: b ? b.ikon : 'bi-receipt' };
    $('#mTgTitle').textContent = b ? 'Ubah Tagihan' : 'Tagihan Baru';
    $('#tgPreset').innerHTML = TAGIHAN_PRESET.map((p, i) => '<button type="button" data-i="' + i + '">' + tile(p.ikon, '#FFB020', 'tile-sm') + '<span>' + p.nama + '</span></button>').join('');
    $('#tgPreset').onclick = e => {
      const x = e.target.closest('[data-i]'); if (!x) return;
      const p = TAGIHAN_PRESET[x.dataset.i]; $$('#tgPreset button').forEach(q => q.classList.toggle('active', q === x));
      $('#tgNama').value = p.nama; BF.ikon = p.ikon; if (idx.kategori.has(p.kat)) $('#tgKategori').value = p.kat; $('#tgUlang').checked = true; $('#tgPeriode').disabled = false; $('#tgNominal').focus();
    };
    $('#tgNama').value = b ? b.nama : ''; $('#tgNominal').value = b ? fmtNum(b.nominal) : '';
    $('#tgTempo').value = b ? b.jatuhTempo : addDays(today(), 7);
    $('#tgUlang').checked = b ? b.berulang === 'Ya' : true; $('#tgPeriode').value = b && b.periode ? b.periode : 'Bulanan'; $('#tgPeriode').disabled = !$('#tgUlang').checked;
    katKeluarOpts($('#tgKategori'), b ? b.kategoriId : 'KAT-UTILITAS', '— Pilih kategori —');
    dompetOpts($('#tgDompet'), b ? b.dompetId : '', '— Belum ditentukan —');
    $('#tgCatatan').value = b ? b.catatan : '';
    segSet($('#tgPriv'), b ? b.privasi : (S.me.privasiDefault || 'Bersama'));
    $('#tgDel').hidden = !b;
    $$('#formTagihan .is-invalid').forEach(x => x.classList.remove('is-invalid'));
    showModal('mTagihan');
  }
  function submitTagihan() {
    const nama = $('#tgNama').value.trim(), nominal = parseNom($('#tgNominal').value), tempo = $('#tgTempo').value;
    if (invalid($('#tgNama'), !nama) | invalid($('#tgNominal'), !nominal) | invalid($('#tgTempo'), !tempo)) return;
    const old = BF.id ? S.tagihan.find(x => x.id === BF.id) : null, id = BF.id || uuid();
    const data = { id: id, nama: nama, nominal: nominal, jatuhTempo: tempo, berulang: $('#tgUlang').checked ? 'Ya' : 'Tidak', periode: $('#tgUlang').checked ? $('#tgPeriode').value : '', privasi: segGet($('#tgPriv')), kategoriId: $('#tgKategori').value, dompetId: $('#tgDompet').value, ikon: BF.ikon, catatan: $('#tgCatatan').value.trim() };
    const obj = Object.assign({}, old || { pemilik: S.me.id, lunas: 'Belum Lunas', tanggalLunas: '', dibayarOleh: '', transaksiId: '', induk: id, dibuat: nowFull() }, data);
    mutate({ apply: () => [upsert('tagihan', obj)], ok: old ? 'Tagihan diperbarui' : 'Tagihan "' + nama + '" ditambahkan', call: () => api('simpanTagihan', S.token, data), done: res => putServer('tagihan', res) });
    modal('mTagihan').hide();
  }
  async function deleteTagihan() {
    const b = S.tagihan.find(x => x.id === BF.id);
    if (!b) return;
    if (!(await confirmBox({ title: 'Hapus tagihan?', body: '"' + b.nama + '" akan dihapus dari daftar dan pengingat.', ok: 'Hapus' }))) return;
    mutate({ apply: () => [removeById('tagihan', b.id)], ok: 'Tagihan dihapus', call: () => api('hapusTagihan', S.token, b.id) });
  }
  function nextDue(dateStr, periode, anchorDay) {
    const d = parseD(dateStr);
    if (periode === 'Mingguan') return addDays(dateStr, 7);
    const n = { 'Bulanan': 1, '3 Bulanan': 3, '6 Bulanan': 6, 'Tahunan': 12 }[periode] || 1;
    const y = d.getFullYear(), m = d.getMonth() + n, last = new Date(y, m + 1, 0).getDate();
    return ymd(new Date(y, m, Math.min(anchorDay || d.getDate(), last)));
  }
  let PF = { id: null };
  function openBayar(id) {
    const b = S.tagihan.find(x => x.id === id);
    if (!b) return;
    if (b.lunas === 'Lunas') return toast('Tagihan ini sudah lunas.', 'info');
    PF = { id: id };
    const d = daysBetween(today(), b.jatuhTempo), u = urgency(d);
    $('#byInfo').innerHTML = tile(b.ikon || 'bi-receipt', u.color) + '<div class="lr-main"><div class="lr-title">' + esc(b.nama) + '</div><div class="lr-sub">Jatuh tempo ' + fmtTgl(b.jatuhTempo) + ' · <span class="pill ' + u.cls + '">' + u.text + '</span></div></div><b class="amt">' + rp(b.nominal) + '</b>';
    $('#byCatat').checked = activeDompet().length > 0;
    $('#byFields').hidden = !$('#byCatat').checked;
    dompetOpts($('#byDompet'), b.dompetId && idx.dompet.has(b.dompetId) ? b.dompetId : pref.lastDompet);
    katKeluarOpts($('#byKategori'), b.kategoriId || 'KAT-UTILITAS');
    $('#byNominal').value = fmtNum(b.nominal);
    $('#byTanggal').value = toInputDT(nowLocal());
    const nx = $('#byNext');
    if (b.berulang === 'Ya') { const anchor = S.tagihan.find(x => x.id === b.induk); nx.hidden = false; nx.innerHTML = '<i class="bi bi-arrow-repeat"></i><span>Tagihan periode berikutnya otomatis dibuat: <b>' + fmtTgl(nextDue(b.jatuhTempo, b.periode, Number(String((anchor || b).jatuhTempo).slice(8, 10)))) + '</b></span>'; } else nx.hidden = true;
    showModal('mBayar');
  }
  function submitBayar() {
    const b = S.tagihan.find(x => x.id === PF.id);
    if (!b) return;
    const catat = $('#byCatat').checked, dompetId = $('#byDompet').value, kategoriId = $('#byKategori').value, nominal = parseNom($('#byNominal').value) || b.nominal;
    const tanggal = $('#byTanggal').value.replace('T', ' ').slice(0, 16) || nowLocal();
    if (catat && (!dompetId || !kategoriId)) return toast('Pilih dompet dan kategori pembayaran.', 'warning');
    const trxId = uuid(), nextId = uuid(), ts = nowFull();
    const nb = Object.assign({}, b, { lunas: 'Lunas', tanggalLunas: today(), dibayarOleh: S.me.id, transaksiId: catat ? trxId : '' });
    let next = null;
    if (b.berulang === 'Ya' && b.periode) {
      const induk = b.induk || b.id, anchor = S.tagihan.find(x => x.id === induk);
      const due = nextDue(b.jatuhTempo, b.periode, Number(String((anchor || b).jatuhTempo).slice(8, 10)));
      if (!S.tagihan.some(x => (x.induk || x.id) === induk && x.jatuhTempo === due && x.id !== b.id)) next = Object.assign({}, b, { id: nextId, jatuhTempo: due, lunas: 'Belum Lunas', tanggalLunas: '', dibayarOleh: '', transaksiId: '', induk: induk, dibuat: ts });
    }
    const trx = catat ? { id: trxId, tanggal: tanggal, dompetId: dompetId, kategoriId: kategoriId, jenis: 'Keluar', nominal: nominal, catatan: 'Bayar ' + b.nama, struk: '', pemilik: S.me.id, privasi: b.privasi, dibuatOleh: S.me.id, tanggalInput: ts, refId: b.id, _pending: true } : null;
    if (catat) { pref.lastDompet = dompetId; savePref(); }
    mutate({
      apply: () => [upsert('tagihan', nb)].concat(next ? [upsert('tagihan', next)] : []).concat(trx ? [upsert('transaksi', trx)] : []),
      ok: b.nama + ' lunas' + (next ? ' · periode berikutnya ' + fmtTglPendek(next.jatuhTempo) + ' dibuat' : ''),
      call: () => api('bayarTagihan', S.token, { id: b.id, catat: catat, dompetId: dompetId, kategoriId: kategoriId, nominal: nominal, tanggal: tanggal, transaksiId: trxId, nextId: nextId }),
      done: res => {
        putServer('tagihan', res.tagihan);
        if (res.next) putServer('tagihan', res.next); else if (next && !res.sudah) S.tagihan = S.tagihan.filter(x => x.id !== next.id);
        if (res.transaksi) putServer('transaksi', res.transaksi);
      }
    });
    modal('mBayar').hide();
  }

  // ── Admin: pengguna ────────────────────────────────────────────────────
  let UF = { id: null };
  function openUser(id) {
    const u = id ? S.admin.users.find(x => x.id === id) : null;
    UF = { id: u ? u.id : null };
    $('#usTitle').textContent = u ? 'Ubah Akun' : 'Buat Akun';
    $('#usNama').value = u ? u.nama : ''; $('#usEmail').value = u ? u.email : ''; $('#usEmail').disabled = !!u;
    $('#usPeran').value = u ? u.peran : 'Pengguna';
    $('#usAktifWrap').hidden = !u; $('#usAktif').checked = !u || u.aktif === 'Ya';
    $('#usInfo').hidden = !!u;
    $('#usSave').innerHTML = u ? '<i class="bi bi-check2-circle"></i>Simpan' : '<i class="bi bi-person-plus"></i>Buat Akun';
    $$('#formUser .is-invalid').forEach(x => x.classList.remove('is-invalid'));
    showModal('mUser');
  }
  async function submitUser() {
    const nama = $('#usNama').value.trim(), email = $('#usEmail').value.trim();
    if (invalid($('#usNama'), !nama) | invalid($('#usEmail'), !UF.id && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) return;
    await withBtn($('#usSave'), async () => {
      try {
        if (UF.id) {
          const u = await api('adminUpdateUser', S.token, { id: UF.id, nama: nama, peran: $('#usPeran').value, aktif: $('#usAktif').checked ? 'Ya' : 'Tidak' });
          const i = S.admin.users.findIndex(x => x.id === u.id); if (i >= 0) S.admin.users[i] = u;
          const j = S.users.findIndex(x => x.id === u.id); if (j >= 0) Object.assign(S.users[j], { nama: u.nama, peran: u.peran, aktif: u.aktif });
          modal('mUser').hide(); toast('Akun diperbarui.', 'success'); reindex(); renderAdminTab();
        } else {
          const r = await api('adminBuatUser', S.token, { nama: nama, email: email, peran: $('#usPeran').value });
          S.admin.users.push(r.user); S.users.push({ id: r.user.id, nama: r.user.nama, peran: r.user.peran, warna: r.user.warna, aktif: 'Ya' });
          reindex(); renderAdminTab(); showKode(r, 'Akun ' + r.user.nama + ' dibuat');
        }
      } catch (e) { toast(e.message, 'danger'); }
    });
  }
  function showKode(r, title) {
    $('#kdBody').innerHTML = '<svg class="koin koin-sm koin-bob" aria-hidden="true"><use href="#koin"/></svg><h2 class="modal-title mt-2">' + esc(title) + '</h2><p class="text-2">' + (r.emailSent ? 'Kode undangan sudah dikirim ke <b>' + esc(r.user.email) + '</b>.' : 'Email gagal dikirim — bagikan kode ini secara langsung.') + '</p>' +
      '<div class="p-3 rounded-4 mb-2" style="background:var(--bersama-bg);border:1.5px dashed var(--c-primary)"><small class="small-label">Kode undangan</small><div class="font-head fw-bold" style="font-size:30px;letter-spacing:4px" id="kdCode">' + esc(r.kode) + '</div></div><p class="text-2 small m-0">Berlaku 7 hari. Pengguna membuka aplikasi → tab <b>Aktivasi Akun</b> → masukkan email, kode, dan PIN baru.</p>';
    $('#kdCopy').onclick = () => { try { navigator.clipboard.writeText(r.kode).then(() => toast('Kode disalin.', 'success')); } catch (e) { toast('Salin manual: ' + r.kode, 'info'); } };
    showModal('mKode');
  }
  async function resetUser(id) {
    const u = S.admin.users.find(x => x.id === id);
    if (!u) return;
    const ok = await confirmBox({ title: u.pinSet ? 'Reset PIN ' + u.nama + '?' : 'Buat kode undangan baru?', body: u.pinSet ? 'PIN lama tidak berlaku dan semua sesinya berakhir. Pengguna mengatur PIN baru dengan kode undangan.' : 'Kode lama tidak berlaku lagi.', ok: u.pinSet ? 'Reset PIN' : 'Buat kode', tone: 'primary', icon: 'bi-key' });
    if (!ok) return;
    try {
      const r = await api('adminResetPin', S.token, id);
      const i = S.admin.users.findIndex(x => x.id === id); if (i >= 0) S.admin.users[i] = r.user;
      renderAdminTab(); showKode(r, 'Kode baru untuk ' + r.user.nama);
    } catch (e) { toast(e.message, 'danger'); }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  18. KOMPONEN PIN
  // ════════════════════════════════════════════════════════════════════════
  function initPins(root) {
    $$('[data-pin]', root).forEach(p => {
      if (p._init) return;
      p._init = true;
      const inp = $('.pin-input', p), dots = $('.pin-dots', p), eye = $('.pin-eye', p);
      const paint = () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 12);
        const n = Math.max(6, inp.value.length);
        dots.innerHTML = Array.from({ length: n }, (_, i) => '<span class="' + (i < inp.value.length ? 'on' : '') + '"></span>').join('');
      };
      inp.addEventListener('input', paint);
      eye.addEventListener('click', () => { const show = !p.classList.contains('show'); p.classList.toggle('show', show); inp.type = show ? 'text' : 'password'; eye.innerHTML = '<i class="bi ' + (show ? 'bi-eye-slash' : 'bi-eye') + '"></i>'; inp.focus(); });
      paint();
    });
  }
  function shakePin(sel) { const p = $(sel) && $(sel).closest('.pin'); if (!p) return; p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); }

  // ════════════════════════════════════════════════════════════════════════
  //  19. AUTENTIKASI & BOOT
  // ════════════════════════════════════════════════════════════════════════
  function hideSplash() { $('#splash').classList.add('hide'); }
  function showAuth() {
    $('#app').classList.add('d-none'); $('#auth').classList.remove('d-none'); hideSplash();
    if (!PUB.siap) $('#authSetup').classList.remove('d-none');
    setTimeout(() => { const e = $('#lgEmail'); if (e && !e.value) e.focus(); }, 300);
  }
  function setAuthMode(m) {
    $$('[data-auth]').forEach(b => { const on = b.dataset.auth === m; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    $('#formLogin').classList.toggle('d-none', m !== 'login'); $('#formAktivasi').classList.toggle('d-none', m !== 'aktivasi');
    $('#authTitle').textContent = m === 'login' ? 'Selamat datang kembali' : 'Aktivasi akun baru';
    $('#authSub').textContent = m === 'login' ? 'Masuk dengan email dan PIN akunmu.' : 'Gunakan kode undangan dari Super Admin.';
  }
  function loadBoot(b) {
    S.me = b.me; S.users = b.users || []; S.dompet = b.dompet || []; S.kategori = b.kategori || []; S.transaksi = b.transaksi || [];
    S.tabungan = b.tabungan || []; S.mutasiTabungan = b.mutasiTabungan || []; S.tagihan = b.tagihan || [];
    S.settings = b.settings || {}; S.admin = b.admin || null;
    if (typeof b.remember === 'boolean') S.remember = b.remember;
    Object.assign(PUB, { warnaUtama: S.settings.warnaUtama, warnaAksen: S.settings.warnaAksen, kustomisasi: S.settings.kustomisasi, hariPengingat: S.settings.hariPengingat });
    reindex();
  }
  function enterApp(b, isLogin) {
    loadBoot(b);
    $('#auth').classList.add('d-none'); $('#app').classList.remove('d-none'); hideSplash();
    buildNav(); applyTheme(); applyBrand(); setHide(pref.hide); $('#ddDark').textContent = pref.dark ? 'Mode terang' : 'Mode gelap';
    S.mounted = {}; Object.keys(RENDER).forEach(p => S.dirty.add(p));
    $$('.page').forEach(p => { p.innerHTML = ''; });
    go(isLogin ? 'beranda' : (pref.lastPage || 'beranda'), { force: true });
    updateGlobal();
    if (isLogin) toast('Halo, ' + firstName() + '! Selamat datang.', 'success');
  }
  function showSkeleton() {
    $('#auth').classList.add('d-none'); $('#app').classList.remove('d-none'); hideSplash();
    const el = $('#page-beranda');
    $$('.page').forEach(p => p.classList.toggle('active', p === el));
    el.innerHTML = '<div class="skel mb-3" style="height:230px;border-radius:24px"></div><div class="qa-grid mb-4">' + '<div class="skel" style="height:96px;border-radius:18px"></div>'.repeat(5) + '</div><div class="d-flex gap-3 mb-3 overflow-hidden">' + '<div class="skel flex-shrink-0" style="width:210px;height:118px;border-radius:18px"></div>'.repeat(4) + '</div><div class="row g-3"><div class="col-lg-5"><div class="skel" style="height:340px;border-radius:20px"></div></div><div class="col-lg-7"><div class="skel" style="height:340px;border-radius:20px"></div></div></div>';
  }
  async function doLogin(e) {
    e.preventDefault();
    const email = $('#lgEmail').value.trim(), pin = $('#lgPin').value, remember = $('#lgRemember').checked;
    if (invalid($('#lgEmail'), !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) return toast('Masukkan email yang valid.', 'warning');
    if (!/^\d{6,12}$/.test(pin)) { shakePin('#lgPin'); return toast('PIN minimal 6 digit angka.', 'warning'); }
    await withBtn($('#lgBtn'), async () => {
      try {
        const r = await api('login', email, pin, remember);
        S.token = r.token; S.remember = remember; saveSession(r.token, remember);
        $('#lgPin').value = ''; $('#lgPin').dispatchEvent(new Event('input'));
        enterApp(r.boot, true);
      } catch (err) { shakePin('#lgPin'); toast(err.message, 'danger', 5000); }
    });
  }
  async function doAktivasi(e) {
    e.preventDefault();
    const email = $('#akEmail').value.trim(), kode = $('#akKode').value.trim(), pin = $('#akPin').value, pin2 = $('#akPin2').value, remember = $('#akRemember').checked;
    if (invalid($('#akEmail'), !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) | invalid($('#akKode'), kode.replace(/[^A-Za-z0-9]/g, '').length < 8)) return toast('Lengkapi email dan kode undangan.', 'warning');
    if (!/^\d{6,12}$/.test(pin)) { shakePin('#akPin'); return toast('PIN minimal 6 digit angka.', 'warning'); }
    if (pin !== pin2) { shakePin('#akPin2'); return toast('Ulangi PIN tidak sama.', 'warning'); }
    await withBtn($('#akBtn'), async () => {
      try {
        const r = await api('aktivasiAkun', email, kode, pin, remember);
        S.token = r.token; S.remember = remember; saveSession(r.token, remember);
        enterApp(r.boot, true);
        toast('Akun aktif! PIN kamu sudah tersimpan aman.', 'success', 4500);
      } catch (err) { toast(err.message, 'danger', 5000); }
    });
  }
  let expiredShown = false;
  function sessionExpired(msg) {
    if (expiredShown || !S.token) return;
    expiredShown = true;
    resetState(); showAuth(); toast(msg || 'Sesi berakhir. Silakan masuk kembali.', 'warning', 5000);
    setTimeout(() => { expiredShown = false; }, 3000);
  }
  function resetState() {
    clearSession();
    Object.keys(charts).forEach(k => { charts[k].destroy(); delete charts[k]; });
    Object.assign(S, { token: null, me: null, users: [], dompet: [], kategori: [], transaksi: [], tabungan: [], mutasiTabungan: [], tagihan: [], admin: null, privat: null, mounted: {} });
    strukCache.clear(); localStruk.clear();
    $$('.page').forEach(p => { p.innerHTML = ''; });
    $$('.modal.show').forEach(m => { const i = bootstrap.Modal.getInstance(m); if (i) i.hide(); });
  }
  async function logout() {
    if (S.pending > 0) {
      const ok = await confirmBox({ title: 'Masih menyimpan data', body: S.pending + ' perubahan sedang dikirim ke server. Keluar sekarang bisa membatalkannya.', ok: 'Tetap keluar' });
      if (!ok) return;
    }
    resetState(); showAuth(); setAuthMode('login');
    toast('Kamu sudah keluar. Sampai jumpa!', 'info');
  }
  async function refreshData(btn) {
    try {
      const b = await (btn ? withBtn(btn, () => api('getBoot', S.token)) : api('getBoot', S.token));
      loadBoot(b); applyTheme(); buildNav();
      S.mounted = {}; Object.keys(RENDER).forEach(p => S.dirty.add(p));
      go(S.page, { force: true }); updateGlobal();
      toast('Data diperbarui dari server.', 'success');
    } catch (e) { if (e.code !== 'AUTH') toast(e.message, 'danger'); }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  20. EVENT GLOBAL (delegasi)
  // ════════════════════════════════════════════════════════════════════════
  const ACTIONS = {
    'trx': b => openTrx(b.dataset.jenis || 'Keluar'),
    'trx-edit': b => openEditTrx(b.dataset.id),
    'trx-del': b => deleteTrx(b.dataset.id),
    'struk': b => viewStruk(b.dataset.id),
    'logout': () => logout(),
    'toggle-dark': () => setDark(!pref.dark),
    'toggle-hide': () => setHide(!pref.hide),
    'refresh': b => refreshData(b.tagName === 'BUTTON' && !b.classList.contains('dropdown-item') ? b : null),
    'menu': () => showModal('mMenu'),
    'search-mobile': () => { go('mutasi'); setTimeout(() => { const q = $('#fQ'); if (q) q.focus(); }, 60); },
    'dompet-new': () => openDompet(),
    'dompet-edit': b => openDompet(b.dataset.id),
    'dompet-mutasi': b => gotoMutasi({ dompet: b.dataset.id }),
    'kat-new': () => openKategori(null, S.f.katTab),
    'kat-edit': b => openKategori(b.dataset.id),
    'tab-new': () => openTabungan(),
    'tab-edit': b => openTabungan(b.dataset.id),
    'tab-setor': b => openSetor(b.dataset.id, 'Setor'),
    'tab-tarik': b => openSetor(b.dataset.id, 'Tarik'),
    'goto-tab-mutasi': () => gotoMutasi({ jenis: 'Tabungan', periode: 'semua' }),
    'tagihan-new': () => openTagihan(),
    'tagihan-edit': b => openTagihan(b.dataset.id),
    'bayar': b => openBayar(b.dataset.id),
    'drill-kat': b => drillKat(b.dataset.id, b.dataset.range || 'bulan'),
    'page': b => { S.f.mutasi.page = Number(b.dataset.p); updMutasi(); const c = $('#mtThead'); if (c) c.closest('.card-x').scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'start' }); },
    'reset-filter': () => { S.f.mutasi = defMutasi(); updMutasi(); },
    'rm-chip': b => { const k = b.dataset.k; S.f.mutasi[k] = k === 'periode' ? 'bulan' : ''; S.f.mutasi.page = 1; if (k === 'q') { const g = $('#globalSearch'); if (g) g.value = ''; } updMutasi(); },
    'export-mutasi': () => { const f = S.f.mutasi, r = range(f.periode, f); Object.assign(S.f.laporan, { preset: 'kustom', dari: r.dari === '0000-01-01' ? addMonths(today().slice(0, 8) + '01', -11) : r.dari, sampai: r.sampai === '9999-12-31' ? today() : r.sampai, dompet: f.dompet, kategori: f.kategori, jenis: f.jenis === 'Tabungan' ? '' : f.jenis, privasi: f.privasi }); S.dirty.add('laporan'); go('laporan'); },
    'user-new': () => openUser(),
    'user-edit': b => openUser(b.dataset.id),
    'user-reset': b => resetUser(b.dataset.id)
  };
  function bindGlobal() {
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-action]');
      if (a && ACTIONS[a.dataset.action] && !a.disabled) {
        e.preventDefault();
        const dd = a.closest('.dropdown-menu');
        if (dd) { const tg = dd.parentElement.querySelector('[data-bs-toggle="dropdown"]'); if (tg) bootstrap.Dropdown.getOrCreateInstance(tg).hide(); }
        ACTIONS[a.dataset.action](a, e);
        return;
      }
      const g = e.target.closest('[data-go]');
      if (g && !g.disabled) { e.preventDefault(); const m = g.closest('.modal.show'); if (m) hideModalAsync(m); go(g.dataset.go); return; }
      const tr = e.target.closest('[data-trx]');
      if (tr) openDetail(tr.dataset.trx);
    });
    document.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-trx][tabindex], .list-row[data-action][tabindex], .list-row[data-go][tabindex]')) { e.preventDefault(); e.target.click(); }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && S.me && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector('.modal.show')) { e.preventDefault(); openTrx('Keluar'); }
    });
    // Login & aktivasi
    $$('[data-auth]').forEach(b => b.addEventListener('click', () => setAuthMode(b.dataset.auth)));
    $('#formLogin').addEventListener('submit', doLogin);
    $('#formAktivasi').addEventListener('submit', doAktivasi);
    $('#akKode').addEventListener('input', e => { let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4); e.target.value = v; });
    // Pencarian global
    const gs = $('#globalSearch');
    gs.addEventListener('input', debounce(() => { if (S.page === 'mutasi') { S.f.mutasi.q = gs.value; S.f.mutasi.page = 1; updMutasi(); } }, 180));
    gs.addEventListener('keydown', e => { if (e.key === 'Enter') { S.f.mutasi = Object.assign(defMutasi(), { q: gs.value.trim(), periode: 'semua' }); S.dirty.add('mutasi'); go('mutasi'); } });
    // Form transaksi
    segBind($('#trxSeg'), v => setTrxJenis(v));
    segBind($('#trxPriv'), v => { TF.privasi = v; TF.privTouched = true; });
    $('#trxKat').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; TF.kategoriId = b.dataset.id; $$('.pick', $('#trxKat')).forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); }); $('#trxKatErr').hidden = true; });
    $('#trxDompet').addEventListener('click', e => {
      const b = e.target.closest('[data-id]'); if (!b) return;
      TF.dompetId = b.dataset.id; $$('button', $('#trxDompet')).forEach(x => x.classList.toggle('active', x === b)); $('#trxDompetErr').hidden = true;
      const d = idx.dompet.get(TF.dompetId); if (d && !TF.privTouched) setTrxPriv(d.privasi === 'Privat' ? 'Privat' : (S.me.privasiDefault || 'Bersama'));
    });
    const nom = $('#trxNominal');
    nominalInput(nom);
    $('#trxQuick').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; const add = Number(b.dataset.add); nom.value = add ? fmtNum(parseNom(nom.value) + add) : ''; $('#trxNominalErr').hidden = true; nom.focus(); });
    $('#trxDrop').addEventListener('click', e => { if (e.target.closest('#trxFileClear')) { e.stopPropagation(); if (TF.file) setTrxFile(null); else { TF.hapusStruk = true; setTrxFile(null); } return; } $('#trxFile').click(); });
    $('#trxFile').addEventListener('change', e => handleTrxFile(e.target.files[0]));
    ['dragover', 'dragenter'].forEach(ev => $('#trxDrop').addEventListener(ev, e => { e.preventDefault(); $('#trxDrop').classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => $('#trxDrop').addEventListener(ev, e => { e.preventDefault(); $('#trxDrop').classList.remove('drag'); if (ev === 'drop' && e.dataTransfer.files[0]) handleTrxFile(e.dataTransfer.files[0]); }));
    $('#formTrx').addEventListener('submit', e => { e.preventDefault(); submitTrx(false); });
    $('#trxSaveMore').addEventListener('click', () => submitTrx(true));
    $('#mTrx').addEventListener('shown.bs.modal', () => nom.focus());
    // Form lain
    $('#formDompet').addEventListener('submit', e => { e.preventDefault(); submitDompet(); });
    $('#dpJenis').addEventListener('change', e => { $('#dpCustomWrap').hidden = e.target.value !== '__custom'; if (e.target.value === '__custom') $('#dpJenisCustom').focus(); });
    $('#dpSaldo').addEventListener('input', e => { const neg = /^-/.test(e.target.value.trim()), v = parseNom(e.target.value); e.target.value = (neg ? '-' : '') + (v ? fmtNum(v) : ''); });
    segBind($('#dpPriv'));
    $('#dpDel').addEventListener('click', archiveDompet);
    $('#formKategori').addEventListener('submit', e => { e.preventDefault(); submitKategori(); });
    segBind($('#ktJenis'));
    $('#ktDel').addEventListener('click', deleteKategori);
    $('#formTabungan').addEventListener('submit', e => { e.preventDefault(); submitTabungan(); });
    ['#tbTarget', '#tbAwal', '#tgNominal', '#byNominal', '#stNominal'].forEach(s => nominalInput($(s)));
    segBind($('#tbPriv'));
    $('#tbDel').addEventListener('click', deleteTabungan);
    $('#formSetor').addEventListener('submit', e => { e.preventDefault(); submitSetor(); });
    $('#formTagihan').addEventListener('submit', e => { e.preventDefault(); submitTagihan(); });
    $('#tgUlang').addEventListener('change', e => { $('#tgPeriode').disabled = !e.target.checked; });
    segBind($('#tgPriv'));
    $('#tgDel').addEventListener('click', deleteTagihan);
    $('#formBayar').addEventListener('submit', e => { e.preventDefault(); submitBayar(); });
    $('#byCatat').addEventListener('change', e => { $('#byFields').hidden = !e.target.checked; });
    $('#formUser').addEventListener('submit', e => { e.preventDefault(); submitUser(); });
    // Peringatan bila menutup tab saat data belum tersimpan
    window.addEventListener('beforeunload', e => { if (S.pending > 0) { e.preventDefault(); e.returnValue = ''; } });
    // Ubah tema sistem
    if (window.matchMedia) matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => chartDefaults());
  }

  // ════════════════════════════════════════════════════════════════════════
  //  21. INISIALISASI
  // ════════════════════════════════════════════════════════════════════════
  async function init() {
    applyBrand();
    chartDefaults();
    bindGlobal();
    initPins(document);
    if (pref.dark) document.documentElement.setAttribute('data-theme', 'dark');
    const tok = loadSession();
    // Konfigurasi publik dimuat PARALEL dengan getBoot agar tidak menambah waktu tunggu
    let cfgErr = null;
    const cfgP = fetchPublicConfig().then(c => { Object.assign(PUB, c); }).catch(e => { cfgErr = e; });
    const afterCfg = () => { applyBrand(); if (!S.me) window.__applyColors(PUB.warnaUtama || '#12B886', PUB.warnaAksen || '#7C5CFC'); };

    if (tok) {
      S.token = tok;
      showSkeleton();
      const [, boot] = await Promise.all([cfgP, api('getBoot', tok).then(b => ({ b: b }), e => ({ e: e }))]);
      afterCfg();
      if (PUB.siap === false) { resetState(); showAuth(); return; }
      if (boot.b) { enterApp(boot.b, false); return; }
      resetState(); showAuth();
      if (boot.e.code !== 'AUTH') toast(boot.e.message, 'danger', 6000);
      return;
    }
    await cfgP;
    if (cfgErr) { PUB.siap = true; toast(cfgErr.message, 'danger', 8000); } else afterCfg();
    showAuth();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
