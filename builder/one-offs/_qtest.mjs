import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({html:true, typographer:true, quotes:'“”‘’'});
const toks = md.parse("*foo*'th", {});
for (const t of toks) {
  if (t.type === 'inline') {
    for (const c of t.children) {
      console.log(c.type, JSON.stringify(c.content));
    }
  }
}
