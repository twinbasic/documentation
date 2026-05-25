import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({html:true});
const src = `<iframe width="560" height="315" src="https://www.youtube.com/embed/vLmy1ZY-IT4"
    title="YouTube video player" frameborder="0"
    allow="accelerometer; autoplay; clipboard-write"
    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen>
</iframe>`;
console.log("===TOKENS===");
console.log(JSON.stringify(md.parse(src, {}), null, 2));
console.log("===HTML===");
console.log(md.render(src));
