import { SitemapStream } from "sitemap";
import { FolderOrFile } from "../files";

export function generateXMLSitemap (config: EasyDocsConfig, sitemap: FolderOrFile[]): string {
  const stream = new SitemapStream({
    hostname: config.hostname ?? ''
  })

  for (const file of sitemap) {
    stream.write({
      url: '...'
    });
  }

  return '';
}