// Fix for console-cleared-at-open: the list starts with its cached-heights flag false, not unset,
// so the first setUseCachedItemHeights(false), as the first project's console options are applied,
// finds nothing to change and does not empty the DEBUG CONSOLE after the IDE's own clear. Every list
// createListView makes already reads an unset flag as false, so nothing else changes.
// Written on BETA 1042; the local names are ours (scripts/ide-js/names.json), not twinBASIC's.
// Applied with `node scripts/ide_js.mjs patch bugs/console-cleared-at-open/fix.js --copy-to <dir>`.
function createListView(container) {
  var list = createVirtualListView(container);
  list.invertMode = false;
  list.noCache = true;
  list.dataNodes = [];
  list.dataNodesDATA = [];
  list.dataNodesCachedHeight = [];
  list.dataNodesCachedWidth = [];
  list.totalCachedItemsHeight = 0;
  list.useCachedItemHeights = false;
  list.onAsyncGetItemHTML = (htmlRow) => list.dataNodes[htmlRow];
  list.onAsyncGetItemHeight = (heightRow, element) => {
    var width = list.cachedClientWidth;
    if (width == list.dataNodesCachedWidth[heightRow]) {
      return list.dataNodesCachedHeight[heightRow];
    } else {
      var height = element.offsetHeight;
      list.dataNodesCachedHeight[heightRow] = height;
      list.dataNodesCachedWidth[heightRow] = width;
      return height;
    }
  };
  list.getItem = (itemRow) => list.dataNodes[itemRow];
  list.getItemData = (dataRow) => list.dataNodesDATA[dataRow];
  list.updateItem = (updatedRow, newHtml) => {
    if (newHtml !== undefined) list.dataNodes[updatedRow] = newHtml.toString();
    list.notifyChangedItem(updatedRow);
    if (list.useCachedItemHeights) {
      list.totalCachedItemsHeight -= list.dataNodesCachedHeight[updatedRow];
      list.updateCachedItemHeight(updatedRow);
    }
  };
  list.addItem = (addedHtml, addedData) => {
    var addedRow = list.itemCount;
    if (addedHtml !== undefined) list.dataNodes[addedRow] = addedHtml.toString();
    if (addedData !== undefined) list.dataNodesDATA[addedRow] = addedData;
    if (list.useCachedItemHeights) {
      list.updateCachedItemHeight(addedRow);
    }
    list.setItemCount(addedRow + 1);
    return addedRow;
  };
  list.setUseCachedItemHeights = (use) => {
    if (!use) use = false;
    if (list.useCachedItemHeights === use) return;
    list.useCachedItemHeights = use;
    list.outerScrollable.useCachedItemHeights = use;
    list.pendingAdds = [];
    list.clear();
    list.updateScrollRange();
    list.repaint();
  };
  list.removeItem = (removedRow) => {
    list.dataNodes.splice(removedRow, 1);
    list.dataNodesDATA.splice(removedRow, 1);
    list.dataNodesCachedHeight.splice(removedRow, 1);
    list.dataNodesCachedWidth.splice(removedRow, 1);
    var visible = false;
    var lastVisible = list.visibleTop + list.visibleCount;
    if (removedRow <= lastVisible) {
      visible = true;
    } else {
    }
    list.setItemCount(list.itemCount - 1, visible);
  };
  list.clear = () => {
    list.dataNodes = [];
    list.dataNodesDATA = [];
    list.dataNodesCachedHeight = [];
    list.dataNodesCachedWidth = [];
    list.itemCount = 0;
    list.cachedHeights = [];
    list.totalCachedItemsHeight = 0;
    list.resetScrollPosition();
    list.repaint();
  };
  return list;
}
