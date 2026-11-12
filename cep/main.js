/* 1337emoji 2.1 — CEP panel for Premiere Pro + After Effects.
   Pick emoji -> live preview -> render once to ProRes 4444 alpha -> insert at playhead.
   No CSInterface dependency: talks to window.__adobe_cep__ directly. */
(function () {
  'use strict';
  var statusEl = document.getElementById('status');
  function status(m, kind) { statusEl.textContent = m; statusEl.className = 'status' + (kind ? ' ' + kind : ''); }
  window.onerror = function (msg, src, line) { status('Panel error: ' + msg + ' (line ' + line + ')', 'err'); };

  // ---------------------------------------------------------------- host bridge
  var CEP = window.__adobe_cep__;
  function evalES(src, cb) { if (!CEP) { cb && cb(''); return; } CEP.evalScript(src, function (r) { cb && cb(r); }); }
  var HOST = 'PPRO';
  try { HOST = JSON.parse(CEP.getHostEnvironment()).appName; } catch (e) {}
  var req = (typeof require === 'function') ? require : (window.cep_node && window.cep_node.require);
  var fs = req('fs'), path = req('path'), cp = req('child_process'), os = req('os');
  var Buf = (typeof Buffer !== 'undefined') ? Buffer : req('buffer').Buffer;
  var EXT = decodeURIComponent(new URL('.', document.currentScript ? document.currentScript.src : location.href).pathname).replace(/\/$/, '');
  var POOL = path.join(EXT, 'pool');
  evalES('$.evalFile(' + JSON.stringify(EXT + '/host.jsx') + ')');   // make sure host functions exist

  var D = window.EMOJI_DATA;
  // order matches the motion model: 0 L→R 1 R→L 2 B→T 3 T→B 4 TL 5 TR 6 BL 7 BR 8 burst 9 implode 10 rain
  var DIR_NAMES = ['Left → Right', 'Right → Left', 'Bottom → Top', 'Top → Bottom', 'From top-left', 'From top-right',
    'From bottom-left', 'From bottom-right', 'Burst out', 'Implode', 'Rain from all sides'];

  var DEF = { sel: [], dir: 0, count: 80, dur: 1.4, stagger: 40, size: 12, sizeVar: 35, spin: 120, wobble: 6, pop: true,
    ease: 3, seed: 164, shutter: 35, peak: true, cat: 0, bg: 0 };
  var S = JSON.parse(JSON.stringify(DEF)); S.seq = null;
  try { var sv = JSON.parse(localStorage.getItem('1337emoji21') || '{}'); for (var k in sv) if (k in DEF) S[k] = sv[k]; } catch (e) {}
  S.sel = (S.sel || []).filter(function (id) { return id >= 0 && id < D.names.length; });
  function save() { try { var o = {}; for (var k in DEF) o[k] = S[k]; localStorage.setItem('1337emoji21', JSON.stringify(o)); } catch (e) {} }

  function pad(id) { var n = String(id); while (n.length < 5) n = '0' + n; return n; }
  function fileOf(id) { return path.join(POOL, 'e_' + pad(id) + '.png'); }
  function urlOf(id) { return 'file://' + encodeURI(fileOf(id)); }
  function countOf(id) { var n = 0; for (var i = 0; i < S.sel.length; i++) if (S.sel[i] === id) n++; return n; }

  // ---------------------------------------------------------------- emoji picker
  var grid = document.getElementById('grid'), tray = document.getElementById('tray'), q = document.getElementById('q');
  var catBox = document.getElementById('cats');
  D.cats.forEach(function (c, i) {
    var b = document.createElement('button'); b.textContent = c; b.onclick = function () { S.cat = i; markCats(); renderGrid(); save(); };
    catBox.appendChild(b);
  });
  function markCats() { Array.prototype.forEach.call(catBox.children, function (b, i) { b.classList.toggle('on', i === S.cat); }); }

  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (ents) {
    ents.forEach(function (e) { if (e.isIntersecting) { var im = e.target; if (!im.src) im.src = im.dataset.src; io.unobserve(im); } });
  }, { root: grid, rootMargin: '120px' }) : null;

  function renderGrid() {
    grid.innerHTML = '';
    var r = D.ranges[S.cat] || D.ranges[0], t = q.value.trim().toLowerCase(), n = 0, frag = document.createDocumentFragment();
    var lo = t ? 0 : r[0], hi = t ? D.names.length - 1 : r[1];
    for (var i = lo; i <= hi && n < 700; i++) {
      if (t && D.names[i][0].toLowerCase().indexOf(t) < 0) continue;
      var b = document.createElement('button'); b.className = 'cell'; b.title = D.names[i][0]; b.dataset.id = i;
      var im = document.createElement('img'); im.draggable = false;
      if (io) { im.dataset.src = urlOf(i); io.observe(im); } else im.src = urlOf(i);
      b.appendChild(im); frag.appendChild(b); n++;
    }
    if (!n) { var e = document.createElement('div'); e.className = 'empty'; e.textContent = 'No emoji match "' + t + '"'; frag.appendChild(e); }
    grid.appendChild(frag); markGrid();
  }
  grid.addEventListener('click', function (ev) {
    var b = ev.target.closest('.cell'); if (!b) return; var id = +b.dataset.id;
    if (ev.shiftKey || ev.altKey) S.sel.push(id);
    else if (countOf(id)) S.sel = S.sel.filter(function (x) { return x !== id; });
    else S.sel.push(id);
    refreshSel();
  });
  function markGrid() {
    Array.prototype.forEach.call(grid.children, function (b) {
      if (!b.dataset || b.dataset.id === undefined) return;
      var c = countOf(+b.dataset.id); b.classList.toggle('on', c > 0); if (c > 1) b.dataset.n = '×' + c; else b.dataset.n = '';
    });
  }
  function refreshSel() {
    tray.innerHTML = '';
    var seen = [];
    S.sel.forEach(function (id) { if (seen.indexOf(id) < 0) seen.push(id); });
    seen.forEach(function (id) {
      var c = countOf(id), s = document.createElement('span'); s.className = 'chip'; s.title = D.names[id][0] + ' · click = remove · right-click = one less';
      s.innerHTML = '<img src="' + urlOf(id) + '">' + (c > 1 ? '<b>×' + c + '</b>' : '');
      s.onclick = function () { S.sel = S.sel.filter(function (x) { return x !== id; }); refreshSel(); };
      s.oncontextmenu = function (ev) { ev.preventDefault(); var k = S.sel.lastIndexOf(id); if (k >= 0) S.sel.splice(k, 1); refreshSel(); };
      tray.appendChild(s);
    });
    document.getElementById('selcount').textContent = seen.length ? seen.length + ' picked' : '';
    markGrid(); loadSprites(); save(); dirty();
  }
  q.oninput = renderGrid;
  document.getElementById('clear').onclick = function () { S.sel = []; refreshSel(); };

  // ---------------------------------------------------------------- direction
  var compass = document.getElementById('compass'), modes = document.getElementById('modes');
  [[4, '↘'], [3, '↓'], [5, '↙'], [0, '→'], [8, '✺'], [1, '←'], [6, '↗'], [2, '↑'], [7, '↖']].forEach(function (d) {
    var b = document.createElement('button'); b.className = 'dir'; b.textContent = d[1]; b.title = DIR_NAMES[d[0]]; b.dataset.d = d[0];
    b.onclick = function () { setDir(d[0]); }; compass.appendChild(b);
  });
  [[8, '✺', 'Burst'], [9, '◎', 'Implode'], [10, '☂', 'Rain']].forEach(function (d) {
    var b = document.createElement('button'); b.className = 'mode'; b.dataset.d = d[0]; b.innerHTML = '<em>' + d[1] + '</em>' + d[2];
    b.onclick = function () { setDir(d[0]); }; modes.appendChild(b);
  });
  function setDir(d) { S.dir = d; markDir(); save(); dirty(); }
  function markDir() {
    [compass, modes].forEach(function (box) { Array.prototype.forEach.call(box.children, function (b) { b.classList.toggle('on', +b.dataset.d === S.dir); }); });
    document.getElementById('dirname').textContent = DIR_NAMES[S.dir];
  }

  // ---------------------------------------------------------------- sliders / ease / toggles
  var SL = [['count', 'Count', 1, 300, 1, ''], ['dur', 'Duration', .4, 4, .1, 's'], ['stagger', 'Stagger', 0, 90, 1, '%'], ['size', 'Size', 2, 60, 1, '%'],
    ['sizeVar', 'Size variance', 0, 90, 1, '%'], ['spin', 'Spin', 0, 720, 5, '°'], ['wobble', 'Wobble', 0, 60, 1, ''], ['shutter', 'Motion blur', 0, 100, 5, '%']];
  var slBox = document.getElementById('sliders'), slEls = {};
  SL.forEach(function (s) {
    var w = document.createElement('div'); w.className = 'sl';
    w.innerHTML = '<div class="top"><span>' + s[1] + '</span><b></b></div><input type="range" min="' + s[2] + '" max="' + s[3] + '" step="' + s[4] + '">';
    var el = w.querySelector('input'), out = w.querySelector('b');
    function paint() { el.style.setProperty('--p', ((el.value - s[2]) / (s[3] - s[2]) * 100) + '%'); out.textContent = (+el.value).toFixed(s[4] < 1 ? 1 : 0) + s[5]; }
    el.value = S[s[0]]; paint();
    el.oninput = function () { S[s[0]] = +el.value; paint(); dirty(); };
    el.onchange = save;
    el.ondblclick = function () { el.value = S[s[0]] = DEF[s[0]]; paint(); save(); dirty(); };
    el.title = 'double-click = default';
    slEls[s[0]] = { el: el, paint: paint }; slBox.appendChild(w);
  });
  var segBox = document.getElementById('ease'), knob = document.createElement('i'); knob.className = 'knob'; segBox.appendChild(knob);
  ['Linear', 'Smooth', 'Expo', 'Snap'].forEach(function (n, i) {
    var b = document.createElement('button'); b.textContent = n; b.onclick = function () { S.ease = i + 1; markEase(); save(); dirty(); }; segBox.appendChild(b);
  });
  function markEase() {
    var bs = segBox.querySelectorAll('button'); bs.forEach(function (b, i) { b.classList.toggle('on', i === S.ease - 1); });
    knob.style.width = 'calc((100% - 6px) / 4)'; knob.style.transform = 'translateX(' + ((S.ease - 1) * 100) + '%)';
  }
  ['pop', 'peak'].forEach(function (k) { var el = document.getElementById(k); el.checked = !!S[k]; el.onchange = function () { S[k] = el.checked; save(); dirty(); }; });
  document.getElementById('reset').onclick = function () {
    SL.forEach(function (s) { S[s[0]] = DEF[s[0]]; slEls[s[0]].el.value = DEF[s[0]]; slEls[s[0]].paint(); });
    S.ease = DEF.ease; S.pop = DEF.pop; S.peak = DEF.peak; document.getElementById('pop').checked = S.pop; document.getElementById('peak').checked = S.peak;
    markEase(); save(); dirty();
  };

  // ---------------------------------------------------------------- sprites
  var SPR = {};
  function loadSprites() {
    S.sel.forEach(function (id) {
      if (SPR[id]) return;
      try { var im = new Image(); im.src = 'data:image/png;base64,' + fs.readFileSync(fileOf(id)).toString('base64'); SPR[id] = im; }
      catch (e) { status('Missing emoji file ' + fileOf(id), 'err'); }
    });
  }

  // ---------------------------------------------------------------- motion model (shared by preview + render)
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function ease(x, m) {
    if (m === 2) return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    if (m === 3) return x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
    if (m === 4) return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
    return x;
  }
  function particles(W, H) {
    var P = [], n = Math.max(1, Math.round(S.count)), D2 = Math.sqrt(W * W + H * H), spr = Math.min(.9, S.stagger / 100);
    for (var i = 0; i < n; i++) {
      var r = rng(S.seed * 1009 + i * 31), sz = H * S.size / 100 * (1 + (r() * 2 - 1) * S.sizeVar / 100), m = sz;
      var u = r(), v = r(), lag = r() * .15, a, b, d = S.dir;
      if (d === 0) { var y = -m + u * (H + 2 * m); a = [-m - lag * W, y]; b = [W + m + (.15 - lag) * W, y]; }
      else if (d === 1) { var y1 = -m + u * (H + 2 * m); a = [W + m + lag * W, y1]; b = [-m - (.15 - lag) * W, y1]; }
      else if (d === 2) { var x = -m + u * (W + 2 * m); a = [x, H + m + lag * H]; b = [x, -m - (.15 - lag) * H]; }
      else if (d === 3) { var x1 = -m + u * (W + 2 * m); a = [x1, -m - lag * H]; b = [x1, H + m + (.15 - lag) * H]; }
      else if (d >= 4 && d <= 7) {
        var sx = (d === 4 || d === 6) ? 1 : -1, sy = (d === 4 || d === 5) ? 1 : -1, len = Math.sqrt(W * W + H * H);
        var dx = sx * W / len, dy = sy * H / len, px = -dy, py = dx, k = D2 / 2 + m + lag * D2 * .3, off = (u - .5) * (D2 + 2 * m);
        a = [W / 2 - dx * k + px * off, H / 2 - dy * k + py * off]; b = [a[0] + dx * (D2 + 2 * m + .3 * D2), a[1] + dy * (D2 + 2 * m + .3 * D2)];
      } else if (d === 8 || d === 9) {
        var ang = u * Math.PI * 2, r0 = v * H * .08, r1 = D2 * .6 + m + lag * D2 * .3;
        var p0 = [W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * r0], p1 = [W / 2 + Math.cos(ang) * r1, H / 2 + Math.sin(ang) * r1];
        if (d === 8) { a = p0; b = p1; } else { a = p1; b = p0; }
      } else {
        var side = Math.floor(v * 4);
        if (side === 0) { a = [-m, u * H]; b = [W + m, (1 - u) * H]; } else if (side === 1) { a = [W + m, u * H]; b = [-m, (1 - u) * H]; }
        else if (side === 2) { a = [u * W, -m]; b = [(1 - u) * W, H + m]; } else { a = [u * W, H + m]; b = [(1 - u) * W, -m]; }
      }
      P.push({ a: a, b: b, sz: sz, delay: r() * spr * S.dur, travel: S.dur * (1 - spr), rot0: r() * 50 - 25,
        spin: S.spin * (.4 + .6 * r()) * (r() < .5 ? -1 : 1), ph: r() * 6.28, id: S.sel.length ? S.sel[Math.floor(r() * S.sel.length)] : -1 });
    }
    return P;
  }
  function posAt(p, H, time) {
    var tt = (time - p.delay) / p.travel, t = ease(Math.max(0, Math.min(1, tt)), S.ease);
    return [p.a[0] + (p.b[0] - p.a[0]) * t + Math.sin(time * 9 + p.ph) * S.wobble * H / 1080,
      p.a[1] + (p.b[1] - p.a[1]) * t + Math.cos(time * 7 + p.ph) * S.wobble * H / 1080, t, tt];
  }
  // samples needed so sub-frame copies are <= 2 px apart (no visible stamping)
  function samplesFor(P, H, ta, tb) {
    var mx = 0;
    for (var i = 0; i < P.length; i++) { var a = posAt(P[i], H, ta), b = posAt(P[i], H, tb); var d = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]); if (d > mx) mx = d; }
    return Math.max(1, Math.min(96, Math.ceil(mx / 2)));
  }
  function drawAt(ctx, P, W, H, time) {
    for (var i = 0; i < P.length; i++) {
      var p = P[i], im = SPR[p.id]; if (!im || !im.complete || !im.naturalWidth) continue;
      var tt = (time - p.delay) / p.travel; if (tt <= 0 || tt >= 1) continue;
      var q = posAt(p, H, time), t = q[2], x = q[0], y = q[1];
      var s = p.sz * (S.pop ? Math.min(1, tt * 8) : 1);
      ctx.save(); ctx.translate(x, y); ctx.rotate((p.rot0 + p.spin * t) * Math.PI / 180); ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore();
    }
  }

  // ---------------------------------------------------------------- live preview (30 fps cap, pauses when hidden)
  var pv = document.getElementById('preview'), pctx = pv.getContext('2d'), playing = true, PC = null, last = 0, t0 = performance.now();
  function dirty() { PC = null; }
  function drawBg(W, H) {
    if (S.bg === 1) {   // checker = transparency
      var c = 18; for (var yy = 0; yy < H; yy += c) for (var xx = 0; xx < W; xx += c) { pctx.fillStyle = ((xx / c + yy / c) & 1) ? '#2b2e36' : '#3a3e48'; pctx.fillRect(xx, yy, c, c); }
    } else if (S.bg === 2) { var g = pctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1b1f3a'); g.addColorStop(1, '#3a1830'); pctx.fillStyle = g; pctx.fillRect(0, 0, W, H); }
    else { pctx.fillStyle = '#1d2027'; pctx.fillRect(0, 0, W / 2, H); pctx.fillStyle = '#3b404c'; pctx.fillRect(W / 2, 0, W / 2, H);
      pctx.fillStyle = 'rgba(255,255,255,.35)'; pctx.font = '600 ' + Math.round(H * .045) + 'px -apple-system,sans-serif'; pctx.fillText('A', 14, 26); pctx.fillText('B', W - 26, 26); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || (!playing && PC && PC.drawn) || now - last < 33) return;
    last = now;
    var W = pv.width, H = pv.height;
    if (!PC) PC = { P: particles(W, H) };
    var el = playing ? ((now - t0) / 1000) % (S.dur + .5) : S.dur * .5;
    pctx.clearRect(0, 0, W, H); drawBg(W, H);
    if (!S.sel.length) {
      pctx.fillStyle = 'rgba(255,255,255,.7)'; pctx.font = '600 ' + Math.round(H * .06) + 'px -apple-system,sans-serif'; pctx.textAlign = 'center';
      pctx.fillText('Pick emoji below to preview', W / 2, H / 2); pctx.textAlign = 'start';
    } else drawAt(pctx, PC.P, W, H, el);
    PC.drawn = true;
  }
  document.getElementById('play').onclick = function () { playing = !playing; this.textContent = playing ? '❚❚' : '▶'; t0 = performance.now(); PC && (PC.drawn = false); };
  document.getElementById('bgmode').onclick = function () { S.bg = (S.bg + 1) % 3; save(); PC && (PC.drawn = false); };
  document.getElementById('shuffle').onclick = function () { S.seed = Math.floor(Math.random() * 99999); save(); dirty(); };

  // ---------------------------------------------------------------- host info / render / insert
  var seqEl = document.getElementById('seqinfo');
  function seqInfo(cb) {
    evalES('typeof emoji1337_info=="function"?emoji1337_info():"nohost"', function (r) {
      if (r && r.indexOf('|') > 0) {
        var a = r.split('|'); S.seq = { w: +a[0], h: +a[1], fps: +a[2], ph: +a[3] };
        var h = Math.round(pv.width * S.seq.h / S.seq.w); if (h !== pv.height) { pv.height = Math.min(1280, h); dirty(); }
        seqEl.textContent = S.seq.w + '×' + S.seq.h + ' · ' + (Math.round(S.seq.fps * 100) / 100) + 'fps';
      } else { S.seq = null; seqEl.textContent = HOST === 'PPRO' ? 'no sequence open' : 'no comp open'; }
      cb && cb(r);
    });
  }
  setInterval(function () { if (!busy && !document.hidden) seqInfo(); }, 3000);

  var FF = null;
  function ffmpegPath() {
    if (FF && fs.existsSync(FF)) return FF;
    var c = [path.join(EXT, 'bin', 'ffmpeg'), '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'];
    try { var custom = localStorage.getItem('1337emoji_ffmpeg'); if (custom) c.unshift(custom); } catch (e) {}
    for (var i = 0; i < c.length; i++) if (fs.existsSync(c[i])) return (FF = c[i]);
    try { var w = cp.execSync('/bin/zsh -lc "command -v ffmpeg"', { encoding: 'utf8', timeout: 4000 }).trim(); if (w && fs.existsSync(w)) return (FF = w); } catch (e) {}
    return null;
  }
  var busy = false, goBtn = document.getElementById('go'), prog = document.getElementById('prog'), golbl = document.getElementById('golbl');
  function setBusy(b, label) { busy = b; goBtn.classList.toggle('busy', b); golbl.textContent = label || 'Render + insert at playhead'; if (!b) prog.style.width = '0'; }

  function render() {
    if (busy) return;
    if (!S.sel.length) { status('Pick at least one emoji first.', 'err'); return; }
    var ff = ffmpegPath(); if (!ff) { status('ffmpeg not found. Install it: brew install ffmpeg (see README), then try again.', 'err'); return; }
    setBusy(true, 'Reading sequence…');
    seqInfo(function (r) {
      if (!S.seq) { setBusy(false); status(HOST === 'PPRO' ? 'Open a sequence first.' : 'Open a composition first.', 'err'); return; }
      var W = S.seq.w, H = S.seq.h, fps = S.seq.fps, N = Math.max(2, Math.round(S.dur * fps)), shut = S.shutter / 100;   // 100 % = 360° shutter
      // render at most 1920 wide, Premiere/AE scale the clip to frame (keeps it fast on 4K timelines)
      var sc = Math.min(1, 1920 / W), RW = Math.round(W * sc / 2) * 2, RH = Math.round(H * sc / 2) * 2;
      var dir = path.join(os.homedir(), 'Movies', '1337emoji'); fs.mkdirSync(dir, { recursive: true });
      var out = path.join(dir, '1337emoji_' + DIR_NAMES[S.dir].replace(/[^A-Za-z]+/g, '') + '_' + Date.now() + '.mov');
      var cv = document.createElement('canvas'); cv.width = RW; cv.height = RH; var ctx = cv.getContext('2d', { willReadFrequently: true });
      var tmp = document.createElement('canvas'); tmp.width = RW; tmp.height = RH; var tctx = tmp.getContext('2d');
      var grp = document.createElement('canvas'); grp.width = RW; grp.height = RH; var gctx = grp.getContext('2d');
      var P = particles(RW, RH);
      var proc = cp.spawn(ff, ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', RW + 'x' + RH, '-r', String(fps), '-i', '-',
        '-vf', RW !== W ? 'scale=' + W + ':' + H + ':flags=lanczos' : 'null',
        '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16', '-vendor', 'apl0', out]);
      var err = ''; proc.stderr.on('data', function (d) { err += d; });
      proc.on('error', function (e) { setBusy(false); status('Could not start ffmpeg: ' + e.message, 'err'); });
      var f = 0;
      function next() {
        if (f >= N) { proc.stdin.end(); setBusy(true, 'Encoding…'); return; }
        ctx.clearRect(0, 0, RW, RH);
        var ta = (f - shut / 2) / fps, tb = (f + shut / 2) / fps, sub = shut > 0 ? samplesFor(P, RH, ta, tb) : 1;
        if (sub === 1) drawAt(ctx, P, RW, RH, f / fps);
        else {
          // two-level average (groups of G) keeps 8-bit canvas precision with many samples
          var G = Math.ceil(Math.sqrt(sub)); sub = G * G;
          for (var g = 0; g < G; g++) {
            gctx.clearRect(0, 0, RW, RH); gctx.globalCompositeOperation = 'lighter'; gctx.globalAlpha = 1 / G;
            for (var s = 0; s < G; s++) {
              var tm = ta + (tb - ta) * (g * G + s + .5) / sub;
              tctx.clearRect(0, 0, RW, RH); drawAt(tctx, P, RW, RH, tm); gctx.drawImage(tmp, 0, 0);
            }
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 / G; ctx.drawImage(grp, 0, 0);
          }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        var buf = Buf.from(ctx.getImageData(0, 0, RW, RH).data.buffer);
        f++; prog.style.width = (f / N * 100) + '%'; golbl.textContent = 'Rendering ' + f + ' / ' + N;
        if (proc.stdin.write(buf)) setTimeout(next, 0); else proc.stdin.once('drain', next);
      }
      proc.on('close', function (code) {
        if (code !== 0) { setBusy(false); status('Render failed: ' + err.slice(0, 220), 'err'); return; }
        setBusy(true, 'Inserting…');
        var start = S.seq.ph - (S.peak ? S.dur / 2 : 0);
        evalES('emoji1337_insert(' + JSON.stringify(out) + ',' + start.toFixed(4) + ',' + S.dur.toFixed(4) + ')', function (res) {
          setBusy(false);
          var ok = res && /^(Inserted|Added)/.test(res);
          status(res ? res : 'Host did not answer (is a sequence open?)', ok ? 'ok' : 'err');
        });
      });
      next();
    });
  }
  goBtn.onclick = render;
  document.getElementById('host').textContent = HOST === 'PPRO' ? 'Premiere Pro' : HOST === 'AEFT' ? 'After Effects' : HOST;

  markCats(); renderGrid(); markDir(); markEase(); refreshSel(); seqInfo(); requestAnimationFrame(frame);
})();
