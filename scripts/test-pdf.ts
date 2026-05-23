import fs from "fs";
const pdf = require("pdf-parse");

async function test() {
  console.log("Testing rent.pdf...");
  const rentBuffer = fs.readFileSync("./rent.pdf");
  const parser = new pdf.PDFParse({ data: rentBuffer });
  const rentData = await parser.getText();
  console.log("rent.pdf text length:", rentData.text.length);
  console.log("First 2000 characters of rent.pdf text:\n", rentData.text.substring(0, 2000));

  console.log("\n\nTesting rent2.pdf...");
  const rent2Buffer = fs.readFileSync("./rent2.pdf");
  const parser2 = new pdf.PDFParse({ data: rent2Buffer });
  const rent2Data = await parser2.getText();
  console.log("rent2.pdf text length:", rent2Data.text.length);
  console.log("First 2000 characters of rent2.pdf text:\n", rent2Data.text.substring(0, 2000));
}

test().catch(console.error);
