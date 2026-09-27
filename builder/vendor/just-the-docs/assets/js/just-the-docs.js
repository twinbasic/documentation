(function (jtd, undefined) {

// Event handling

jtd.addEvent = function(el, type, handler) {
  if (el.attachEvent) el.attachEvent('on'+type, handler); else el.addEventListener(type, handler);
}
jtd.removeEvent = function(el, type, handler) {
  if (el.detachEvent) el.detachEvent('on'+type, handler); else el.removeEventListener(type, handler);
}
jtd.onReady = function(ready) {
  // in case the document is already rendered
  if (document.readyState!='loading') ready();
  // modern browsers
  else if (document.addEventListener) document.addEventListener('DOMContentLoaded', ready);
  // IE <= 8
  else document.attachEvent('onreadystatechange', function(){
      if (document.readyState=='complete') ready();
  });
}

// Show/hide mobile menu

function initNav() {
  jtd.addEvent(document, 'click', function(e){
    var target = e.target;
    while (target && !(target.classList && target.classList.contains('nav-list-expander'))) {
      target = target.parentNode;
    }
    if (target) {
      e.preventDefault();
      var isActive = target.parentNode.classList.toggle('active');
      target.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    }
  });

  const siteNav = document.getElementById('site-nav');
  const mainHeader = document.getElementById('main-header');
  const menuButton = document.getElementById('menu-button');

  disableHeadStyleSheets();

  function closeMenu() {
    menuButton.classList.remove('nav-open');
    siteNav.classList.remove('nav-open');
    mainHeader.classList.remove('nav-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.focus();
  }

  jtd.addEvent(menuButton, 'click', function(e){
    e.preventDefault();

    if (menuButton.classList.toggle('nav-open')) {
      siteNav.classList.add('nav-open');
      mainHeader.classList.add('nav-open');
      menuButton.setAttribute('aria-expanded', 'true');
      var firstLink = siteNav.querySelector('a');
      if (firstLink) firstLink.focus();
    } else {
      closeMenu();
    }
  });

  jtd.addEvent(document, 'keydown', function(e){
    if (e.key === 'Escape' && menuButton.classList.contains('nav-open')) {
      closeMenu();
    }
  });
}

// The <head> element is assumed to include the following stylesheets:
// - a <link> to /assets/css/just-the-docs-head-nav.css,
//             with id 'jtd-head-nav-stylesheet'
// - a <style> containing the result of _includes/css/activation.scss.liquid.
// To avoid relying on the order of stylesheets (which can change with HTML
// compression, user-added JavaScript, and other side effects), stylesheets
// are only interacted with via ID

function disableHeadStyleSheets() {
  const headNav = document.getElementById('jtd-head-nav-stylesheet');
  if (headNav) {
    headNav.disabled = true;
  }

  const activation = document.getElementById('jtd-nav-activation');
  if (activation) {
    activation.disabled = true;
  }
}
// Site search

function initSearch() {
  // Patched: lazy index build (WIP.Search.md rollout step 5C). Building
  // the lunr index eagerly, on every page load, cost about 1.3s and
  // 240MB of heap even for readers who never open search (see
  // WIP.Search.md's per-page-view cost table). initSearch() now only
  // defines how to fetch and build the index -- loadIndex() below -- and
  // hands that to searchLoaded(), which wires up the search box right
  // away but doesn't call loadIndex() until the first keystroke. See
  // builder/vendor/just-the-docs/README.md.
  function loadIndex(onSuccess, onError) {
    var request = new XMLHttpRequest();
    request.open('GET', (window.jtdBaseurl || '') + '/assets/js/search-data.json', true);

    request.onload = function(){
      if (request.status >= 200 && request.status < 400) {
        try {
          var docs = JSON.parse(request.responseText);

          // Patched: split runs of 2+ dots into spaces before tokenising
          // (step 5B). Titles like "Do...Loop" and "For Each...Next"
          // tokenised as a single token ("do...loop"), because lunr's
          // tokenizer tests one character at a time against `separator`,
          // so a `\.{2,}` alternative in that regex can't work. Wrapping
          // lunr.tokenizer instead: for a string input, every run of 2+
          // dots becomes the same number of spaces (character positions
          // stay valid, so match highlighting still works), then the
          // original tokenizer runs as usual; non-string input (arrays,
          // null) passes through unchanged. Installed once -- lunr is a
          // global singleton and loadIndex() can run again after a failed
          // load -- and the wrapper has to carry `separator` itself,
          // because the original tokenizer reads `lunr.tokenizer.separator`
          // at call time, which after this reassignment resolves to the
          // wrapper's own property, not the original function's. See
          // builder/vendor/just-the-docs/README.md and WIP.Search.md's
          // "Design" section.
          if (!lunr.tokenizer.dotRunSplit) {
            var originalTokenizer = lunr.tokenizer;
            var dotRunSplitTokenizer = function (input) {
              if (typeof input === 'string') {
                input = input.replace(/\.{2,}/g, function (m) {
                  return new Array(m.length + 1).join(' ');
                });
              }
              return originalTokenizer(input);
            };
            dotRunSplitTokenizer.dotRunSplit = true;
            dotRunSplitTokenizer.separator = /[\s\-\/]+/;
            lunr.tokenizer = dotRunSplitTokenizer;
          }

          var index = lunr(function(){
            this.ref('id');
            this.field('title', { boost: 200 });
            this.field('content', { boost: 2 });
            // Patched: two extra fields joined in at build time from the symbol
            // index (builder/search.mjs's joinSymbolsToEntries) -- bare names
            // ("PaintPicture") and their qualified "Container.Name" forms
            // ("Form.PaintPicture"). Two fields, not one, because BM25 discounts
            // a match inside a long field, and the qualified forms are longer;
            // splitting them keeps the short bare names scoring well on their
            // own. See builder/vendor/just-the-docs/README.md and
            // WIP.Search.md's "Design" §2. `qualified` weighs most of the two
            // since only a qualified name reaches it (see doSearch()), and
            // naming one is the most specific thing a reader can type
            // (WIP.Search.md, "What shipped, fourth round").
            this.field('names', { boost: 100 });
            this.field('qualified', { boost: 500 });
            // Patched: `exact` holds each bare name whole (see exactName()
            // below), for a query naming it exactly; `primary` holds the same
            // for the names that are types or language elements (the build
            // lists them), so `Left` finds the Strings function before 40
            // controls' Left properties; `page` holds the page's title, so a
            // page whose title the reader typed outranks a section of another
            // page that only mentions it. See WIP.Search.md, "Reader intent".
            this.field('exact', { boost: 50 });
            this.field('primary', { boost: 1000 });
            this.field('page', { boost: 5 });
            // Patched: `index` holds the entry's hand-marked index terms
            // (builder/search.mjs's attachIndexMarks), as indexField() below
            // writes them. See WIP.Search.md, "What shipped, third round:
            // the index pilot".
            this.field('index', { boost: 1000 });
            this.field('relUrl');
            this.metadataWhitelist = ['position']
            pinIndexFieldLengths(this);
            // Patched: keep stop words in the index (step 5A). lunr's index
            // pipeline runs lunr.stopWordFilter by default, but its search
            // pipeline never did, so English stop words were dropped from the
            // index while a query still carried them and could never match --
            // many are twinBASIC keywords (Do, For, If, Is, On, With, Each...).
            // See WIP.Search.md's "Design" section.
            this.pipeline.remove(lunr.stopWordFilter);

            for (var i in docs) {

              this.add({
                id: i,
                title: docs[i].title,
                content: indexedContent(docs[i]),
                names: docs[i].names || '',
                qualified: docs[i].qualified || '',
                exact: (docs[i].names || '').split(/\s+/).filter(Boolean).map(exactName).join(' '),
                primary: (docs[i].primary || '').split(/\s+/).filter(Boolean).map(exactName).join(' '),
                page: docs[i].doc || '',
                index: indexField(docs[i]),
                relUrl: docs[i].relUrl
              });
            }
          });

          onSuccess(index, docs);
        } catch (e) {
          console.log('Error building search index: ' + e);
          onError();
        }
      } else {
        console.log('Error loading ajax request. Request status:' + request.status);
        onError();
      }
    };

    request.onerror = function(){
      console.log('There was a connection error');
      onError();
    };

    request.send();
  }

  searchLoaded(loadIndex);
}

// Patched: a name as the `exact` and `primary` fields hold it -- lowercased,
// with every non-word character spelled as `_` and its hex code, and `_`
// appended. lunr's trimmer would strip those characters from the ends,
// turning `#If` into `if` and `<>` into nothing; spelled out, they survive,
// so `#If`, `Time$` and the operators stay distinct names. The final `_`
// keeps a whole-name query off every longer name that starts with it (`Node`
// against `Nodes`); no Porter stemmer rule touches a word ending in it. Used
// by initSearch() above and doSearch() below.
function exactName(name) {
  return name.toLowerCase().replace(/\W/g, function(c) {
    return '_' + c.charCodeAt(0).toString(16);
  }) + '_';
}

// Patched: a hand-marked index term as the `index` field holds it -- its
// words as the index holds words (tokenized, trimmed and stemmed), joined by
// `_`, with `_` appended, so the whole term is one token. A query matches it
// only by naming the whole term (see indexKeys in doSearch() below). No
// stemmer rule touches a word ending in `_`, and the trimmer keeps it.
function phraseKey(tokens) {
  return tokens.map(function(t) {
    return lunr.stemmer(t.clone()).toString();
  }).join('_') + '_';
}

function indexTermKey(term) {
  var tokens = lunr.tokenizer(term).map(function(t) {
    return lunr.trimmer(t);
  }).filter(function(t) {
    return t.str !== '';
  });
  return tokens.length ? phraseKey(tokens) : '';
}

// Patched: a search entry's `index` field. Its main terms (`index`) as
// indexTermKey() writes them, and its secondary ones (`index_also`) with one
// more `_`, so that doSearch() can weigh the two apart within one field. One
// field, not two, because lunr gives every term in the whole index a slot
// for every field: as two fields, with the words below as a third, the
// index took 24 MB more heap; as one, 5 MB.
function indexField(doc) {
  var main = (doc.index || []).map(indexTermKey).filter(Boolean);
  var also = (doc.index_also || []).map(indexTermKey).filter(Boolean).map(function(k) {
    return k + '_';
  });
  return main.concat(also).join(' ');
}

// Patched: a search entry's content, with its index terms appended as plain
// words, so an entry marked `late binding` still has both words when a query
// requires all of them.
function indexedContent(doc) {
  var terms = (doc.index || []).concat(doc.index_also || []);
  return terms.length ? doc.content + ' ' + terms.join(' ') : doc.content;
}

// Patched: BM25 scales a match by its field's length against the average
// length of that field, and `index` is empty on nearly every entry, so its
// average is near zero and a marked entry looked a thousand times too long:
// its match counted for almost nothing, and would count for more with every
// page marked. A term fills the field on its own, so the average is pinned
// at one term. Called from the lunr builder function in initSearch().
function pinIndexFieldLengths(builder) {
  var averageLengths = builder.calculateAverageFieldLengths;
  builder.calculateAverageFieldLengths = function() {
    averageLengths.call(this);
    this.averageFieldLength.index = 1;
  };
}

// Patched: the kinds tB/symbols.json gives its symbols, less `enumvalue`,
// which nobody types. A query naming one thing plus its kind -- `With
// statement`, `AddressOf operator` -- is treated as naming that thing.
var KIND_WORDS = ['operator', 'statement', 'attribute', 'keyword', 'directive', 'class', 'method', 'property', 'module', 'function', 'constant', 'enum', 'object', 'member', 'sub', 'package', 'interface', 'control', 'event', 'type', 'field'];

function searchLoaded(loadIndex) {
  // Patched: index/docs start out unbuilt (step 5C) -- loadIndex() (from
  // initSearch(), above) isn't called until the first non-empty keystroke,
  // in loadIndexNow() below.
  var index = null;
  var docs = null;
  var indexLoading = false;
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');
  var mainHeader = document.getElementById('main-header');
  var currentInput;
  var currentSearchIndex = 0;

  var searchResultCounter = 0;

  function showSearch() {
    document.documentElement.classList.add('search-active');
    searchInput.setAttribute('aria-expanded', 'true');
  }

  function hideSearch() {
    document.documentElement.classList.remove('search-active');
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
  }

  // Patched: shared by the "loading" and "failed" states (step 5C). Reuses
  // .search-no-result -- same slot, same style as "No results found" --
  // rather than adding a class for what is visually the same single
  // centred message.
  function showStatusMessage(text) {
    searchResults.innerHTML = '';
    var statusDiv = document.createElement('div');
    statusDiv.classList.add('search-no-result');
    statusDiv.innerText = text;
    searchResults.appendChild(statusDiv);
    var statusEl = document.getElementById('a11y-status');
    if (statusEl) statusEl.textContent = text;
  }

  // Patched: starts the deferred fetch + build (step 5C). Only one load
  // ever runs at a time -- a keystroke that lands while `indexLoading` is
  // true just returns below in update(), and finishLoad() re-reads the
  // search box once the build finishes, so it searches whatever is in it
  // by then, not whatever triggered the load.
  function loadIndexNow() {
    if (indexLoading) return;
    indexLoading = true;
    showStatusMessage('Loading search index\u2026');
    // Yield so the loading message above actually paints before the
    // synchronous (and comparatively expensive) index build runs on the
    // main thread: a frame, then a task. requestAnimationFrame never fires
    // while the tab is hidden, so a 100 ms timer races it -- whichever
    // comes first starts the load, and the other does nothing.
    var started = false;
    function start() {
      if (started) return;
      started = true;
      setTimeout(function() {
        loadIndex(function(loadedIndex, loadedDocs) {
          index = loadedIndex;
          docs = loadedDocs;
          indexLoading = false;
          finishLoad();
        }, function() {
          indexLoading = false;
          index = null; // stays null, so the next keystroke retries the load
          showStatusMessage('Search is unavailable');
        });
      }, 0);
    }
    requestAnimationFrame(start);
    setTimeout(start, 100);
  }

  // Runs once loadIndex() succeeds, against whatever is in the search box
  // *now* -- which may have changed while the fetch + build were in flight.
  function finishLoad() {
    var value = searchInput.value;
    currentInput = value;
    searchResults.innerHTML = ''; // clear the "Loading search index..." message
    if (value === '') {
      return;
    }
    doSearch(value);
  }

  function update() {
    currentSearchIndex++;

    var input = searchInput.value;
    if (input === '') {
      hideSearch();
    } else {
      showSearch();
      // scroll search input into view, workaround for iOS Safari
      window.scroll(0, -1);
      setTimeout(function(){ window.scroll(0, 0); }, 0);
    }
    if (input === currentInput) {
      return;
    }
    currentInput = input;
    if (input === '') {
      searchResults.innerHTML = '';
      return;
    }

    // Patched: the index isn't fetched or built until now, on the first
    // non-empty keystroke (step 5C). loadIndexNow() shows the loading
    // state and, once loadIndex() finishes, finishLoad() runs the search.
    // This comes before the panel is cleared, so a keystroke that lands
    // mid-load leaves "Loading search index..." in place rather than
    // blanking the panel until the build finishes.
    if (index === null) {
      loadIndexNow();
      return;
    }
    searchResults.innerHTML = '';

    doSearch(input);
  }

  // Patched: split out of update() (step 5C) so update() can gate on the
  // index being loaded first. Everything below is unchanged from upstream
  // (plus the asterisk guard and smart dot split patches, both pre-existing).
  function doSearch(input) {

    // Patched: trim each token as the index's own pipeline did
    // (lunr.trimmer), so `Date$` finds `date`, and drop tokens left empty.
    // That includes tokens made only of asterisks: lunr's query engine throws
    // on a bare-wildcard term ("Cannot read properties of undefined (reading
    // '_index')"), so a search for `*` or `**` used to crash and leave search
    // broken until the page reloaded. See builder/vendor/just-the-docs/README.md.
    var queryTokens = lunr.tokenizer(input).map(function(token) {
      return lunr.trimmer(token);
    }).filter(function(token) {
      return token.str !== '';
    });
    var baseTokens = queryTokens;

    // Patched: smart dot split. A qualified name like "Form.PaintPicture"
    // tokenises as the single token "form.paintpicture", which almost never
    // occurs verbatim in the index, so a qualified-name search used to miss
    // its target 99.6% of the time. Each token is kept whole -- so
    // "Debug.Print" still matches its own entry first -- and, where a "."
    // sits between identifier characters on both sides, also split into its
    // parts as extra terms. Parts of one character are dropped, which is
    // what keeps "1.0", "3.9", "e.g." and "i.e." from adding noise: none of
    // those leave a part longer than one character. A split dot is one whose
    // run of word characters before it holds a letter or underscore; it is
    // marked with a NUL and split there, rather than found with a
    // lookbehind, because Safari before 16.4 cannot parse a lookbehind and
    // the SyntaxError would take this whole file down with it. See
    // builder/vendor/just-the-docs/README.md and WIP.Search.md's "Design" §3.
    var DOT_SPLIT = /([A-Za-z_]\w*)\.(?=[A-Za-z_])/g;
    var allTokens = [];
    var qualifiedTokens = [];
    queryTokens.forEach(function(token) {
      allTokens.push(token);
      var marked = token.str.replace(DOT_SPLIT, '$1\u0000');
      if (marked !== token.str) {
        qualifiedTokens.push(token);
        marked.split('\u0000').forEach(function(part) {
          if (part.length > 1) {
            allTokens.push(token.clone(function() { return part; }));
          }
        });
      }
    });
    queryTokens = allTokens;

    // Patched: qualified names. `qualified` holds each `Container.Name`
    // whole, so only a qualified name may complete there with the trailing
    // wildcard. A plain word would complete to every member of each
    // container its name begins (`vbfile*` to `vbfileattribute.*`). Two
    // adjacent words, joined with a dot, name a member as a qualified name
    // does (`FileListBox Name`). See WIP.Search.md, "What shipped, fourth
    // round".
    var plainTokens = queryTokens.filter(function(token) {
      return qualifiedTokens.indexOf(token) === -1;
    });
    var pairTokens = [];
    for (var p = 0; p + 1 < baseTokens.length; p++) {
      if (qualifiedTokens.indexOf(baseTokens[p]) === -1 && qualifiedTokens.indexOf(baseTokens[p + 1]) === -1) {
        pairTokens.push(baseTokens[p].clone(function(str) { return str + '.' + baseTokens[p + 1].str; }));
      }
    }

    // Patched: every field but `exact`, `primary` and `index`, which only
    // their own clauses below may search -- otherwise the trailing wildcard
    // `node*` matches `nodes_` there too. A query naming one thing also
    // matches that whole name in `exact` and `primary`. One thing is one
    // word, not counting words that name a kind: in a phrase such as "error
    // handling", `error` on its own isn't what the reader named, but in
    // "With statement", `With` is.
    var textFields = ['title', 'content', 'names', 'qualified', 'page', 'relUrl'];
    var plainFields = ['title', 'content', 'names', 'page', 'relUrl'];
    var words = input.split(/\s+/).filter(Boolean);
    var named = words.filter(function(w) {
      return KIND_WORDS.indexOf(w.toLowerCase().replace(/s$/, '')) === -1;
    });
    var name = named.length === 1 ? named[0] : words.length === 1 ? words[0] : null;
    // Patched: hand-marked index terms. Every run of up to four
    // consecutive words, written as indexTermKey() writes a term, so a query
    // matches a term by naming all of it, alone or among other words. A
    // secondary term (the key with one more `_`, see indexField()) weighs a
    // fifth of a main one: the field's boost of 1000 against 200.
    var indexKeys = [];
    for (var a = 0; a < baseTokens.length; a++) {
      for (var b = a + 1; b <= baseTokens.length && b - a <= 4; b++) {
        indexKeys.push(phraseKey(baseTokens.slice(a, b)));
      }
    }
    function anyWords(query) {
      query.term(queryTokens, {
        fields: textFields,
        boost: 10
      });
      query.term(plainTokens, {
        fields: plainFields,
        wildcard: lunr.Query.wildcard.TRAILING
      });
      query.term(qualifiedTokens, {
        fields: textFields,
        wildcard: lunr.Query.wildcard.TRAILING
      });
      query.term(pairTokens, { fields: ['qualified'], boost: 10 });
      if (name) {
        query.term(exactName(name), { fields: ['exact', 'primary'] });
      }
      indexKeys.forEach(function(key) {
        query.term(key, { fields: ['index'], boost: 5, usePipeline: false });
        query.term(key + '_', { fields: ['index'], boost: 1, usePipeline: false });
      });
    }

    // Patched: all words first. With two or more words, look for entries
    // that contain every one of them, and only if there are none, for
    // entries that contain any. Each word is required as its stem with a
    // trailing wildcard, since the index holds stems (an unstemmed
    // `operator*` would miss `oper`); a whole word and a partly typed one
    // both match. See WIP.Search.md, "Reader intent". A word found only in
    // `qualified` still counts (an entry may name its container nowhere
    // else), but scores there only if it is a qualified name, as in
    // anyWords(): so the REQUIRED clause, which scores too, has boost 0, and
    // a second clause scores the word.
    var results = [];
    if (baseTokens.length >= 2) {
      results = index.query(function (query) {
        anyWords(query);
        baseTokens.forEach(function(token) {
          var stem = lunr.stemmer(token.clone()).toString();
          query.term(stem, {
            fields: textFields,
            wildcard: lunr.Query.wildcard.TRAILING,
            usePipeline: false,
            presence: lunr.Query.presence.REQUIRED,
            boost: 0
          });
          query.term(stem, {
            fields: qualifiedTokens.indexOf(token) === -1 ? plainFields : textFields,
            wildcard: lunr.Query.wildcard.TRAILING,
            usePipeline: false
          });
        });
      });
    }
    // A name with no word characters (`<>`, `*`) leaves no tokens, but its
    // exact-name clause can still match.
    if (results.length == 0 && (queryTokens.length > 0 || name)) {
      results = index.query(anyWords);
    }

    if ((results.length == 0) && (input.length > 2) && (queryTokens.length > 0)) {
      var tokens = queryTokens.filter(function(token, i) {
        return token.str.length < 20;
      })
      if (tokens.length > 0) {
        results = index.query(function (query) {
          // Patched: capped at 2. Upstream takes the distance from the whole
          // query's length and applies it to every word, and lunr's fuzzy
          // expansion grows exponentially with it: three unindexed API names
          // (49 characters, distance 5) froze the page for 5 s at 1.6 GB, four
          // (70, distance 6) for over a minute. See builder/vendor/just-the-docs/README.md.
          query.term(tokens, {
            editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1)))
          });
        });
      }
    }

    var statusEl = document.getElementById('a11y-status');
    if (results.length == 0) {
      var noResultsDiv = document.createElement('div');
      noResultsDiv.classList.add('search-no-result');
      noResultsDiv.innerText = 'No results found';
      searchResults.appendChild(noResultsDiv);
      if (statusEl) statusEl.textContent = 'No results found';

    } else {
      var resultsList = document.createElement('ul');
      resultsList.classList.add('search-results-list');
      resultsList.setAttribute('role', 'listbox');
      searchResults.appendChild(resultsList);

      addResults(resultsList, results, 0, 10, 100, currentSearchIndex);
      if (statusEl) statusEl.textContent = results.length + (results.length === 1 ? ' result' : ' results');
    }

    function addResults(resultsList, results, start, batchSize, batchMillis, searchIndex) {
      if (searchIndex != currentSearchIndex) {
        return;
      }
      for (var i = start; i < (start + batchSize); i++) {
        if (i == results.length) {
          return;
        }
        addResult(resultsList, results[i]);
      }
      setTimeout(function() {
        addResults(resultsList, results, start + batchSize, batchSize, batchMillis, searchIndex);
      }, batchMillis);
    }

    function addResult(resultsList, result) {
      var doc = docs[result.ref];

      var resultsListItem = document.createElement('li');
      resultsListItem.classList.add('search-results-list-item');
      var itemId = 'search-result-' + (searchResultCounter++);
      resultsListItem.id = itemId;
      resultsListItem.setAttribute('role', 'option');
      resultsList.appendChild(resultsListItem);

      var resultLink = document.createElement('a');
      resultLink.classList.add('search-result');
      resultLink.setAttribute('href', doc.url);
      resultsListItem.appendChild(resultLink);

      var resultTitle = document.createElement('div');
      resultTitle.classList.add('search-result-title');
      resultLink.appendChild(resultTitle);

      // note: the SVG svg-doc is only loaded as a Jekyll include if site.search_enabled is true; see _includes/icons/icons.html
      var resultDoc = document.createElement('div');
      resultDoc.classList.add('search-result-doc');
      resultDoc.innerHTML = '<svg viewBox="0 0 24 24" class="search-result-icon"><use xlink:href="#svg-doc"></use></svg>';
      resultTitle.appendChild(resultDoc);

      var resultDocTitle = document.createElement('div');
      resultDocTitle.classList.add('search-result-doc-title');
      resultDocTitle.innerHTML = doc.doc;
      resultDoc.appendChild(resultDocTitle);
      var resultDocOrSection = resultDocTitle;

      if (doc.doc != doc.title) {
        resultDoc.classList.add('search-result-doc-parent');
        var resultSection = document.createElement('div');
        resultSection.classList.add('search-result-section');
        resultSection.innerHTML = doc.title;
        resultTitle.appendChild(resultSection);
        resultDocOrSection = resultSection;
      }

      var metadata = result.matchData.metadata;
      var titlePositions = [];
      var contentPositions = [];
      for (var j in metadata) {
        var meta = metadata[j];
        if (meta.title) {
          var positions = meta.title.position;
          for (var k in positions) {
            titlePositions.push(positions[k]);
          }
        }
        if (meta.content) {
          var positions = meta.content.position;
          for (var k in positions) {
            var position = positions[k];
            var previewStart = position[0];
            var previewEnd = position[0] + position[1];
            var ellipsesBefore = true;
            var ellipsesAfter = true;
            for (var k = 0; k < 5; k++) {
              var nextSpace = doc.content.lastIndexOf(' ', previewStart - 2);
              var nextDot = doc.content.lastIndexOf('. ', previewStart - 2);
              if ((nextDot >= 0) && (nextDot > nextSpace)) {
                previewStart = nextDot + 1;
                ellipsesBefore = false;
                break;
              }
              if (nextSpace < 0) {
                previewStart = 0;
                ellipsesBefore = false;
                break;
              }
              previewStart = nextSpace + 1;
            }
            for (var k = 0; k < 10; k++) {
              var nextSpace = doc.content.indexOf(' ', previewEnd + 1);
              var nextDot = doc.content.indexOf('. ', previewEnd + 1);
              if ((nextDot >= 0) && (nextDot < nextSpace)) {
                previewEnd = nextDot;
                ellipsesAfter = false;
                break;
              }
              if (nextSpace < 0) {
                previewEnd = doc.content.length;
                ellipsesAfter = false;
                break;
              }
              previewEnd = nextSpace;
            }
            contentPositions.push({
              highlight: position,
              previewStart: previewStart, previewEnd: previewEnd,
              ellipsesBefore: ellipsesBefore, ellipsesAfter: ellipsesAfter
            });
          }
        }
      }

      if (titlePositions.length > 0) {
        titlePositions.sort(function(p1, p2){ return p1[0] - p2[0] });
        resultDocOrSection.innerHTML = '';
        addHighlightedText(resultDocOrSection, doc.title, 0, doc.title.length, titlePositions);
      }

      if (contentPositions.length > 0) {
        contentPositions.sort(function(p1, p2){ return p1.highlight[0] - p2.highlight[0] });
        var contentPosition = contentPositions[0];
        var previewPosition = {
          highlight: [contentPosition.highlight],
          previewStart: contentPosition.previewStart, previewEnd: contentPosition.previewEnd,
          ellipsesBefore: contentPosition.ellipsesBefore, ellipsesAfter: contentPosition.ellipsesAfter
        };
        var previewPositions = [previewPosition];
        for (var j = 1; j < contentPositions.length; j++) {
          contentPosition = contentPositions[j];
          if (previewPosition.previewEnd < contentPosition.previewStart) {
            previewPosition = {
              highlight: [contentPosition.highlight],
              previewStart: contentPosition.previewStart, previewEnd: contentPosition.previewEnd,
              ellipsesBefore: contentPosition.ellipsesBefore, ellipsesAfter: contentPosition.ellipsesAfter
            }
            previewPositions.push(previewPosition);
          } else {
            previewPosition.highlight.push(contentPosition.highlight);
            previewPosition.previewEnd = contentPosition.previewEnd;
            previewPosition.ellipsesAfter = contentPosition.ellipsesAfter;
          }
        }

        var resultPreviews = document.createElement('div');
        resultPreviews.classList.add('search-result-previews');
        resultLink.appendChild(resultPreviews);

        var content = doc.content;
        for (var j = 0; j < Math.min(previewPositions.length, 3); j++) {
          var position = previewPositions[j];

          var resultPreview = document.createElement('div');
          resultPreview.classList.add('search-result-preview');
          resultPreviews.appendChild(resultPreview);

          if (position.ellipsesBefore) {
            resultPreview.appendChild(document.createTextNode('... '));
          }
          addHighlightedText(resultPreview, content, position.previewStart, position.previewEnd, position.highlight);
          if (position.ellipsesAfter) {
            resultPreview.appendChild(document.createTextNode(' ...'));
          }
        }
      }
      var resultRelUrl = document.createElement('span');
      resultRelUrl.classList.add('search-result-rel-url');
      resultRelUrl.innerText = doc.relUrl;
      resultTitle.appendChild(resultRelUrl);
    }

    function addHighlightedText(parent, text, start, end, positions) {
      var index = start;
      for (var i in positions) {
        var position = positions[i];
        var span = document.createElement('span');
        span.innerHTML = text.substring(index, position[0]);
        parent.appendChild(span);
        index = position[0] + position[1];
        var highlight = document.createElement('span');
        highlight.classList.add('search-result-highlight');
        highlight.innerHTML = text.substring(position[0], index);
        parent.appendChild(highlight);
      }
      var span = document.createElement('span');
      span.innerHTML = text.substring(index, end);
      parent.appendChild(span);
    }
  }

  jtd.addEvent(searchInput, 'focus', function(){
    setTimeout(update, 0);
  });

  jtd.addEvent(searchInput, 'keyup', function(e){
    switch (e.keyCode) {
      case 27: // When esc key is pressed, hide the results and clear the field
        searchInput.value = '';
        break;
      case 38: // arrow up
      case 40: // arrow down
      case 13: // enter
        e.preventDefault();
        return;
    }
    update();
  });

  jtd.addEvent(searchInput, 'keydown', function(e){
    switch (e.keyCode) {
      case 38: // arrow up
        e.preventDefault();
        var active = document.querySelector('.search-result.active');
        if (active) {
          active.classList.remove('active');
          if (active.parentElement.previousSibling) {
            var previous = active.parentElement.previousSibling.querySelector('.search-result');
            previous.classList.add('active');
            searchInput.setAttribute('aria-activedescendant', active.parentElement.previousSibling.id);
          } else {
            searchInput.removeAttribute('aria-activedescendant');
          }
        }
        return;
      case 40: // arrow down
        e.preventDefault();
        var active = document.querySelector('.search-result.active');
        if (active) {
          if (active.parentElement.nextSibling) {
            var next = active.parentElement.nextSibling.querySelector('.search-result');
            active.classList.remove('active');
            next.classList.add('active');
            searchInput.setAttribute('aria-activedescendant', active.parentElement.nextSibling.id);
          }
        } else {
          var next = document.querySelector('.search-result');
          if (next) {
            next.classList.add('active');
            searchInput.setAttribute('aria-activedescendant', next.parentElement.id);
          }
        }
        return;
      case 13: // enter
        e.preventDefault();
        var active = document.querySelector('.search-result.active');
        if (active) {
          active.click();
        } else {
          var first = document.querySelector('.search-result');
          if (first) {
            first.click();
          }
        }
        return;
    }
  });

  jtd.addEvent(document, 'click', function(e){
    if (e.target != searchInput) {
      hideSearch();
    }
  });
}

