"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../logger");
const gray_matter_1 = __importDefault(require("gray-matter"));
const chokidar_1 = __importDefault(require("chokidar"));
const markdown_1 = require("./markdown");
const join = (p1, p2) => (p1.endsWith('/') ? p1.slice(0, -1) : p1) + '/' + (p2.startsWith('/') ? p2.substring(1) : p2);
const getFolderConfig = (absolutePath) => {
    try {
        if (fs_1.default.existsSync(`${absolutePath}/config.json`)) {
            return JSON.parse(fs_1.default.readFileSync(`${absolutePath}/config.json`).toString());
        }
    }
    catch (_) {
        (0, logger_1.log)('error', `${absolutePath}/config.json is not valid JSON.`);
    }
    return {};
};
class DocsFiles {
    constructor(config) {
        this.config = config;
        this.converter = new Map();
        this.sitemap = [];
    }
    clear() {
        fs_1.default.rmSync(`${process.cwd()}/.static/docs`, { recursive: true, force: true });
    }
    loadFile(relativePath, currentAbsolutePath, path) {
        var _a, _b, _c, _d;
        if (!path.endsWith('.md') || path === "config.json") {
            if (path !== "config.json") {
                (0, logger_1.log)('error', `docs${currentAbsolutePath.substring(this.config.basePath.length)} isn't a valid markdown file. Markdown files should end with '.md'`);
            }
            return;
        }
        const { content, data } = (0, gray_matter_1.default)(fs_1.default.readFileSync(currentAbsolutePath).toString());
        const file = {
            type: 0,
            link: join(relativePath, (0, markdown_1.stringToSlug)((_a = data.slug) !== null && _a !== void 0 ? _a : path.slice(0, -3))),
            label: (_b = data.label) !== null && _b !== void 0 ? _b : path.slice(0, -3),
            index: (_c = data.index) !== null && _c !== void 0 ? _c : 'no-index'
        };
        if (((_d = file.label) === null || _d === void 0 ? void 0 : _d.length) === 0) {
            file.label = 'Introduction';
        }
        if (file.link.endsWith('/') && file.link.length > 1) {
            file.link = file.link.slice(0, -1);
        }
        fs_1.default.writeFileSync(`${process.cwd()}/.static/docs${file.link}.json`, JSON.stringify({
            data,
            content: (0, markdown_1.parseContent)(content),
            label: file.label,
        }));
        return file;
    }
    iterate(absolutePath, relativePath, segment) {
        var _a, _b, _c, _d, _e;
        const paths = fs_1.default.readdirSync(absolutePath);
        const config = getFolderConfig(absolutePath);
        relativePath = join(relativePath, (0, markdown_1.stringToSlug)((_a = config.slug) !== null && _a !== void 0 ? _a : segment));
        const staticPath = `${process.cwd()}/.static/docs${relativePath}`;
        if (!fs_1.default.existsSync(staticPath)) {
            fs_1.default.mkdirSync(staticPath, { recursive: true });
        }
        const current = {
            type: 1,
            label: (_b = config.label) !== null && _b !== void 0 ? _b : segment,
            link: relativePath,
            index: (_c = config.index) !== null && _c !== void 0 ? _c : 'no-index',
            children: []
        };
        for (const path of paths) {
            const currentAbsolutePath = `${absolutePath}/${path}`;
            const stats = fs_1.default.lstatSync(currentAbsolutePath);
            if (stats.isFile()) {
                const file = this.loadFile(relativePath, currentAbsolutePath, path === 'index.md' ? '.md' : path);
                if (file) {
                    current.children.push(file);
                    this.converter.set(currentAbsolutePath, (_d = current.children.at(-1)) === null || _d === void 0 ? void 0 : _d.link);
                }
            }
            else if (stats.isDirectory()) {
                current.children.push(this.iterate(currentAbsolutePath, current.link, path));
                this.converter.set(currentAbsolutePath, (_e = current.children.at(-1)) === null || _e === void 0 ? void 0 : _e.link);
            }
        }
        current.children = current.children.sort((a, b) => {
            var _a, _b;
            if (a.type === b.type) {
                if (a.index === 'no-index' || b.index === 'no-index') {
                    return a.index === 'no-index' ? 1 : -1;
                }
                return ((_a = a.index) !== null && _a !== void 0 ? _a : Infinity) - ((_b = b.index) !== null && _b !== void 0 ? _b : Infinity);
            }
            return a.type - b.type;
        });
        return current;
    }
    generate() {
        (0, logger_1.log)('info', 'Scanning docs');
        if (!fs_1.default.existsSync(`${process.cwd()}/.static`)) {
            fs_1.default.mkdirSync(`${process.cwd()}/.static`);
        }
        if (!fs_1.default.existsSync(`${process.cwd()}/.static/docs`)) {
            fs_1.default.mkdirSync(`${process.cwd()}/.static/docs`);
        }
        this.clear();
        this.sitemap = this.iterate(this.config.basePath, '', '').children;
        fs_1.default.writeFileSync(`${process.cwd()}/.static/tree.json`, JSON.stringify(this.sitemap));
        (0, logger_1.log)('success', 'Docs scanned successfully');
    }
    watch(callback = () => { }) {
        this.watcher = chokidar_1.default.watch(this.config.basePath, {
            ignoreInitial: true
        });
        this.watcher.on('all', () => {
            this.generate();
            callback();
        });
        this.watcher.on('ready', () => {
            (0, logger_1.log)('info', 'Watching the docs for changes');
        });
    }
}
exports.default = DocsFiles;
//# sourceMappingURL=index.js.map