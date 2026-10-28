(function (global, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    global.WordsWidget = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var WORD_LIST = [
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

    if (source === "") {
      return {
        expression: source,
        displayExpression: "(all words)",
        regex: null,
        error: null
      };
    }

    slashMatch = source.match(/^\/(.+)\/([a-z]*)$/i);

    try {
      if (slashMatch) {
        return {
          expression: source,
          displayExpression: source,
          regex: new RegExp(slashMatch[1], slashMatch[2]),
          error: null
        };
      }

      return {
        expression: source,
        displayExpression: "/" + source + "/i",
        regex: new RegExp(source, "i"),
        error: null
      };
    } catch (error) {
      return {
        expression: source,
        displayExpression: source,
        regex: null,
        error: error
      };
    }
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
    bindForm: bindForm
  };
});
