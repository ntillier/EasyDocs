import hljs from "highlight.js";
import { marked } from "marked";

import markedAdmonition from 'marked-admonition-extension';
import extendedTables from "marked-extended-tables";
import { markedHighlight } from "marked-highlight";
import markedKatex from "marked-katex-extension";
import markedLinkifyIt from 'marked-linkify-it';
import { mangle } from "marked-mangle";

marked.use(markedAdmonition);
marked.use(extendedTables());
marked.use(mangle());
marked.use(markedLinkifyIt({}, {}));
marked.use(markedKatex({
  throwOnError: false
}));
marked.use(markedHighlight({
  highlight: function (code, lang) {
    return hljs.highlight(code, { language: hljs.getLanguage(lang) ? lang : 'plaintext' }).value;
  }
}));

const renderer = new marked.Renderer();

renderer.link = (href, title, text) => {
  return `<a target="_blank" href="${href}" title="${title}">${text}</a>`;
}

renderer.code = (code) => {
  return `<pre><code class="hljs">${code.replace(/\\(.)/g, '$1')}</code></pre>`;
}

renderer.heading = (text, level, raw) => {
  return `<h${level} id="${stringToSlug(text)}">${text}</h${level}>`;
}

marked.setOptions({ renderer });

export const parseContent = (content: string): string => marked.parse(content);
export const stringToSlug = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]|^[^a-zA-Z0-9éèàç]+|[^a-zA-Z0-9éèàç]+$/g, '')
    .replace(/[^a-zA-Z0-9éèàç]+/g, '-');
}