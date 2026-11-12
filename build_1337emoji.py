"""1337emoji — emoji transition plugin for After Effects (ScriptUI panel) + Premiere (MOGRT).
Private build (Apple emoji artwork, personal use only — never publish the pool).

python3 build_1337emoji.py
 -> dist/1337emoji/1337emoji.jsx          AE ScriptUI panel (install into "ScriptUI Panels")
 -> dist/1337emoji/1337emoji_pool/e_00000.png …   emoji pool as one image sequence (frame = emoji id)
 -> dist/1337emoji/make_mogrts.jsx         builds + exports the Premiere MOGRTs (16:9 / 9:16 / 1:1)
"""
import json, os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get('EMOJI_SRC', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apple_emoji'))  # folder of Apple emoji PNGs
DIST = os.path.join(HERE, 'dist', '1337emoji')
POOL = os.path.join(DIST, '1337emoji_pool')
VERSION = '1.0.0'

idx = json.load(open(os.path.join(SRC, '_index.json')))


def cp_of(fn):
    m = re.match(r'u?([0-9a-f]+)', fn)
    return int(m.group(1), 16) if m else 0


def is_variant(fn):
    return bool(re.search(r'(light|medium|dark)(_|-)?(skin|light|dark)|_skin', fn))


CATS = ['Faces', 'Hearts', 'Hands', 'Hype', 'Money', 'Cars', 'Party', 'Sports', 'Food', 'Animals', 'Flags', 'Other']
KW = {
    'Hearts': r'heart',
    'Hands': r'hand|thumbs|clapping|fist|victory|pinch|folded|waving|flexed|pointing|crossed_fingers|love-you|call_me|writing|palms|vulcan|backhand|index_pointing|ok_hand',
    'Hype': r'fire|hundred|sparkles|collision|high_voltage|rocket|glowing_star|^star$|dizzy|crown|gem_stone|trophy|sports_medal|1st_place|bomb|eyes|dashing|anger_symbol|light_bulb|fireworks|sparkler',
    'Money': r'money|dollar|euro|pound|yen|coin|credit_card|chart_increasing|bank|receipt',
    'Cars': r'(^|_)car(_|$)|automobile|racing|taxi|bus|motorcycle|chequered|fuel|wrench|wheel|traffic|scooter|utility_vehicle|truck|tractor|police|ambulance|fire_engine|vertical_traffic|motorway|oil_drum|construction|nut_and_bolt|gear',
    'Party': r'party|balloon|confetti|birthday|wrapped_gift|clinking|champagne|tanabata|pinata|ribbon|tada|mirror_ball|disco',
    'Sports': r'ball|goal|medal|sport|boxing|tennis|golf|ski|swim|bow_and_arrow|ice_hockey|cricket|badminton|whistle|stopwatch|flag_in_hole',
    'Faces': r'face|skull|ghost|alien|robot|clown|pile_of_poo|ogre|goblin|jack-o',
}


def category(fn, name):
    c = cp_of(fn)
    n = name.lower().replace(' ', '_')
    if 'flag' in n and 'chequered' not in n and 'triangular' not in n and 'hole' not in n:
        return 'Flags'
    if 0x1F400 <= c <= 0x1F43F or 0x1F980 <= c <= 0x1F9AE or 0x1FAB0 <= c <= 0x1FABF:
        return 'Animals'
    if 0x1F32D <= c <= 0x1F37F or 0x1F950 <= c <= 0x1F96F or 0x1F9C0 <= c <= 0x1F9CB or 0x1FAD0 <= c <= 0x1FADF:
        return 'Food'
    for k in ['Hearts', 'Faces', 'Hands', 'Hype', 'Money', 'Cars', 'Party', 'Sports']:
        if re.search(KW[k], n):
            return k
    return 'Other'


items = []
for fn, d in idx.items():
    if not fn.endswith('.png') or is_variant(fn):
        continue
    items.append((category(fn, d['name']), cp_of(fn), fn, d['name'].title(), d['char']))
items.sort(key=lambda x: (CATS.index(x[0]), x[1], x[2]))

if os.path.isdir(POOL):
    shutil.rmtree(POOL)
os.makedirs(POOL)
ranges, names = {}, []
for i, (cat, cp, fn, name, ch) in enumerate(items):
    shutil.copyfile(os.path.join(SRC, fn), os.path.join(POOL, 'e_%05d.png' % i))
    r = ranges.setdefault(cat, [i, i]); r[1] = i
    names.append([name, cat])
N = len(items)
print('pool', N, {k: v[1] - v[0] + 1 for k, v in ranges.items()})
CAT_MENU = ['All'] + [c for c in CATS if c in ranges]
RANGES = [[0, N - 1]] + [ranges[c] for c in CAT_MENU[1:]]
DIRS = ['Left > Right', 'Right > Left', 'Bottom > Top', 'Top > Bottom', 'Top-Left > Bottom-Right', 'Top-Right > Bottom-Left',
        'Bottom-Left > Top-Right', 'Bottom-Right > Top-Left', 'Burst Out', 'Implode', 'Rain (all sides)']

# ----------------------------------------------------------------- expressions (ES3 / legacy + JS engine safe)
EXPR_HEAD = r'''var c = thisComp.layer("1337_CTRL");
var i = parseInt(thisLayer.name.split("_")[1], 10);
var W = thisComp.width, H = thisComp.height;
var dur = Math.max(0.1, c.effect("Duration (s)")("Slider"));
var spr = clamp(c.effect("Stagger %")("Slider"), 0, 90) / 100;
var seed = Math.round(c.effect("Seed")("Slider"));
seedRandom(seed * 1009 + i * 31, true);
var delay = random(0, spr) * dur, travel = dur * (1 - spr);
var tt = clamp((time - c.inPoint - delay) / travel, 0, 1);
var ez = c.effect("Ease")("Menu").value;
var t = tt;
if (ez == 2) t = tt < .5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2;
if (ez == 3) t = tt < .5 ? Math.pow(2, 20 * tt - 10) / 2 : (2 - Math.pow(2, -20 * tt + 10)) / 2;
if (ez == 4) t = tt == 1 ? 1 : 1 - Math.pow(2, -10 * tt);
var sz = H * c.effect("Size % of height")("Slider") / 100 * (1 + random(-1, 1) * c.effect("Size Variance %")("Slider") / 100);
'''
POS_EXPR = EXPR_HEAD + r'''var d = c.effect("Direction")("Menu").value;
var m = sz, D = Math.sqrt(W * W + H * H);
var a = [0, 0], b = [0, 0];
var u = random(), v = random(), lag = random(0, 0.15);
if (d == 1) { var y = -m + u * (H + 2 * m); a = [-m - lag * W, y]; b = [W + m + (0.15 - lag) * W, y]; }
else if (d == 2) { var y = -m + u * (H + 2 * m); a = [W + m + lag * W, y]; b = [-m - (0.15 - lag) * W, y]; }
else if (d == 3) { var x = -m + u * (W + 2 * m); a = [x, H + m + lag * H]; b = [x, -m - (0.15 - lag) * H]; }
else if (d == 4) { var x = -m + u * (W + 2 * m); a = [x, -m - lag * H]; b = [x, H + m + (0.15 - lag) * H]; }
else if (d >= 5 && d <= 8) {
  var sx = (d == 5 || d == 7) ? 1 : -1, sy = (d == 5 || d == 6) ? 1 : -1;
  var dir = normalize([sx * W, sy * H]); var perp = [-dir[1], dir[0]];
  var c0 = [W / 2 - dir[0] * (D / 2 + m + lag * D * .3), H / 2 - dir[1] * (D / 2 + m + lag * D * .3)];
  var off = (u - .5) * (D + 2 * m);
  a = add(c0, mul(perp, off)); b = add(a, mul(dir, D + 2 * m + .3 * D));
}
else if (d == 9 || d == 10) {
  var ang = u * Math.PI * 2, r0 = v * H * .08, r1 = D * .6 + m + lag * D * .3;
  var p0 = [W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * r0], p1 = [W / 2 + Math.cos(ang) * r1, H / 2 + Math.sin(ang) * r1];
  if (d == 9) { a = p0; b = p1; } else { a = p1; b = p0; }
}
else {
  var side = Math.floor(v * 4);
  if (side == 0) { a = [-m, u * H]; b = [W + m, (1 - u) * H]; }
  else if (side == 1) { a = [W + m, u * H]; b = [-m, (1 - u) * H]; }
  else if (side == 2) { a = [u * W, -m]; b = [(1 - u) * W, H + m]; }
  else { a = [u * W, H + m]; b = [(1 - u) * W, -m]; }
}
var p = add(a, mul(sub(b, a), t));
var wb = c.effect("Wobble px")("Slider");
var ph = random(0, 6.28);
p = add(p, [Math.sin(time * 9 + ph) * wb, Math.cos(time * 7 + ph) * wb]);
p;'''
SCALE_EXPR = EXPR_HEAD + r'''var s = sz / %d * 100;
var pop = c.effect("Pop-in")("Checkbox") == 1 ? clamp(tt * 8, 0, 1) : 1;
[s * pop, s * pop];''' % 160
ROT_EXPR = EXPR_HEAD + r'''var sp = c.effect("Spin")("Angle");
random(-25, 25) + sp * random(.4, 1) * (random() < .5 ? -1 : 1) * t;'''
OPA_EXPR = r'''var c = thisComp.layer("1337_CTRL");
var i = parseInt(thisLayer.name.split("_")[1], 10);
var n = Math.round(c.effect("Emoji Count")("Slider"));
if (i >= n) 0; else {
  var dur = Math.max(0.1, c.effect("Duration (s)")("Slider"));
  var lt = time - c.inPoint;
  (lt < 0 || lt > dur + 0.05) ? 0 : 100;
}'''
TR_EXPR = r'''var c = thisComp.layer("1337_CTRL");
var i = parseInt(thisLayer.name.split("_")[1], 10);
var seed = Math.round(c.effect("Seed")("Slider"));
seedRandom(seed * 7919 + i * 13, true);
var R = %s;
var cat = c.effect("Category")("Menu").value;
var picks = [];
var A = Math.round(c.effect("Emoji A #")("Slider")), B = Math.round(c.effect("Emoji B #")("Slider")), C = Math.round(c.effect("Emoji C #")("Slider"));
if (A > 0) picks.push(A - 1); if (B > 0) picks.push(B - 1); if (C > 0) picks.push(C - 1);
var id;
if (picks.length > 0) id = picks[Math.floor(random(picks.length))];
else { var r = R[cat - 1]; id = Math.floor(random(r[0], r[1] + 1)); }
id;''' % json.dumps(RANGES)

PANEL = r'''// 1337emoji v__VER__ — emoji transitions for After Effects. Private build (Apple emoji, personal use only).
(function (thisObj) {
var VER = "__VER__";
var NAMES = __NAMES__;
var CATS = __CATS__;
var RANGES = __RANGES__;
var DIRS = __DIRS__;
var EASES = ["Linear", "Ease In-Out", "Expo In-Out", "Expo Out"];
var X_POS = __POS__, X_SCALE = __SCALE__, X_ROT = __ROT__, X_OPA = __OPA__, X_TR = __TR__;
var MAXN = 200;

function poolFolder() {
  var here = new File($.fileName).parent;
  var f = new Folder(here.fsName + "/1337emoji_pool");
  if (f.exists) return f;
  return null;
}
function poolItem() {
  var P = app.project;
  for (var i = 1; i <= P.numItems; i++) { var it = P.item(i); if (it instanceof FootageItem && it.name == "1337emoji_pool") return it; }
  var f = poolFolder(); if (!f) { alert("1337emoji: pool folder missing next to the script"); return null; }
  var io = new ImportOptions(new File(f.fsName + "/e_00000.png")); io.sequence = true;
  var it = P.importFile(io); it.name = "1337emoji_pool"; it.mainSource.conformFrameRate = 1;
  var bin = null;
  for (var j = 1; j <= P.numItems; j++) if (P.item(j) instanceof FolderItem && P.item(j).name == "1337emoji") bin = P.item(j);
  if (!bin) bin = P.items.addFolder("1337emoji");
  it.parentFolder = bin; return it;
}
function addSlider(fx, name, v) { var e = fx.addProperty("ADBE Slider Control"); e.name = name; e.property(1).setValue(v); return e; }
function addMenu(fx, name, items, v) {
  var e = fx.addProperty("ADBE Dropdown Control"); var idx = e.propertyIndex;
  try { e.property(1).setPropertyParameters(items); } catch (er) {}
  e = fx.property(idx); e.name = name; e = fx.property(idx); e.property(1).setValue(v); return e;
}
function buildRig(w, h, fps, len, o) {
  var pool = poolItem(); if (!pool) return null;
  var P = app.project;
  var rig = P.items.addComp("1337emoji_" + DIRS[o.dir - 1].replace(/[^A-Za-z]+/g, "") , w, h, 1, len, fps);
  rig.motionBlur = true; rig.shutterAngle = 90; rig.shutterPhase = -45;
  for (var j = 1; j <= P.numItems; j++) if (P.item(j) instanceof FolderItem && P.item(j).name == "1337emoji") rig.parentFolder = P.item(j);
  var ctrl = rig.layers.addNull(len); ctrl.name = "1337_CTRL"; ctrl.label = 1; ctrl.startTime = 0; ctrl.enabled = false;
  var fx = ctrl.property("ADBE Effect Parade");
  addSlider(fx, "Emoji Count", o.count);
  addMenu(fx, "Direction", DIRS, o.dir);
  addSlider(fx, "Duration (s)", o.dur);
  addSlider(fx, "Stagger %", o.stagger);
  addMenu(fx, "Ease", EASES, o.ease);
  addSlider(fx, "Size % of height", o.size);
  addSlider(fx, "Size Variance %", o.sizeVar);
  var sp = fx.addProperty("ADBE Angle Control"); sp.name = "Spin"; sp.property(1).setValue(o.spin);
  addSlider(fx, "Wobble px", o.wobble);
  var pc = fx.addProperty("ADBE Checkbox Control"); pc.name = "Pop-in"; pc.property(1).setValue(o.pop ? 1 : 0);
  addMenu(fx, "Category", CATS, o.cat);
  addSlider(fx, "Emoji A #", o.a); addSlider(fx, "Emoji B #", o.b); addSlider(fx, "Emoji C #", o.c);
  addSlider(fx, "Seed", o.seed);
  for (var i = MAXN - 1; i >= 0; i--) {
    var L = rig.layers.add(pool); L.name = "E_" + i; L.label = 9; L.motionBlur = true;
    L.startTime = 0; L.outPoint = len;
    L.timeRemapEnabled = true;
    var TR = L.property("ADBE Time Remapping"); TR.expression = X_TR;
    var T = L.property("ADBE Transform Group");
    T.property("ADBE Anchor Point").setValue([80, 80]);
    T.property("ADBE Position").expression = X_POS;
    T.property("ADBE Scale").expression = X_SCALE;
    T.property("ADBE Rotate Z").expression = X_ROT;
    T.property("ADBE Opacity").expression = X_OPA;
    L.quality = LayerQuality.BEST; try { L.samplingQuality = LayerSamplingQuality.BICUBIC; } catch (eb) {}
  }
  return rig;
}
function readUI(g) {
  return { count: Math.round(g.count.value), dir: g.dir.selection.index + 1, dur: Number(g.dur.text) || 1.2,
    stagger: Math.round(g.stagger.value), ease: g.ease.selection.index + 1, size: Math.round(g.size.value),
    sizeVar: Math.round(g.sizeVar.value), spin: Math.round(g.spin.value), wobble: Math.round(g.wobble.value),
    pop: g.pop.value, cat: g.cat.selection.index + 1, a: g.picks[0], b: g.picks[1], c: g.picks[2], seed: Math.round(Math.random() * 999) };
}
function apply(g) {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) { alert("1337emoji: open a composition first"); return; }
  app.beginUndoGroup("1337emoji");
  try {
    var o = readUI(g), len = o.dur + 0.2;
    var rig = buildRig(comp.width, comp.height, comp.frameRate, len, o);
    if (rig) {
      var L = comp.layers.add(rig); L.startTime = comp.time; L.collapseTransformation = true; L.label = 10;
      L.name = "1337emoji · " + DIRS[o.dir - 1];
    }
  } catch (e) { alert("1337emoji error: " + String(e.message) + " L" + e.line); }
  app.endUndoGroup();
}
function ui(thisObj) {
  var w = (thisObj instanceof Panel) ? thisObj : new Window("palette", "1337emoji", undefined, { resizeable: true });
  w.orientation = "column"; w.alignChildren = ["fill", "top"]; w.spacing = 6; w.margins = 10;
  var g = { picks: [0, 0, 0] };
  var hdr = w.add("statictext", undefined, "1337emoji  v" + VER); hdr.graphics.font = ScriptUI.newFont("Helvetica", "BOLD", 14);
  function row(label) { var r = w.add("group"); r.orientation = "row"; r.alignChildren = ["left", "center"]; var s = r.add("statictext", undefined, label); s.preferredSize.width = 92; return r; }
  function slider(label, mn, mx, v) {
    var r = row(label); var s = r.add("slider", undefined, v, mn, mx); s.preferredSize.width = 140;
    var t = r.add("edittext", undefined, String(v)); t.characters = 4;
    s.onChanging = function () { t.text = String(Math.round(s.value)); };
    t.onChange = function () { var n = Number(t.text); if (!isNaN(n)) s.value = n; };
    return s;
  }
  g.count = slider("Emoji count", 1, MAXN, 120);
  var r1 = row("Direction"); g.dir = r1.add("dropdownlist", undefined, DIRS); g.dir.selection = 0;
  var r2 = row("Duration (s)"); g.dur = r2.add("edittext", undefined, "1.6"); g.dur.characters = 5;
  g.stagger = slider("Stagger %", 0, 90, 45);
  var r3 = row("Ease"); g.ease = r3.add("dropdownlist", undefined, EASES); g.ease.selection = 1;
  g.size = slider("Size % height", 2, 60, 12);
  g.sizeVar = slider("Size variance", 0, 90, 35);
  g.spin = slider("Spin °", 0, 720, 120);
  g.wobble = slider("Wobble px", 0, 60, 6);
  var r4 = row("Pop-in"); g.pop = r4.add("checkbox", undefined, "scale up on entry"); g.pop.value = true;
  var r5 = row("Category"); g.cat = r5.add("dropdownlist", undefined, CATS); g.cat.selection = 0;
  var pk = w.add("panel", undefined, "Pick up to 3 emoji (overrides category)"); pk.alignChildren = ["fill", "top"];
  var sr = pk.add("group"); sr.add("statictext", undefined, "Search"); var q = sr.add("edittext", undefined, ""); q.characters = 18;
  var lb = pk.add("listbox", undefined, [], { multiselect: false }); lb.preferredSize = [260, 150];
  var prev = pk.add("image", undefined); prev.preferredSize = [80, 80];
  var slotRow = pk.add("group"); var slots = [];
  for (var s = 0; s < 3; s++) { (function (k) { var b = slotRow.add("button", undefined, "Set " + "ABC".charAt(k)); slots.push(b);
    b.onClick = function () { if (!lb.selection) return; g.picks[k] = lb.selection.eid + 1; b.text = "ABC".charAt(k) + ": #" + g.picks[k]; }; })(s); }
  var clr = pk.add("button", undefined, "Clear picks"); clr.onClick = function () { g.picks = [0, 0, 0]; for (var k = 0; k < 3; k++) slots[k].text = "Set " + "ABC".charAt(k); };
  function fill() {
    lb.removeAll(); var t = q.text.toLowerCase(), cat = g.cat.selection.index, n = 0;
    var lo = RANGES[cat][0], hi = RANGES[cat][1];
    for (var i = lo; i <= hi && n < 400; i++) { if (t && NAMES[i][0].toLowerCase().indexOf(t) < 0) continue; var it = lb.add("item", "#" + (i + 1) + "  " + NAMES[i][0]); it.eid = i; n++; }
  }
  q.onChanging = fill; g.cat.onChange = fill;
  lb.onChange = function () { if (!lb.selection) return; var f = poolFolder(); if (!f) return;
    var n = String(lb.selection.eid); while (n.length < 5) n = "0" + n; try { prev.image = ScriptUI.newImage(new File(f.fsName + "/e_" + n + ".png")); } catch (e) {} };
  fill();
  var go = w.add("button", undefined, "APPLY AT PLAYHEAD"); go.preferredSize.height = 34; go.onClick = function () { apply(g); };
  w.add("statictext", undefined, "Tweak later on the rig's 1337_CTRL layer.");
  w.layout.layout(true); w.onResizing = w.onResize = function () { this.layout.resize(); };
  if (w instanceof Window) { w.center(); w.show(); }
  return w;
}
$.global.__1337emoji = { buildRig: buildRig, DIRS: DIRS, CATS: CATS };
if (!$.global.__1337emoji_noui) ui(thisObj);
})(this);
'''

MOGRT = r'''// builds the 1337emoji MOGRTs for Premiere (run in AE via File > Scripts or ae_run.sh)
app.beginSuppressDialogs();
var OUT = "__OUT__";
var LOG = new File(OUT + "/mogrt_build.log"); LOG.open("w");
function log(m) { LOG.writeln(m); }
try {
  if (app.project && app.project.dirty) {
    if (app.project.file == null) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
    else { log("ABORT: saved project has unsaved changes: " + app.project.file.fsName); throw new Error("dirty"); }
  }
  app.newProject();
  $.global.__1337emoji_noui = true;
  $.evalFile(new File("__PANEL__"));   // defines $.global.__1337emoji (panel window not shown when not docked? palette pops; closed below)
  var API = $.global.__1337emoji;
  var SIZES = [["16x9_4K", 3840, 2160], ["9x16_4K", 2160, 3840], ["1x1_4K", 2160, 2160]];
  for (var s = 0; s < SIZES.length; s++) {
    var o = { count: 120, dir: 1, dur: 1.6, stagger: 45, ease: 2, size: 12, sizeVar: 35, spin: 120, wobble: 6, pop: true, cat: 1, a: 0, b: 0, c: 0, seed: 164 };
    var rig = API.buildRig(SIZES[s][1], SIZES[s][2], 30, 3, o);
    rig.name = "1337emoji_" + SIZES[s][0];
    var ctrl = rig.layer("1337_CTRL"), fx = ctrl.property("ADBE Effect Parade");
    for (var k = 1; k <= fx.numProperties; k++) {
      var e = fx.property(k);
      try { e.property(1).addToMotionGraphicsTemplateAs(rig, e.name); } catch (er) { log("EG add fail " + e.name + ": " + er.message); }
    }
    rig.motionGraphicsTemplateName = "1337emoji " + SIZES[s][0];
    var f = new File(OUT + "/1337emoji_" + SIZES[s][0] + ".mogrt");
    var ok = rig.exportAsMotionGraphicsTemplate(true, f.fsName);
    log("export " + f.fsName + " -> " + ok);
  }
  app.project.save(new File(OUT + "/1337emoji_rigs.aep"));
  log("done");
} catch (e) { log("ERROR " + String(e.message) + " L" + e.line); }
LOG.close(); app.endSuppressDialogs(false);
'''

panel = (PANEL.replace('__VER__', VERSION).replace('__NAMES__', json.dumps(names, ensure_ascii=True))
         .replace('__CATS__', json.dumps(CAT_MENU)).replace('__RANGES__', json.dumps(RANGES)).replace('__DIRS__', json.dumps(DIRS))
         .replace('__POS__', json.dumps(POS_EXPR)).replace('__SCALE__', json.dumps(SCALE_EXPR)).replace('__ROT__', json.dumps(ROT_EXPR))
         .replace('__OPA__', json.dumps(OPA_EXPR)).replace('__TR__', json.dumps(TR_EXPR)))
open(os.path.join(DIST, '1337emoji.jsx'), 'w').write(panel)
open(os.path.join(DIST, 'make_mogrts.jsx'), 'w').write(MOGRT.replace('__OUT__', DIST).replace('__PANEL__', os.path.join(DIST, '1337emoji.jsx')))
json.dump({'version': VERSION, 'count': N, 'categories': CAT_MENU, 'ranges': RANGES, 'directions': DIRS},
          open(os.path.join(DIST, 'manifest.json'), 'w'), indent=1)
print('wrote', DIST)
