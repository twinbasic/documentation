const s = require('./symbols.json');
console.log(Object.keys(s), s.symbols.length);
console.log(JSON.stringify(s.symbols.slice(0,10), null, 2));
const kinds = {};
for (const sym of s.symbols) kinds[sym.kind] = (kinds[sym.kind]||0)+1;
console.log(kinds);
