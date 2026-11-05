// Fix for properties-description-footer-hidden: the description line goes with the property
// list into the PROPERTIES panel, stuck to the bottom of the list's scrolling box.
// Written on BETA 1034; the local names are ours (scripts/ide-js/names.json), not twinBASIC's.
// Applied with `node scripts/ide_js.mjs patch bugs/properties-description-footer-hidden/fix.js --copy-to <dir>`.
function propertyOnGotFocus(globals, valueCell, propertyName) {
  globals.propertyValueEditor = 1;
  // The list went to the PROPERTIES panel, and the line stayed in the designer's empty box.
  const line = globals.proprtiesBoxFooter;
  if (line.parentNode !== globals.propertiesBoxInner) {
    globals.propertiesBoxInner.appendChild(line);
    line.style.position = "sticky";
    line.style.zIndex = 1112; // above the list's sticky headers
    line.style.boxSizing = "border-box";
    line.style.color = "var(--themeSectionHeaderTextColor)";
    line.style.backgroundColor = "var(--themePanelHeaderBackColor)";
  }
  globals.proprtiesBoxFooter.innerText = valueCell.title;
  if (globals.proprtiesBoxFooter.innerHTML)
    globals.proprtiesBoxFooter.innerHTML = globals.infoIcon + globals.proprtiesBoxFooter.innerHTML;
  globals.focusedPropertyName = propertyName;
}
