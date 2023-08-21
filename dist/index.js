#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chokidar_1 = __importDefault(require("chokidar"));
const fastify_1 = __importDefault(require("fastify"));
const static_1 = __importDefault(require("@fastify/static"));
const fs_1 = __importDefault(require("fs"));
const files_1 = __importDefault(require("./services/files"));
const ssr_1 = __importDefault(require("./services/ssr"));
const logger_1 = require("./services/logger");
const CURRENT = process.cwd();
const HOME = __dirname.slice(0, -5);
const getPath = (p) => CURRENT + p;
const createConfig = () => fs_1.default.writeFileSync(process.cwd() + '/docs.config.json', `
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
        return JSON.parse(fs_1.default.readFileSync(getPath('/docs.config.json')).toString());
    }
    catch (_) {
        (0, logger_1.log)('error', 'Unable to load config file');
        process.exit(1);
    }
};
const createFiles = () => new files_1.default({
    basePath: getPath('/docs')
});
const createSSR = (sitemap) => new ssr_1.default({
    config: getConfig(),
    sitemap: sitemap,
    template: HOME + '/pages/index.html',
});
const isValidProject = () => fs_1.default.existsSync(getPath('/docs')) && fs_1.default.existsSync(getPath('/docs.config.json'));
const createApp = (ssr) => {
    const app = (0, fastify_1.default)();
    app.register(static_1.default, {
        root: [getPath('/public'), HOME + '/assets'],
        prefix: '/',
    });
    app.register(static_1.default, {
        root: getPath('/.static/docs'),
        prefix: '/api/doc/',
        serveDotFiles: true,
        decorateReply: false
    });
    app.setErrorHandler((error, request, reply) => {
        (0, logger_1.log)('error', error.message);
    });
    app.setNotFoundHandler((request, reply) => {
        reply
            .type('text/html')
            .send(ssr.generate(request.url));
    });
    app.listen({
        port: 3030
    }, (err, address) => {
        if (err) {
            throw err;
        }
        (0, logger_1.log)('info', `Listening at ${address}`);
    });
};
commander_1.program
    .command('init')
    .description('Init your docs\' website')
    .action(() => {
    if (!fs_1.default.existsSync(getPath('/docs.config.json'))) {
        createConfig();
        fs_1.default.mkdirSync(getPath('/docs'));
        fs_1.default.mkdirSync(getPath('/public'));
        fs_1.default.writeFileSync(getPath('/docs/index.md'), '# Hello world!');
    }
    else {
        (0, logger_1.log)('error', 'A project already exists in this location.');
        process.exit(1);
    }
});
commander_1.program
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
        chokidar_1.default
            .watch(getPath('/docs.config.json'))
            .on('change', () => {
            (0, logger_1.log)('info', 'Config file changes - please restart the server');
        })
            .on('ready', () => { });
        createApp(ssr);
    }
    else {
        (0, logger_1.log)('error', 'Invalid project');
        process.exit(1);
    }
});
commander_1.program
    .command('build')
    .description('Build your docs\' website.')
    .action(() => {
    if (!isValidProject()) {
        (0, logger_1.log)('error', 'Invalid project');
        process.exit(1);
    }
    const files = createFiles();
    files.generate();
    const ssr = createSSR(files.sitemap);
    if (fs_1.default.existsSync(getPath('/.build'))) {
        fs_1.default.rmSync(getPath('/.build'), { recursive: true, force: true });
    }
    const createDir = (path) => fs_1.default.mkdirSync(getPath('/.build' + path));
    const write = (path, content) => fs_1.default.writeFileSync(getPath('/.build' + path), content);
    const saveFiles = (arr) => {
        for (const child of arr) {
            if (child.type === 0) {
                write((child.link === '/' ? '/index' : child.link) + '.html', ssr.generate(child.link));
            }
            else {
                createDir(child.link);
                saveFiles(child.children);
            }
        }
    };
    const copyFiles = (from, to) => {
        for (const file of fs_1.default.readdirSync(from)) {
            const path = `${from}/${file}`;
            const stat = fs_1.default.lstatSync(path);
            if (stat.isFile()) {
                fs_1.default.copyFileSync(`${from}/${file}`, `${to}/${file}`);
            }
            else if (stat.isDirectory()) {
                fs_1.default.mkdirSync(`${to}/${file}`);
                copyFiles(path, `${to}/${file}`);
            }
        }
    };
    createDir('');
    createDir('/api');
    createDir('/api/doc');
    saveFiles(files.sitemap);
    write('/404.html', ssr.generate(undefined));
    copyFiles(getPath('/.static/docs'), getPath('/.build/api/doc'));
    copyFiles(getPath('/public'), getPath('/.build'));
    copyFiles(HOME + '/assets', getPath('/.build'));
});
commander_1.program
    .command('serve')
    .description('Serve your docs\' website.')
    .action(() => {
    if (!isValidProject()) {
        (0, logger_1.log)('error', 'Invalid project');
        process.exit(1);
    }
    const files = createFiles();
    files.generate();
    const ssr = createSSR(files.sitemap);
    createApp(ssr);
});
commander_1.program.parse();
//# sourceMappingURL=index.js.map