// Switch theme

jtd.getTheme = function() {
  var cssFileHref = document.querySelector('[rel="stylesheet"]').getAttribute('href');
  return cssFileHref.substring(cssFileHref.lastIndexOf('-') + 1, cssFileHref.length - 4);
}

jtd.setTheme = function(theme) {
  var cssFile = document.querySelector('[rel="stylesheet"]');
  cssFile.setAttribute('href', '/assets/css/just-the-docs-' + theme + '.css');
}

// Note: pathname can have a trailing slash on a local jekyll server
// and not have the slash on GitHub Pages

function navLink() {
  var pathname = document.location.pathname;

  var navLink = document.getElementById('site-nav').querySelector('a[href="' + pathname + '"]');
  if (navLink) {
    return navLink;
  }

  // The `permalink` setting may produce navigation links whose `href` ends with `/` or `.html`.
  // To find these links when `/` is omitted from or added to pathname, or `.html` is omitted:

  if (pathname.endsWith('/') && pathname != '/') {
    pathname = pathname.slice(0, -1);
  }

  if (pathname != '/') {
    navLink = document.getElementById('site-nav').querySelector('a[href="' + pathname + '"], a[href="' + pathname + '/"], a[href="' + pathname + '.html"]');
    if (navLink) {
      return navLink;
    }
  }

  return null; // avoids `undefined`
}

