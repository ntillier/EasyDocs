"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToSlug = exports.parseContent = void 0;
const highlight_js_1 = __importDefault(require("highlight.js"));
const marked_1 = require("marked");
const marked_admonition_extension_1 = __importDefault(require("marked-admonition-extension"));
const marked_extended_tables_1 = __importDefault(require("marked-extended-tables"));
const marked_highlight_1 = require("marked-highlight");
const marked_katex_extension_1 = __importDefault(require("marked-katex-extension"));
const marked_linkify_it_1 = __importDefault(require("marked-linkify-it"));
const marked_mangle_1 = require("marked-mangle");
marked_1.marked.use(marked_admonition_extension_1.default);
marked_1.marked.use((0, marked_extended_tables_1.default)());
marked_1.marked.use((0, marked_mangle_1.mangle)());
marked_1.marked.use((0, marked_linkify_it_1.default)({}, {}));
marked_1.marked.use((0, marked_katex_extension_1.default)({
    throwOnError: false
}));
marked_1.marked.use((0, marked_highlight_1.markedHighlight)({
    highlight: function (code, lang) {
        return highlight_js_1.default.highlight(code, { language: highlight_js_1.default.getLanguage(lang) ? lang : 'plaintext' }).value;
    }
}));
const renderer = new marked_1.marked.Renderer();
renderer.link = (href, title, text) => {
    return `<a target="_blank" href="${href}" title="${title}">${text}</a>`;
};
renderer.code = (code) => {
    return `<pre><code class="hljs">${code.replace(/\\(.)/g, '$1')}</code></pre>`;
};
renderer.heading = (text, level, raw) => {
    return `<h${level} id="${(0, exports.stringToSlug)(text)}">${text}</h${level}>`;
};
marked_1.marked.setOptions({ renderer });
const parseContent = (content) => marked_1.marked.parse(content);
exports.parseContent = parseContent;
const stringToSlug = (str) => {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]|^[^a-zA-Z0-9éèàç]+|[^a-zA-Z0-9éèàç]+$/g, '')
        .replace(/[^a-zA-Z0-9éèàç]+/g, '-');
};
exports.stringToSlug = stringToSlug;
//# sourceMappingURL=markdown.js.map