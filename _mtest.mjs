import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({html:true, typographer:true});

// Our renderer's html_block strip rule -- extend to cover markdown=span/block
md.core.ruler.push("strip-markdown-attr", (state) => {
  for (const t of state.tokens) {
    if (t.type !== "html_block") continue;
    t.content = t.content.replace(/\s+markdown=(?:["'][^"']*["']|[a-zA-Z0-9]+)/g, "");
  }
});

const src = `## Test

<details open>
<summary markdown=span id="x"><b>Q?</b></summary>

body paragraph

</details>
`;
console.log(md.render(src));
