"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const HOME = process.cwd();
const getFile = (path) => {
    try {
        return JSON.parse(fs_1.default.readFileSync(path).toString());
    }
    catch (_) {
        return;
    }
};
const linkify = (arr) => {
    let str = '';
    for (const child of arr) {
        if (child.type === 0) {
            str += `<a href="${child.link}" >${child.label}</a>`;
        }
        else {
            str += linkify(child.children);
        }
    }
    return str;
};
class DocsSSR {
    constructor(options) {
        this.options = options;
        this.template = '';
        this.generateTemplate();
    }
    generateTemplate() {
        var _a, _b, _c, _d, _e, _f, _g;
        this.template = fs_1.default
            .readFileSync(this.options.template)
            .toString()
            .replace('$CONFIG', JSON.stringify(Object.assign(Object.assign({}, this.options.config), { sitemap: this.options.sitemap })))
            .replace('$SSR', `
    <main>
      <header>
        <div class="menu">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" id="menu-button">
             <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"></path>
          </svg>
          <img src="${(_b = (_a = this.options.config) === null || _a === void 0 ? void 0 : _a.header) === null || _b === void 0 ? void 0 : _b.icon}">
          <h1>${(_d = (_c = this.options.config) === null || _c === void 0 ? void 0 : _c.header) === null || _d === void 0 ? void 0 : _d.title}</h1>
        </div>
        <div class="links">${((_g = (_f = (_e = this.options.config) === null || _e === void 0 ? void 0 : _e.header) === null || _f === void 0 ? void 0 : _f.links) !== null && _g !== void 0 ? _g : []).map((i) => `<a href="${i.link}" target="_blank">${i.label}</a>`)}</div>
      </header>
      <div class="body">
          <nav>
             ${linkify(this.options.sitemap)}
          </nav>
          <div id="content" class="content">
             <div id="article" class="article">$__CONTENT__$</div>
          </div>
          <aside></aside>
       </div>
    </main>`);
    }
    generate(path) {
        const data = path ? getFile(`${HOME}/.static/docs/${path.endsWith('/') ? path.slice(0, -1) : path}.json`) : null;
        if (data) {
            return this.template.replace('$__CONTENT__$', data.content);
        }
        return this.template.replace('$__CONTENT__$', '');
    }
}
exports.default = DocsSSR;
//# sourceMappingURL=index.js.map