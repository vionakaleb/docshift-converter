export const defaultScript = `// Define a function that takes pptxgen and returns the presentation
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Viona Kaleb";
pres.title = "Presentation Title";

...

const outputPath = "/home/claude/presentation-deck.pptx";
pres.writeFile({ fileName: outputPath })
  .then(() => console.log("PPTX created: " + outputPath))
  .catch(err => console.error("Error:", err));
`;
