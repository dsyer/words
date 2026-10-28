const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildWidgetMarkup,
  mountWidget,
  bindForm,
  setWordList,
  setWordListUrl
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

test("buildWidgetMarkup defaults to full list when expression is empty", () => {
  const html = buildWidgetMarkup();
  assert.match(html, /Pattern: \(all words\)/);
  assert.match(html, /20 matches/);
  assert.match(html, /apple/);
  assert.match(html, /watermelon/);
});

test("buildWidgetMarkup matches words with plain expression", () => {
  const html = buildWidgetMarkup("^p");
  assert.match(html, /3 matches/);
  assert.match(html, /papaya/);
  assert.match(html, /pear/);
  assert.match(html, /plum/);
  assert.doesNotMatch(html, /banana/);
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
  mountWidget(fakeElement, "an");
  assert.match(fakeElement.innerHTML, /banana/);
  assert.match(fakeElement.innerHTML, /orange/);
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

  assert.deepEqual(result, customWords);
  assert.notEqual(result, customWords);

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

  global.fetch = async function () {
    return {
      ok: true,
      async text() {
        return "cobra\ncoral\ncomet\n";
      }
    };
  };

  try {
    const loadedWords = await setWordListUrl("/some/url");
    assert.deepEqual(loadedWords, ["cobra", "coral", "comet"]);

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
  let html = buildWidgetMarkup("^a");
  assert.match(html, /1 matches/);
  assert.match(html, /apple/);
  assert.doesNotMatch(html, /alpha/);

  global.fetch = async function () {
    throw new Error("network failed");
  };

  setWordList(["beta"]);
  await setWordListUrl("/broken/url");
  html = buildWidgetMarkup("^b");
  assert.match(html, /1 matches/);
  assert.match(html, /banana/);
  assert.doesNotMatch(html, /beta/);

  global.fetch = originalFetch;
  setWordList(DEFAULT_WORDS);
});
