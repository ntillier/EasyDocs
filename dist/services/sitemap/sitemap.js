"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateXMLSitemap = void 0;
const sitemap_1 = require("sitemap");
function generateXMLSitemap(config, sitemap) {
    var _a;
    const stream = new sitemap_1.SitemapStream({
        hostname: (_a = config.hostname) !== null && _a !== void 0 ? _a : ''
    });
    for (const file of sitemap) {
        stream.write({
            url: '...'
        });
    }
    return '';
}
exports.generateXMLSitemap = generateXMLSitemap;
//# sourceMappingURL=sitemap.js.map