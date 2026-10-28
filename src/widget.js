(function (global, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    global.WordsWidget = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var DEFAULT_WORD_LIST = [
    "apple",
    "banana",
    "cherry",
    "date",
    "elderberry",
    "fig",
    "grape",
    "guava",
    "kiwi",
    "lemon",
    "mango",
    "nectarine",
    "orange",
    "papaya",
    "pear",
    "plum",
    "raspberry",
    "strawberry",
    "tangerine",
    "watermelon"
  ];
  var WORD_LIST = DEFAULT_WORD_LIST.slice();
  var WORD_LIST_STATUS = {
    source: "default",
    url: null,
    fallback: false,
    error: null
  };

  function setWordListStatus(source, url, fallback, error) {
    WORD_LIST_STATUS = {
      source: source,
      url: url || null,
      fallback: Boolean(fallback),
      error: error || null
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseSearchExpression(rawExpression) {
    var source = rawExpression == null ? "" : String(rawExpression).trim();
    var slashMatch;
    var hasStartAnchor;
    var hasEndAnchor;
    var effectiveSource;

    if (source === "") {
      return {
        expression: source,
        displayExpression: "(enter a regex)",
        isEmpty: true,
        regex: null,
        error: null
      };
    }

    slashMatch = source.match(/^\/(.+)\/([a-z]*)$/i);

    hasStartAnchor = source.charAt(0) === "^";
    hasEndAnchor = hasUnescapedTerminalDollar(source);
    effectiveSource = hasStartAnchor || hasEndAnchor ? source : "^" + source + "$";

    try {
      if (slashMatch) {
        return {
          expression: source,
          displayExpression: source,
          isEmpty: false,
          regex: new RegExp(slashMatch[1], slashMatch[2]),
          error: null
        };
      }

      return {
        expression: source,
        displayExpression: "/" + effectiveSource + "/i",
        isEmpty: false,
        regex: new RegExp(effectiveSource, "i"),
        error: null
      };
    } catch (error) {
      return {
        expression: source,
        displayExpression: source,
        isEmpty: false,
        regex: null,
        error: error
      };
    }
  }

  function hasUnescapedTerminalDollar(source) {
    var i;
    var backslashCount = 0;

    if (!source || source.charAt(source.length - 1) !== "$") {
      return false;
    }

    i = source.length - 2;

    while (i >= 0 && source.charAt(i) === "\\") {
      backslashCount += 1;
      i -= 1;
    }

    return backslashCount % 2 === 0;
  }

  function buildTestRegex(regex) {
    var flags = regex.flags.replace(/g/g, "").replace(/y/g, "");
    return new RegExp(regex.source, flags);
  }

  function searchWords(expression) {
    var parsed = parseSearchExpression(expression);
    var matches;

    if (parsed.error) {
      return {
        parsed: parsed,
        matches: []
      };
    }

    if (parsed.isEmpty) {
      return {
        parsed: parsed,
        matches: []
      };
    }

    if (!parsed.regex) {
      matches = WORD_LIST.slice();
    } else {
      matches = WORD_LIST.filter(function (word) {
        return buildTestRegex(parsed.regex).test(word);
      });
    }

    return {
      parsed: parsed,
      matches: matches
    };
  }

  function setWordList(words) {
    if (!Array.isArray(words)) {
      throw new TypeError("word list must be an array of strings");
    }

    if (
      !words.every(function (word) {
        return typeof word === "string";
      })
    ) {
      throw new TypeError("word list must be an array of strings");
    }

    WORD_LIST = words.slice();
    setWordListStatus("custom", null, false, null);
    return WORD_LIST.slice();
  }

  function resetWordList(error, url) {
    WORD_LIST = DEFAULT_WORD_LIST.slice();
    setWordListStatus("default", url, Boolean(error), error || null);
    return WORD_LIST.slice();
  }

  function parseWordListText(text) {
    return String(text)
      .split(/\r?\n/)
      .map(function (word) {
        return word.trim();
      })
      .filter(function (word) {
        return word.length > 0;
      });
  }

  async function setWordListUrl(wordListUrl) {
    if (!wordListUrl) {
      return resetWordList("missing-url", null);
    }

    if (typeof fetch !== "function") {
      return resetWordList("fetch-unavailable", wordListUrl);
    }

    try {
      var response = await fetch(wordListUrl, { cache: "no-store" });
      var words;

      if (!response || !response.ok) {
        return resetWordList("http-error", wordListUrl);
      }

      words = parseWordListText(await response.text());

      if (words.length === 0) {
        return resetWordList("empty-list", wordListUrl);
      }

      WORD_LIST = words.slice();
      setWordListStatus("url", wordListUrl, false, null);
      return WORD_LIST.slice();
    } catch (error) {
      return resetWordList("network-error", wordListUrl);
    }
  }

  function getWordListStatus() {
    return {
      source: WORD_LIST_STATUS.source,
      url: WORD_LIST_STATUS.url,
      fallback: WORD_LIST_STATUS.fallback,
      error: WORD_LIST_STATUS.error,
      wordCount: WORD_LIST.length
    };
  }

  function buildWidgetMarkup(expression) {
    var result = searchWords(expression);
    var header = '<div class="words-widget-header"><strong>Word Search</strong></div>';
    var meta =
      '<div class="words-widget-meta">Pattern: ' +
      escapeHtml(result.parsed.displayExpression) +
      "</div>";
    var count =
      '<div class="words-widget-count">' +
      result.matches.length +
      " matches</div>";
    var items;

    if (result.parsed.error) {
      return (
        '<div class="words-widget" role="status" aria-live="polite">' +
        header +
        meta +
        '<div class="words-widget-error">Invalid regular expression</div>' +
        "</div>"
      );
    }

    if (result.parsed.isEmpty) {
      return (
        '<div class="words-widget" role="status" aria-live="polite">' +
        header +
        meta +
        '<div class="words-widget-empty">Enter a regex pattern to search.</div>' +
        "</div>"
      );
    }

    items =
      result.matches.length === 0
        ? '<li class="words-widget-empty">No matches</li>'
        : result.matches
            .map(function (word) {
              return '<li class="words-widget-item">' + escapeHtml(word) + "</li>";
            })
            .join("");

    return (
      '<div class="words-widget" role="status" aria-live="polite">' +
      header +
      meta +
      count +
      '<div class="words-widget-results"><ul class="words-widget-list">' +
      items +
      "</ul></div>" +
      "</div>"
    );
  }

  function mountWidget(target, expression) {
    if (!target || typeof target.innerHTML !== "string") {
      throw new TypeError("target must be a DOM element with an innerHTML property");
    }

    target.innerHTML = buildWidgetMarkup(expression);
    return target;
  }

  function bindForm(form, input, target) {
    if (!form || typeof form.addEventListener !== "function") {
      throw new TypeError("form must be a DOM element with addEventListener");
    }

    if (!input || typeof input.value !== "string") {
      throw new TypeError("input must be a form field with a string value");
    }

    mountWidget(target, input.value);

    function onSubmit(event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      mountWidget(target, input.value);
    }

    function onKeyDown(event) {
      if (!event || event.key !== "Enter") {
        return;
      }

      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        onSubmit();
      }
    }

    form.addEventListener("submit", onSubmit);

    if (typeof input.addEventListener === "function") {
      input.addEventListener("keydown", onKeyDown);
    }

    return {
      onSubmit: onSubmit,
      onKeyDown: onKeyDown
    };
  }

  return {
    buildWidgetMarkup: buildWidgetMarkup,
    mountWidget: mountWidget,
    bindForm: bindForm,
    setWordList: setWordList,
    setWordListUrl: setWordListUrl,
    getWordListStatus: getWordListStatus
  };
});
