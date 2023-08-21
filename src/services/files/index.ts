import fs from 'fs';
import { log } from '../logger';
import matter from 'gray-matter';
import chokidar from 'chokidar';
import { parseContent, stringToSlug } from './markdown';

type Index = number | 'no-index';

type DocsFilesConfig = {
  basePath: string;
};

export type Folder = {
  type: 1;
  link: string;
  label: string;
  index: Index;
  children: FolderOrFile[];
}

export type File = {
  type: 0;
  link: string;
  label: string;
  index: Index;
}

export type FolderOrFile = Folder | File;

type FolderConfig = {
  label?: string;
  slug?: string;
  index?: Index
};

const join = (p1: string, p2: string): string => (p1.endsWith('/') ? p1.slice(0, -1) : p1) + '/' + (p2.startsWith('/') ? p2.substring(1) : p2);

const getFolderConfig = (absolutePath: string): FolderConfig => {
  try {
    if (fs.existsSync(`${absolutePath}/config.json`)) {
      return JSON.parse(
        fs.readFileSync(`${absolutePath}/config.json`).toString()
      );
    }
  } catch (_) {
    log('error', `${absolutePath}/config.json is not valid JSON.`);
  }
  return {};
}

export default class DocsFiles {
  public config: DocsFilesConfig;
  public converter: Map<string, string>;
  public sitemap: FolderOrFile[];
  public watcher: chokidar.FSWatcher | undefined;

  constructor(config: DocsFilesConfig) {
    this.config = config;
    this.converter = new Map();
    this.sitemap = [];
  }

  clear() {
    fs.rmSync(`${process.cwd()}/.static/docs`, { recursive: true, force: true });
  }

  loadFile(relativePath: string, currentAbsolutePath: string, path: string): File | undefined {
    if (!path.endsWith('.md') || path === "config.json") {
      if (path !== "config.json") {
        log('error', `docs${currentAbsolutePath.substring(this.config.basePath.length)} isn't a valid markdown file. Markdown files should end with '.md'`);
      }
      return;
    }

    const { content, data } = matter(fs.readFileSync(currentAbsolutePath).toString());

    const file: File = {
      type: 0,
      link: join(relativePath, stringToSlug(data.slug ?? path.slice(0, -3))),
      label: data.label ?? path.slice(0, -3),
      index: data.index ?? 'no-index'
    };

    if (file.label?.length === 0) {
      file.label = 'Introduction';
    }

    if (file.link.endsWith('/') && file.link.length > 1) {
      file.link = file.link.slice(0, -1);
    }

    fs.writeFileSync(
      `${process.cwd()}/.static/docs${file.link}.json`,
      JSON.stringify({
        data,
        content: parseContent(content),
        label: file.label,
      })
    );

    return file;
  }

  iterate(absolutePath: string, relativePath: string, segment: string): Folder {
    const paths = fs.readdirSync(absolutePath);

    const config: FolderConfig = getFolderConfig(absolutePath);

    relativePath = join(relativePath, stringToSlug(config.slug ?? segment));

    const staticPath = `${process.cwd()}/.static/docs${relativePath}`;

    if (!fs.existsSync(staticPath)) {
      fs.mkdirSync(staticPath, { recursive: true });
    }

    const current: Folder = {
      type: 1,
      label: config.label ?? segment,
      link: relativePath,
      index: config.index ?? 'no-index',
      children: []
    };

    for (const path of paths) {
      const currentAbsolutePath = `${absolutePath}/${path}`;
      const stats = fs.lstatSync(currentAbsolutePath);

      if (stats.isFile()) {

        const file = this.loadFile(relativePath, currentAbsolutePath, path === 'index.md' ? '.md' : path);

        if (file) {
          current.children.push(file);
          this.converter.set(currentAbsolutePath, current.children.at(-1)?.link as string);
        }
      } else if (stats.isDirectory()) {
        current.children.push(this.iterate(currentAbsolutePath, current.link, path));
        this.converter.set(currentAbsolutePath, current.children.at(-1)?.link as string);
      }
    }

    current.children = current.children.sort((a: FolderOrFile, b: FolderOrFile) => {
      if (a.type === b.type) {
        if (a.index === 'no-index' || b.index === 'no-index') {
          return a.index === 'no-index' ? 1 : -1;
        }
        return (a.index ?? Infinity) - (b.index ?? Infinity);
      }
      return a.type - b.type;
    });

    return current;
  }

  generate() {
    log('info', 'Scanning docs');

    if (!fs.existsSync(`${process.cwd()}/.static`)) {
      fs.mkdirSync(`${process.cwd()}/.static`);
    }

    if (!fs.existsSync(`${process.cwd()}/.static/docs`)) {
      fs.mkdirSync(`${process.cwd()}/.static/docs`);
    }

    this.clear();

    this.sitemap = this.iterate(this.config.basePath, '', '').children;
    fs.writeFileSync(`${process.cwd()}/.static/tree.json`, JSON.stringify(this.sitemap));

    log('success', 'Docs scanned successfully');
  }

  watch(callback = () => {}) {

    this.watcher = chokidar.watch(this.config.basePath, {
      ignoreInitial: true
    });

    this.watcher.on('all', () => {
      this.generate();
      callback();
    });

    this.watcher.on('ready', () => {
      log('info', 'Watching the docs for changes');
    });
  }
}