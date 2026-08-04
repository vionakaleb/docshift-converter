export const defaultScript = String.raw`// Define a function that takes pptxgen and returns the presentation
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Viona Kaleb";
pres.title = "Software Engineer";

// Color palette - Ocean/Maritime theme
const PRIMARY = "0C3547";     // deep navy
const SECONDARY = "1A6B8A";   // ocean teal
const ACCENT = "F0A830";      // warm amber
const LIGHT = "F7F9FB";       // near-white
const WHITE = "FFFFFF";
const DARK_TEXT = "1A1A2E";
const MUTED = "6B7B8D";
const CARD_BG = "E8F0F5";

// Fonts
const TITLE_FONT = "Cambria";
const BODY_FONT = "Calibri";

// ============================================================
// SLIDE 1: Title / Cover
// ============================================================
const slide1 = pres.addSlide();
slide1.background = { color: PRIMARY };

// Decorative circle (top-right)
slide1.addShape(pres.shapes.OVAL, {
  x: 7.8, y: -1.2, w: 3.5, h: 3.5,
  fill: { color: SECONDARY, transparency: 60 },
  line: { color: SECONDARY, width: 0, transparency: 100 }
});

// Decorative circle (bottom-left)
slide1.addShape(pres.shapes.OVAL, {
  x: -1.0, y: 3.5, w: 3.0, h: 3.0,
  fill: { color: SECONDARY, transparency: 70 },
  line: { color: SECONDARY, width: 0, transparency: 100 }
});

slide1.addText("SESSION", {
  x: 0.8, y: 1.0, w: 8.4, h: 0.6,
  fontSize: 14, fontFace: BODY_FONT, color: ACCENT,
  bold: true, charSpacing: 6, align: "left"
});

slide1.addText("Code Strategy", {
  x: 0.8, y: 1.6, w: 8.0, h: 2.2,
  fontSize: 36, fontFace: TITLE_FONT, color: WHITE,
  bold: true, align: "left", lineSpacingMultiple: 1.1
});

slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.95, w: 2.0, h: 0.04,
  fill: { color: ACCENT }
});

slide1.addText("Software Engineer", {
  x: 0.8, y: 4.2, w: 6.0, h: 0.8,
  fontSize: 14, fontFace: BODY_FONT, color: "B0C4D4",
  align: "left", lineSpacingMultiple: 1.4
});

slide1.addText("Viona Kaleb •  August 2026", {
  x: 0.8, y: 5.0, w: 8.0, h: 0.4,
  fontSize: 11, fontFace: BODY_FONT, color: MUTED,
  align: "left"
});

// Speaker notes for all slides
slide1.addNotes("Slide pembuka. Sapa Danny, perkenalkan diri, buat suasana santai.");

const outputPath = "/home/claude/mentoring-danny-fardian.pptx";
pres.writeFile({ fileName: outputPath })
  .then(() => console.log("PPTX created: " + outputPath))
  .catch(err => console.error("Error:", err));
`;
