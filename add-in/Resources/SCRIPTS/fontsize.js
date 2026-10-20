// Tells the add-in the IDE's font size, now and whenever the IDE changes it,
// so that the detached window can be set in the same size. The IDE keeps it
// in --ide-fontsize on the page's root, and sets its text from that. Running
// this again replaces the observer an earlier run put in.
var sink = this.parentNode;
var old = window.tbDocsFontSize;
if (old) {
  old.observer.disconnect();
  window.tbDocsFontSize = null;
}
var last = null;
var send = function () {
  var size = getComputedStyle(document.documentElement).getPropertyValue("--ide-fontsize").trim();
  if (!size) size = getComputedStyle(document.body).fontSize;
  if (size === last) return;
  last = size;
  try {
    sink.tbDocsFontSize({ value: size });
  } catch (err) {
    console.error(err);
  }
};
var observer = new MutationObserver(send);
observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
window.tbDocsFontSize = { observer: observer };
send();