// Scroll site-nav to ensure the link to the current page is visible

function scrollNav() {
  const targetLink = navLink();
  if (targetLink) {
    targetLink.scrollIntoView({ block: "center" });
    targetLink.removeAttribute('href');
  }
}

// Find the nav-list-link that refers to the current page
// then make it and all enclosing nav-list-item elements active.

function activateNav() {
  var target = navLink();
  if (target) {
    target.classList.toggle('active', true);
  }
  while (target) {
    while (target && !(target.classList && target.classList.contains('nav-list-item'))) {
      target = target.parentNode;
    }
    if (target) {
      target.classList.toggle('active', true);
      var expander = target.querySelector(':scope > .nav-list-expander');
      if (expander) {
        expander.setAttribute('aria-expanded', 'true');
      }
      target = target.parentNode;
    }
  }
}

// Document ready

jtd.onReady(function(){
  if (document.getElementById('site-nav')) {
    initNav();
    activateNav();
    scrollNav();
  }
  initSearch();
});

// Copy button on code (Phase 11 B5: button HTML is pre-rendered by
// builder/highlight.mjs at build time; this hook only binds the click
// handler. The upstream `processCodeBlocks` runtime DOM-injection
// path is gone -- the button is in the DOM before this fires.)

jtd.onReady(function(){

  if (!window.isSecureContext) {
    console.log('Window does not have a secure context, therefore code clipboard copy functionality will not be available. For more details see https://web.dev/async-clipboard/#security-and-permissions');
    return;
  }

  var svgCopied = '<svg viewBox="0 0 24 24" class="copy-icon"><use xlink:href="#svg-copied"></use></svg>';
  var svgCopy   = '<svg viewBox="0 0 24 24" class="copy-icon"><use xlink:href="#svg-copy"></use></svg>';

  document.querySelectorAll('button.copy-code').forEach(function (copyButton) {
    var codeBlock = copyButton.closest('div.highlighter-rouge, div.listingblock > div.content, figure.highlight');
    if (!codeBlock) return;
    var timeout = null;

    copyButton.addEventListener('click', function () {
      if (timeout !== null) return;
      var code = (codeBlock.querySelector('pre:not(.lineno, .highlight)') || codeBlock.querySelector('code')).innerText;
      window.navigator.clipboard.writeText(code);

      copyButton.innerHTML = svgCopied;
      var status = document.getElementById('a11y-status');
      if (status) status.textContent = 'Copied to clipboard';

      timeout = setTimeout(function () {
        copyButton.innerHTML = svgCopy;
        timeout = null;
      }, 4000);
    });
  });

});

})(window.jtd = window.jtd || {});


