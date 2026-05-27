import { readFileSync } from 'fs';
const f = readFileSync('D:/OCP/wc/twinBASIC-documentation/docs/_site/tB/Core/On-Error.html', 'utf8');
// Find all instances of "Exit Sub" 
const positions = [];
let i = 0;
while (true) {
  const p = f.indexOf('class="k">Exit Sub', i);
  if (p < 0) break;
  positions.push(p);
  i = p + 1;
}
console.log('class="k">Exit Sub occurrences:', positions.length);
// And split case
const p2 = f.indexOf('class="n">Exit</span> <span class="k">Sub');
console.log('Split case (n>Exit / k>Sub) at:', p2);
if (p2 >= 0) {
  console.log(JSON.stringify(f.slice(p2 - 100, p2 + 200)));
}
