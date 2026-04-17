const fs = require("fs");
let appCss = fs.readFileSync("src/App.css", "utf8");

// Remove older pixel style attempts if they exist
const pixelOverrideIdx = appCss.indexOf("/* ========================================\n   PIXEL ART UI OVERRIDES");
if (pixelOverrideIdx !== -1) {
  appCss = appCss.substring(0, pixelOverrideIdx);
}
// Remove old `@import ... zpix` if it exists at top
appCss = appCss.replace(/@import url.*zpix.*\\n/g, "");

const fontFaceStr = `
@font-face {
  font-family: "PressStart2P";
  src: url("/asset/字体/PressStart2P-Regular.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: "zpix";
  src: url("/asset/字体/zpix.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
}

`;

// Replace `body { font-family: ... }` rule
let bodyFixCss = appCss;
const bodyRegex = /body\s*\{\s*font-family:[^;]+;/g;
bodyFixCss = bodyFixCss.replace(bodyRegex, `body {\n  font-family: "PressStart2P", "zpix", sans-serif;`);

const overrides = `
/* --- Global Pixel Art Font Config --- */
body {
  font-family: "PressStart2P", "zpix", sans-serif;
  line-height: 1.4;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeSpeed;
}

button, input, textarea, select {
  font-family: "PressStart2P", "zpix", sans-serif;
}

* {
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}
`;

fs.writeFileSync("src/App.css", fontFaceStr + bodyFixCss + overrides, "utf8");
console.log("Updated App.css");

