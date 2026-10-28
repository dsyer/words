const fs = require("node:fs/promises");
const path = require("node:path");

async function buildSite() {
  const rootDir = path.resolve(__dirname, "..");
  const exampleHtmlPath = path.join(rootDir, "example", "index.html");
  const srcWidgetPath = path.join(rootDir, "src", "widget.js");
  const srcWordsPath = path.join(rootDir, "src", "words");

  const buildDir = path.join(rootDir, "build");
  const buildHtmlPath = path.join(buildDir, "index.html");
  const buildWidgetPath = path.join(buildDir, "widget.js");
  const buildWordsPath = path.join(buildDir, "words");

  const html = await fs.readFile(exampleHtmlPath, "utf8");
  const buildHtml = html
    .replaceAll("../src/widget.js", "./widget.js")
    .replaceAll("../src/words", "./words");

  await fs.mkdir(buildDir, { recursive: true });

  await Promise.all([
    fs.writeFile(buildHtmlPath, buildHtml, "utf8"),
    fs.copyFile(srcWidgetPath, buildWidgetPath),
    fs.copyFile(srcWordsPath, buildWordsPath)
  ]);

  console.log("Built mini site in ./build");
}

buildSite().catch((error) => {
  console.error("Failed to build mini site");
  console.error(error);
  process.exitCode = 1;
});
