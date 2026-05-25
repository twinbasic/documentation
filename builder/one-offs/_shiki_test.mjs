import { createHighlighter } from 'shiki';
const sh = await createHighlighter({ themes: [], langs: ['cpp', 'c'] });
const code = `HRESULT __stdcall foo( [out] LPWSTR unnamedParam1, [in] LPCWSTR unnamedParam2, ... );`;
const lines = sh.codeToTokensBase(code, { lang: 'cpp', includeExplanation: true });
for (const line of lines) {
  for (const t of line) {
    if (t.explanation && t.explanation.length > 0) {
      for (const ex of t.explanation) {
        const scopes = (ex.scopes || []).map(s => s.scopeName);
        console.log(JSON.stringify(ex.content), '->', scopes.slice(-2).join(' / '));
      }
    } else {
      console.log(JSON.stringify(t.content), '-> (no explanation)');
    }
  }
}
