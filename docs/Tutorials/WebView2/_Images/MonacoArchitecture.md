<!--
Source for Images/MonacoArchitecture.svg. Nothing in the build renders
this -- the SVG beside it is a committed artifact. Re-export with
`node scripts/render_mermaid.mjs`; see the CEF twin's source for why the
light theme and the font-loading order both matter.
-->

```mermaid
flowchart LR
    subgraph form["twinBASIC form"]
        direction LR
        WebView["<b>WebView</b><br/><i>Monaco editor</i>"]
        handler["JsMessage handler<br/><i>(twinBASIC code)</i>"]
        WebViewPreview["<b>WebViewPreview</b><br/><i>HTML preview</i>"]
        WebView -- "postMessage(html)" --> handler
        handler -- "NavigateToString(html)" --> WebViewPreview
    end
```
