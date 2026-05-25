const src = `text in paths specified. <!-- comment -->

next line`;
// Test that joining works
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({html:true});
console.log("=== HTML ===");
console.log(md.render(src));
