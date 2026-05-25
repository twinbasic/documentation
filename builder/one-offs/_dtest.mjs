import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({typographer:true});
console.log(JSON.stringify(md.render("test ...&#46;]")));
console.log(JSON.stringify(md.render("test ...&#46;&#46;]")));
