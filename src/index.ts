#! /usr/bin/env node

import { program } from 'commander';

import chokidar from 'chokidar';
import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fs from 'fs';

import DocsFiles, { FolderOrFile } from './services/files';
import DocsSSR from './services/ssr';
import { log } from './services/logger';

const CURRENT = process.cwd();
const HOME = __dirname.slice(0, -5);

const getPath = (p: string) => CURRENT + p;

const createConfig = () => fs.writeFileSync(process.cwd() + '/docs.config.json', `
{
  "title": "EasyDocs",
  "favicon": "",
  "header": {
    "title": "EasyDocs",
    "links": [
      {
        "label": "GitHub",
        "link": "https://github.com/ntillier/EasyDocs"
      },
      {
        "label": "Issues",
        "link": "https://github.com/ntillier/EasyDocs/issues"
      }
    ]
  }
}
`);

const getConfig = () => {
  try {
    return JSON.parse(fs.readFileSync(getPath('/docs.config.json')).toString());
  } catch (_) {
    log('error', 'Unable to load config file');
    process.exit(1);
  }
}

const createFiles = () => new DocsFiles({
  basePath: getPath('/docs')
});

const createSSR = (sitemap: FolderOrFile[]) => new DocsSSR({
  config: getConfig(),
  sitemap: sitemap,
  template: HOME + '/pages/index.html',
});

const isValidProject = ():boolean => fs.existsSync(getPath('/docs')) && fs.existsSync(getPath('/docs.config.json'));

const createApp = (ssr: DocsSSR) => {
  const app = fastify();

  // public files and assets
  app.register(fastifyStatic, {
    root: [getPath('/public'), HOME + '/assets'],
    prefix: '/',
  });

  // doc files
  app.register(fastifyStatic, {
    root: getPath('/.static/docs'),
    prefix: '/api/doc/',
    serveDotFiles: true,
    decorateReply: false
  });

  app.setErrorHandler((error: any, request: any, reply: any) => {
    log('error', error.message);
  });

  app.setNotFoundHandler((request: any, reply: any) => {
    reply
      .type('text/html')
      .send(ssr.generate(request.url));
  });

  app.listen(
    {
      port: 3030
    },
    (err: any, address: string) => {
      if (err) {
        throw err;
      }
      log('info', `Listening at ${address}`)
    }
  );
}

program
  .command('init')
  .description('Init your docs\' website')
  .action(() => {
    if (!fs.existsSync(getPath('/docs.config.json'))) {
      createConfig();
      fs.mkdirSync(getPath('/docs'));
      fs.mkdirSync(getPath('/public'));
      fs.writeFileSync(getPath('/docs/index.md'), '# Hello world!');
    } else {
      log('error', 'A project already exists in this location.');
      process.exit(1);
    }
  });

program
  .command('dev')
  .description('Develop your docs\' website.')
  .action(() => {
    if (isValidProject()) {
      const files = createFiles();
      files.generate();

      const ssr = createSSR(files.sitemap);
      files.watch(() => {
        ssr.options.sitemap = files.sitemap;
        ssr.generateTemplate();
      });

      chokidar
        .watch(getPath('/docs.config.json'))
        .on('change', () => {
          log('info', 'Config file changes - please restart the server');
        })
        .on('ready', () => {});

      createApp(ssr);
    } else {
      log('error', 'Invalid project');
      process.exit(1);
    }
  });

program
  .command('build')
  .description('Build your docs\' website.')
  .action(() => {
    if (!isValidProject()) {
      log('error', 'Invalid project');
      process.exit(1);
    }

    const files = createFiles();
    files.generate();

    const ssr = createSSR(files.sitemap);

    if (fs.existsSync(getPath('/.build'))) {
      fs.rmSync(getPath('/.build'), { recursive: true, force: true });
    }

    const createDir = (path: string) => fs.mkdirSync(getPath('/.build' + path));

    const write = (path: string, content: string) => fs.writeFileSync(getPath('/.build' + path), content);

    const saveFiles = (arr: FolderOrFile[]) => {
      for (const child of arr) {
        if (child.type === 0) {
          write((child.link === '/' ? '/index' : child.link) + '.html', ssr.generate(child.link) as string);
        } else {
          createDir(child.link);
          saveFiles(child.children);
        }
      }
    }

    const copyFiles = (from: string, to: string) => {
      for (const file of fs.readdirSync(from)) {
        const path = `${from}/${file}`;
        const stat = fs.lstatSync(path);
        if (stat.isFile()) {
          fs.copyFileSync(`${from}/${file}`, `${to}/${file}`);
        } else if (stat.isDirectory()) {
          fs.mkdirSync(`${to}/${file}`);
          copyFiles(path, `${to}/${file}`);
        }
      }
    }

    createDir('');
    createDir('/api');
    createDir('/api/doc');
    saveFiles(files.sitemap);

    write('/404.html', ssr.generate(undefined))
    
    copyFiles(getPath('/.static/docs'), getPath('/.build/api/doc'))
    copyFiles(getPath('/public'), getPath('/.build'));
    copyFiles(HOME + '/assets', getPath('/.build'));
  });

program
  .command('serve')
  .description('Serve your docs\' website.')
  .action(() => {
    if (!isValidProject()) {
      log('error', 'Invalid project');
      process.exit(1);
    }

    const files = createFiles();
    files.generate();

    const ssr = createSSR(files.sitemap);

    createApp(ssr);
  });



program.parse();