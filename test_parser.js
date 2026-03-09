
const fs = require('fs');
const content = fs.readFileSync('docs/591_01', 'utf8');

const match = content.match(/window\.__NUXT__\s*=\s*\(function\(([^)]+)\)\{return ([\s\S]+?)\}\(([\s\S]+?)\)\)/);

if (match) {
  const params = match[1].split(',').map(p => p.trim());
  // Use a smarter split for arguments that handles quoted commas
  const argsStr = match[3];
  // This is a rough split, but good enough for inspection
  const args = eval(`[${argsStr}]`); 
  
  const mapping = {};
  params.forEach((p, i) => {
    mapping[p] = args[i];
  });

  const template = match[2];
  console.log('Total Params:', params.length);
  console.log('Sample Mapping (first 20):', JSON.stringify(Object.fromEntries(Object.entries(mapping).slice(0, 20)), null, 2));
  
  // Try to find specific house data keys
  // Based on my previous grep, "z" was title, "cq" was price
  console.log('Title (z):', mapping['z']);
  console.log('Price (cq):', mapping['cq']);
  console.log('Address (cJ):', mapping['cJ']);
} else {
  console.log('No match found');
}
