// builds the 1337emoji MOGRTs for Premiere (run in AE via File > Scripts or ae_run.sh)
app.beginSuppressDialogs();
var OUT = new File($.fileName).parent.fsName;
var LOG = new File(OUT + "/mogrt_build.log"); LOG.open("w");
function log(m) { LOG.writeln(m); }
try {
  if (app.project && app.project.dirty) {
    if (app.project.file == null) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
    else { log("ABORT: saved project has unsaved changes: " + app.project.file.fsName); throw new Error("dirty"); }
  }
  app.newProject();
  $.global.__1337emoji_noui = true;
  $.evalFile(new File(OUT + "/1337emoji.jsx"));
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
