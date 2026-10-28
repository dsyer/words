const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildWidgetMarkup,
  mountWidget,
  bindForm,
  setWordList,
  setWordListUrl,
  getWordListStatus
} = require("../src/widget.js");

const DEFAULT_WORDS = [
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

test("buildWidgetMarkup does not search when expression is empty", () => {
  const html = buildWidgetMarkup();
  assert.match(html, /Pattern: \(enter a regex\)/);
  assert.match(html, /Enter a regex pattern to search\./);
  assert.doesNotMatch(html, /20 matches/);
  assert.doesNotMatch(html, /apple/);
});

test("buildWidgetMarkup matches a whole word by default", () => {
  const html = buildWidgetMarkup("plum");
  assert.ok(html.includes("Pattern: /^plum$/i"));
  assert.match(html, /1 matches/);
  assert.match(html, /<li class="words-widget-item">plum<\/li>/);
  assert.doesNotMatch(html, /papaya/);
});

test("buildWidgetMarkup keeps explicit start anchor from user", () => {
  const html = buildWidgetMarkup("^p");
  assert.ok(html.includes("Pattern: /^p/i"));
  assert.match(html, /3 matches/);
  assert.match(html, /papaya/);
  assert.match(html, /pear/);
  assert.match(html, /plum/);
  assert.doesNotMatch(html, /banana/);
});

test("buildWidgetMarkup keeps explicit end anchor from user", () => {
  const html = buildWidgetMarkup("m$");
  assert.ok(html.includes("Pattern: /m$/i"));
  assert.match(html, /1 matches/);
  assert.match(html, /<li class="words-widget-item">plum<\/li>/);
});

test("buildWidgetMarkup supports slash-delimited regex with flags", () => {
  const html = buildWidgetMarkup("/berry$/i");
  assert.match(html, /3 matches/);
  assert.match(html, /elderberry/);
  assert.match(html, /raspberry/);
  assert.match(html, /strawberry/);
});

test("buildWidgetMarkup reports invalid regex", () => {
  const html = buildWidgetMarkup("(");
  assert.match(html, /Invalid regular expression/);
});

test("mountWidget writes markup to target", () => {
  const fakeElement = { innerHTML: "" };
  mountWidget(fakeElement, "plum");
  assert.match(fakeElement.innerHTML, /1 matches/);
  assert.match(fakeElement.innerHTML, /<li class="words-widget-item">plum<\/li>/);
});

test("mountWidget throws when target is invalid", () => {
  assert.throws(() => mountWidget(null, "x"), TypeError);
});

test("bindForm renders initial value and updates on submit", () => {
  const target = { innerHTML: "" };
  const input = { value: "^p" };
  let submitHandler;
  let keydownHandler;
  let requestSubmitCount = 0;
  const form = {
    addEventListener(eventName, handler) {
      if (eventName === "submit") {
        submitHandler = handler;
      }
    },
    requestSubmit() {
      requestSubmitCount += 1;
      submitHandler({
        preventDefault() {}
      });
    }
  };

  input.addEventListener = function (eventName, handler) {
    if (eventName === "keydown") {
      keydownHandler = handler;
    }
  };

  const handlers = bindForm(form, input, target);
  assert.equal(typeof handlers.onSubmit, "function");
  assert.equal(typeof handlers.onKeyDown, "function");
  assert.equal(handlers.onSubmit, submitHandler);
  assert.equal(handlers.onKeyDown, keydownHandler);
  assert.match(target.innerHTML, /papaya/);
  assert.match(target.innerHTML, /pear/);

  let prevented = false;
  input.value = "^w";
  submitHandler({
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(prevented, true);
  assert.match(target.innerHTML, /watermelon/);

  let enterPrevented = false;
  input.value = "berry$";
  keydownHandler({
    key: "Enter",
    preventDefault() {
      enterPrevented = true;
    }
  });

  assert.equal(enterPrevented, true);
  assert.equal(requestSubmitCount, 1);
  assert.match(target.innerHTML, /elderberry/);
  assert.match(target.innerHTML, /raspberry/);
  assert.match(target.innerHTML, /strawberry/);
});

test("bindForm throws when form is invalid", () => {
  const target = { innerHTML: "" };
  const input = { value: "hello" };
  assert.throws(() => bindForm(null, input, target), TypeError);
});

test("bindForm throws when input is invalid", () => {
  const target = { innerHTML: "" };
  const form = { addEventListener() {} };
  assert.throws(() => bindForm(form, null, target), TypeError);
});

test("setWordList updates search source and returns a copy", () => {
  const customWords = ["alpha", "beta", "gamma"];
  const result = setWordList(customWords);
  const status = getWordListStatus();

  assert.deepEqual(result, customWords);
  assert.notEqual(result, customWords);
  assert.equal(status.source, "custom");
  assert.equal(status.fallback, false);
  assert.equal(status.wordCount, 3);

  const html = buildWidgetMarkup("a$");
  assert.match(html, /3 matches/);
  assert.match(html, /alpha/);
  assert.match(html, /beta/);
  assert.match(html, /gamma/);
  assert.doesNotMatch(html, /watermelon/);

  setWordList(DEFAULT_WORDS);
});

test("setWordList throws for invalid values", () => {
  assert.throws(() => setWordList("not-an-array"), TypeError);
  assert.throws(() => setWordList(["ok", 42]), TypeError);
});

test("setWordListUrl loads newline-delimited words from URL", async () => {
  const originalFetch = global.fetch;
  let fetchUrl;
  let fetchOptions;

  global.fetch = async function (url, options) {
    fetchUrl = url;
    fetchOptions = options;
    return {
      ok: true,
      async text() {
        return "cobra\ncoral\ncomet\n";
      }
    };
  };

  try {
    const loadedWords = await setWordListUrl("/some/url");
    const status = getWordListStatus();

    assert.deepEqual(loadedWords, ["cobra", "coral", "comet"]);
    assert.equal(fetchUrl, "/some/url");
    assert.deepEqual(fetchOptions, { cache: "no-store" });
    assert.equal(status.source, "url");
    assert.equal(status.fallback, false);
    assert.equal(status.error, null);
    assert.equal(status.wordCount, 3);

    const html = buildWidgetMarkup("^co");
    assert.match(html, /3 matches/);
    assert.match(html, /cobra/);
    assert.match(html, /coral/);
    assert.match(html, /comet/);
    assert.doesNotMatch(html, /banana/);
  } finally {
    global.fetch = originalFetch;
    setWordList(DEFAULT_WORDS);
  }
});

test("setWordListUrl falls back to defaults when URL is missing or fetch fails", async () => {
  const originalFetch = global.fetch;

  setWordList(["alpha"]);
  await setWordListUrl();
  let status = getWordListStatus();
  assert.equal(status.source, "default");
  assert.equal(status.fallback, true);
  assert.equal(status.error, "missing-url");
  assert.equal(status.wordCount, DEFAULT_WORDS.length);

  let html = buildWidgetMarkup("^a");
  assert.match(html, /1 matches/);
  assert.match(html, /apple/);
  assert.doesNotMatch(html, /alpha/);

  global.fetch = async function () {
    throw new Error("network failed");
  };

  setWordList(["beta"]);
  await setWordListUrl("/broken/url");
  status = getWordListStatus();
  assert.equal(status.source, "default");
  assert.equal(status.fallback, true);
  assert.equal(status.error, "network-error");
  assert.equal(status.url, "/broken/url");
  assert.equal(status.wordCount, DEFAULT_WORDS.length);

  html = buildWidgetMarkup("^b");
  assert.match(html, /1 matches/);
  assert.match(html, /banana/);
  assert.doesNotMatch(html, /beta/);

  global.fetch = originalFetch;
  setWordList(DEFAULT_WORDS);
});
