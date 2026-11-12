/* 1337emoji 2.0 — CEP panel for Premiere Pro + After Effects.
   Pick emoji -> live preview -> render once to ProRes 4444 alpha -> insert at playhead. */
(function () {
  'use strict';
  var cs = new CSInterface();
  var HOST = cs.getHostEnvironment().appName; // PPRO | AEFT
  var nodeRequire = (typeof require === 'function') ? require : (window.cep_node && window.cep_node.require);
  var fs = nodeRequire('fs'), path = nodeRequire('path'), cp = nodeRequire('child_process'), os = nodeRequire('os');
  var EXT = cs.getSystemPath(SystemPath.EXTENSION);
  var POOL = path.join(EXT, 'pool');
  var D = window.EMOJI_DATA; // {names:[[name,cat]], cats:[...], ranges:[[lo,hi]...]}
  var DIRS = ['→', '←', '↑', '↓', '↘', '↙', '↗', '↖', 'BURST', 'IMPLODE', 'RAIN'];
  var DIR_NAMES = ['Left to Right', 'Right to Left', 'Bottom to Top', 'Top to Bottom', 'Top-Left corner', 'Top-Right corner',
    'Bottom-Left corner', 'Bottom-Right corner', 'Burst out', 'Implode', 'Rain (all sides)'];

  var S = { sel: [], dir: 0, count: 80, dur: 1.4, stagger: 40, size: 12, sizeVar: 35, spin: 120, wobble: 6, pop: true,
    ease: 1, seed: 164, blur: 4, peak: true, seq: { w: 1920, h: 1080, fps: 30, ph: 0 } };
  try { var saved = JSON.parse(localStorage.getItem('1337emoji') || '{}'); for (var k in saved) if (k in S && k !== 'seq') S[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem('1337emoji', JSON.stringify(S)); } catch (e) {} }

  function fileOf(id) { var n = String(id); while (n.length < 5) n = '0' + n; return path.join(POOL, 'e_' + n + '.png'); }

  // ---------------------------------------------------------------- grid
  var grid = document.getElementById('grid'), tray = document.getElementById('tray');
  var catSel = document.getElementById('cat'), q = document.getElementById('q');
  D.cats.forEach(function (c, i) { var o = document.createElement('option'); o.value = i; o.textContent = c; catSel.appendChild(o); });
  function renderGrid() {
    grid.innerHTML = '';
    var r = D.ranges[+catSel.value], t = q.value.trim().toLowerCase(), n = 0;
    var frag = document.createDocumentFragment();
    for (var i = r[0]; i <= r[1] && n < 600; i++) {
      if (t && D.names[i][0].toLowerCase().indexOf(t) < 0) continue;
      var b = document.createElement('button'); b.className = 'cell'; b.title = '#' + (i + 1) + ' ' + D.names[i][0];
      var im = document.createElement('img'); im.loading = 'lazy'; im.src = 'file://' + fileOf(i); b.appendChild(im);
      b.dataset.id = i; if (S.sel.indexOf(i) >= 0) b.classList.add('on');
      b.onclick = function (ev) { var id = +this.dataset.id; if (ev.shiftKey) S.sel.push(id); else { var k = S.sel.indexOf(id); if (k >= 0) S.sel = S.sel.filter(function (x) { return x !== id; }); else S.sel.push(id); } refreshSel(); };
      frag.appendChild(b); n++;
    }
    grid.appendChild(frag);
  }
  function refreshSel() {
    tray.innerHTML = '';
    var counts = {}; S.sel.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    Object.keys(counts).forEach(function (id) {
      var s = document.createElement('span'); s.className = 'chip'; s.title = 'click to remove';
      s.innerHTML = '<img src="file://' + fileOf(+id) + '">' + (counts[id] > 1 ? '<b>×' + counts[id] + '</b>' : '');
      s.onclick = function () { S.sel = S.sel.filter(function (x) { return x !== +id; }); refreshSel(); };
      tray.appendChild(s);
    });
    document.getElementById('selcount').textContent = Object.keys(counts).length ? Object.keys(counts).length + ' picked' : 'pick emoji (shift-click = more of it)';
    Array.prototype.forEach.call(grid.children, function (b) { b.classList.toggle('on', S.sel.indexOf(+b.dataset.id) >= 0); });
    loadSprites(); save();
  }
  catSel.onchange = renderGrid; q.oninput = renderGrid;
  document.getElementById('clear').onclick = function () { S.sel = []; refreshSel(); };

  // ---------------------------------------------------------------- controls
  var dirBox = document.getElementById('dirs');
  DIRS.forEach(function (d, i) { var b = document.createElement('button'); b.textContent = d; b.title = DIR_NAMES[i]; b.className = 'dir';
    b.onclick = function () { S.dir = i; markDir(); save(); }; dirBox.appendChild(b); });
  function markDir() { Array.prototype.forEach.call(dirBox.children, function (b, i) { b.classList.toggle('on', i === S.dir); }); }
  function bind(id, key, conv) {
    var el = document.getElementById(id), out = document.getElementById(id + '_v');
    if (el.type === 'checkbox') el.checked = !!S[key]; else el.value = S[key];
    var upd = function () { S[key] = el.type === 'checkbox' ? el.checked : conv(el.value); if (out) out.textContent = el.value; save(); };
    el.oninput = upd; el.onchange = upd; if (out) out.textContent = el.value;
  }
  bind('count', 'count', Number); bind('dur', 'dur', Number); bind('stagger', 'stagger', Number); bind('size', 'size', Number);
  bind('sizeVar', 'sizeVar', Number); bind('spin', 'spin', Number); bind('wobble', 'wobble', Number); bind('pop', 'pop');
  bind('ease', 'ease', Number); bind('blur', 'blur', Number); bind('peak', 'peak');
  document.getElementById('shuffle').onclick = function () { S.seed = Math.floor(Math.random() * 99999); save(); };

  // ---------------------------------------------------------------- sprites (data URLs -> untainted canvas)
  var SPR = {};
  function loadSprites() {
    S.sel.forEach(function (id) {
      if (SPR[id]) return;
      var im = new Image(); im.src = 'data:image/png;base64,' + fs.readFileSync(fileOf(id)).toString('base64'); SPR[id] = im;
    });
  }

  // ---------------------------------------------------------------- motion model (shared by preview + render)
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function ease(x, m) { if (m === 2) return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    if (m === 3) return x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
    if (m === 4) return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); return x; }
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
  function drawAt(ctx, P, W, H, time) {
    for (var i = 0; i < P.length; i++) {
      var p = P[i], im = SPR[p.id]; if (!im || !im.complete) continue;
      var tt = (time - p.delay) / p.travel; if (tt <= 0 || tt >= 1) continue;
      var t = ease(tt, S.ease), x = p.a[0] + (p.b[0] - p.a[0]) * t + Math.sin(time * 9 + p.ph) * S.wobble * H / 1080,
        y = p.a[1] + (p.b[1] - p.a[1]) * t + Math.cos(time * 7 + p.ph) * S.wobble * H / 1080;
      var s = p.sz * (S.pop ? Math.min(1, tt * 8) : 1);
      ctx.save(); ctx.translate(x, y); ctx.rotate((p.rot0 + p.spin * t) * Math.PI / 180); ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore();
    }
  }

  // ---------------------------------------------------------------- live preview
  var pv = document.getElementById('preview'), pctx = pv.getContext('2d');
  var t0 = performance.now();
  function loop() {
    var W = pv.width, H = pv.height, el = ((performance.now() - t0) / 1000) % (S.dur + .6);
    pctx.clearRect(0, 0, W, H);
    pctx.fillStyle = '#2a2d34'; pctx.fillRect(0, 0, W / 2, H); pctx.fillStyle = '#4a4f5c'; pctx.fillRect(W / 2, 0, W / 2, H);
    if (!S.sel.length) { pctx.fillStyle = '#ccc'; pctx.font = '13px sans-serif'; pctx.fillText('pick emoji below', W / 2 - 50, H / 2); }
    else drawAt(pctx, particles(W, H), W, H, el);
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- host info / render / insert
  function status(m) { document.getElementById('status').textContent = m; }
  function seqInfo(cb) {
    cs.evalScript('emoji1337_info()', function (r) {
      if (r && r.indexOf('|') > 0) { var a = r.split('|'); S.seq = { w: +a[0], h: +a[1], fps: +a[2], ph: +a[3] }; pv.height = Math.round(pv.width * S.seq.h / S.seq.w); }
      cb && cb(r);
    });
  }
  function ffmpegPath() {
    var c = [path.join(os.homedir(), 'Desktop/mcpvideokurgu/03_pipeline/bin/ffmpeg'), '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
    for (var i = 0; i < c.length; i++) if (fs.existsSync(c[i])) return c[i];
    return 'ffmpeg';
  }
  function render() {
    if (!S.sel.length) { status('Pick at least one emoji first.'); return; }
    seqInfo(function (r) {
      if (!r || r.indexOf('|') < 0) { status(HOST === 'PPRO' ? 'Open a sequence first.' : 'Open a composition first.'); return; }
      var W = S.seq.w, H = S.seq.h, fps = S.seq.fps, N = Math.max(2, Math.round(S.dur * fps)), sub = Math.max(1, S.blur | 0);
      var dir = path.join(os.homedir(), 'Movies', '1337emoji'); fs.mkdirSync(dir, { recursive: true });
      var out = path.join(dir, '1337emoji_' + DIR_NAMES[S.dir].replace(/[^A-Za-z]+/g, '') + '_' + Date.now() + '.mov');
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var ctx = cv.getContext('2d');
      var tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; var tctx = tmp.getContext('2d');
      var P = particles(W, H);
      var ff = cp.spawn(ffmpegPath(), ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(fps), '-i', '-',
        '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', out]);
      var err = ''; ff.stderr.on('data', function (d) { err += d; });
      var f = 0;
      function next() {
        if (f >= N) { ff.stdin.end(); return; }
        ctx.clearRect(0, 0, W, H);
        for (var s = 0; s < sub; s++) {
          var tm = (f + (sub > 1 ? (s / sub - .25) * .5 : 0)) / fps;   // 180° shutter centred on the frame
          tctx.clearRect(0, 0, W, H); drawAt(tctx, P, W, H, tm);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 / sub; ctx.drawImage(tmp, 0, 0);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        var buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
        f++; status('Rendering ' + f + '/' + N + ' …');
        if (ff.stdin.write(buf)) setTimeout(next, 0); else ff.stdin.once('drain', next);
      }
      ff.on('close', function (code) {
        if (code !== 0) { status('Render failed: ' + err.slice(0, 200)); return; }
        var start = S.seq.ph - (S.peak ? S.dur / 2 : 0);
        cs.evalScript('emoji1337_insert(' + JSON.stringify(out) + ',' + start.toFixed(4) + ',' + S.dur.toFixed(4) + ')', function (res) { status(res || 'Inserted.'); });
      });
      next();
    });
  }
  document.getElementById('go').onclick = render;
  document.getElementById('host').textContent = HOST === 'PPRO' ? 'Premiere Pro' : 'After Effects';

  renderGrid(); markDir(); refreshSel(); seqInfo(); requestAnimationFrame(loop);
})();
