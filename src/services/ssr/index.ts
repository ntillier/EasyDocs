import DocsFiles, { FolderOrFile } from "../files";
import fs from 'fs';

type DocsSSROptions = {
  template: string;
  config: Record<string, any>;
  sitemap: FolderOrFile[];
}

const HOME = process.cwd();

const getFile = (path: string) => {
  try {
    return JSON.parse(fs.readFileSync(path).toString());
  } catch (_) {
    return;
  }
}

const linkify = (arr: FolderOrFile[]): string => {
  let str = '';

  for (const child of arr) {
    if (child.type === 0) {
      str += `<a href="${child.link}" >${child.label}</a>`
    } else {
      str += linkify(child.children);
    }
  }

  return str;
}

export default class DocsSSR {
  public options: DocsSSROptions;

  private template: string;

  constructor(options: DocsSSROptions) {
    this.options = options;

    this.template = '';
    this.generateTemplate();
  }

  generateTemplate () {
    this.template = fs
    .readFileSync(this.options.template)
    .toString()
    .replace('$CONFIG', JSON.stringify({ ...this.options.config, sitemap: this.options.sitemap }))
    .replace('$SSR', `
    <main>
      <header>
        <div class="menu">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" id="menu-button">
             <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"></path>
          </svg>
          <img src="${this.options.config?.header?.icon}">
          <h1>${this.options.config?.header?.title}</h1>
        </div>
        <div class="links">${ (this.options.config?.header?.links ?? []).map((i: any) => `<a href="${i.link}" target="_blank">${i.label}</a>`) }</div>
      </header>
      <div class="body">
          <nav>
             ${ linkify(this.options.sitemap) }
          </nav>
          <div id="content" class="content">
             <div id="article" class="article">$__CONTENT__$</div>
          </div>
          <aside></aside>
       </div>
    </main>`)
  }

  generate(path: string | undefined) {
    const data = path ? getFile(`${HOME}/.static/docs/${path.endsWith('/') ? path.slice(0, -1) : path}.json`): null;

    if (data) {
      return this.template.replace('$__CONTENT__$', data.content);
    }
    return this.template.replace('$__CONTENT__$', '');
  }
}
