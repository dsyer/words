(function (global, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    global.WordsWidget = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildWidgetMarkup(message) {
    var safeMessage = message == null ? "Hello from Words Widget" : message;

    return (
      '<div class="words-widget" role="status" aria-live="polite">' +
      "<strong>Words Widget:</strong> " +
      escapeHtml(safeMessage) +
      "</div>"
    );
  }

  function mountWidget(target, message) {
    if (!target || typeof target.innerHTML !== "string") {
      throw new TypeError("target must be a DOM element with an innerHTML property");
    }

    target.innerHTML = buildWidgetMarkup(message);
    return target;
  }

  return {
    buildWidgetMarkup: buildWidgetMarkup,
    mountWidget: mountWidget
  };
});
