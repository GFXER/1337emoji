// 1337emoji 2.0 host side (Premiere Pro + After Effects). Returns plain strings (ExtendScript has no JSON).
function emoji1337_isPPro() { return BridgeTalk.appName === "premierepro"; }

function emoji1337_info() {
  try {
    if (emoji1337_isPPro()) {
      var s = app.project.activeSequence; if (!s) return "none";
      var st = s.getSettings();
      var fps = 1 / st.videoFrameRate.seconds;
      return st.videoFrameWidth + "|" + st.videoFrameHeight + "|" + fps + "|" + s.getPlayerPosition().seconds;
    }
    var c = app.project.activeItem; if (!(c instanceof CompItem)) return "none";
    return c.width + "|" + c.height + "|" + c.frameRate + "|" + c.time;
  } catch (e) { return "err " + e.message; }
}

function emoji1337_insert(path, start, dur) {
  try {
    if (start < 0) start = 0;
    if (emoji1337_isPPro()) {
      var P = app.project, s = P.activeSequence; if (!s) return "No active sequence.";
      var bin = null;
      for (var b = 0; b < P.rootItem.children.numItems; b++) { var it = P.rootItem.children[b]; if (it.type === ProjectItemType.BIN && it.name === "1337emoji") bin = it; }
      if (!bin) bin = P.rootItem.createBin("1337emoji");
      P.importFiles([path], true, bin, false);
      var item = null;
      for (var i = bin.children.numItems - 1; i >= 0; i--) { var c = bin.children[i]; if (c.getMediaPath && c.getMediaPath() === path) { item = c; break; } }
      if (!item) return "Imported, but could not find the clip in the 1337emoji bin.";
      var end = start + dur, target = -1;
      for (var t = 1; t < s.videoTracks.numTracks && target < 0; t++) {
        var tr = s.videoTracks[t], free = true;
        for (var k = 0; k < tr.clips.numItems; k++) { var cl = tr.clips[k]; if (cl.start.seconds < end && cl.end.seconds > start) { free = false; break; } }
        if (free) target = t;
      }
      if (target < 0) {
        try { app.enableQE(); qe.project.getActiveSequence().addTracks(1, s.videoTracks.numTracks, 0); target = s.videoTracks.numTracks - 1; }
        catch (eq) { return "No free video track above V1. Add a track and try again."; }
      }
      s.videoTracks[target].overwriteClip(item, start);
      return "Inserted on V" + (target + 1) + " at " + start.toFixed(2) + "s (" + dur.toFixed(2) + "s).";
    }
    var comp = app.project.activeItem; if (!(comp instanceof CompItem)) return "No active composition.";
    app.beginUndoGroup("1337emoji");
    var fi = app.project.importFile(new ImportOptions(new File(path)));
    var L = comp.layers.add(fi); L.startTime = start; L.name = "1337emoji";
    app.endUndoGroup();
    return "Added to comp at " + start.toFixed(2) + "s.";
  } catch (e) { return "Insert error: " + e.message + " (line " + e.line + ")"; }
}
