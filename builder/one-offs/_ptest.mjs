import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({html:true, typographer:true, quotes:'“”‘’'});
const src = '**[InterfaceId( "**00000000-0000-0000-0000-000000000000**" )]**';
const toks = md.parse(src, {});
for (const t of toks) {
  if (t.type === 'inline') {
    for (const c of t.children) {
      console.log(c.type, JSON.stringify(c.content), 'markup=', JSON.stringify(c.markup), 'level=', c.level);
    }
  }
}
