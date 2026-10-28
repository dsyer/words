const test = require("node:test");
const assert = require("node:assert/strict");

const { buildWidgetMarkup, mountWidget, bindForm } = require("../src/widget.js");

test("buildWidgetMarkup uses default text", () => {
  const html = buildWidgetMarkup();
  assert.match(html, /Hello from Words Widget/);
});

test("buildWidgetMarkup escapes unsafe HTML", () => {
  const html = buildWidgetMarkup('<script>alert("x")</script>');
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
});

test("mountWidget writes markup to target", () => {
  const fakeElement = { innerHTML: "" };
  mountWidget(fakeElement, "Ready");
  assert.match(fakeElement.innerHTML, /Words Widget:/);
  assert.match(fakeElement.innerHTML, /Ready/);
});

test("mountWidget throws when target is invalid", () => {
  assert.throws(() => mountWidget(null, "x"), TypeError);
});

test("bindForm renders initial value and updates on submit", () => {
  const target = { innerHTML: "" };
  const input = { value: "First value" };
  let submitHandler;
  const form = {
    addEventListener(eventName, handler) {
      if (eventName === "submit") {
        submitHandler = handler;
      }
    }
  };

  const returnedHandler = bindForm(form, input, target);
  assert.equal(typeof returnedHandler, "function");
  assert.equal(returnedHandler, submitHandler);
  assert.match(target.innerHTML, /First value/);

  let prevented = false;
  input.value = "Second value";
  submitHandler({
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(prevented, true);
  assert.match(target.innerHTML, /Second value/);
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
