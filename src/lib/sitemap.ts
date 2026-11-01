import type { MetaFile } from './types';

export function buildImageSitemap(domain: string, files: Pick<MetaFile, 'name'>[]): string {
  let base: URL;
  try { base = new URL(domain.trim()); } catch { throw new Error('Enter a complete website URL, such as https://example.com.'); }
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) throw new Error('Use an HTTP or HTTPS website URL without credentials.');
  base.search = ''; base.hash = '';
  const root = base.href.replace(/\/+$/, '');
  const escape = (value: string) => value.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
  const names = [...new Set(files.map((file) => file.name))];
  if (names.length > 50000) throw new Error('A sitemap can contain up to 50,000 URLs. Export a smaller queue.');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${names.map((name) => `  <url>\n    <loc>${escape(`${root}/gallery/${encodeURIComponent(name.replace(/\.[^.]+$/, ''))}`)}</loc>\n    <image:image><image:loc>${escape(`${root}/images/${encodeURIComponent(name)}`)}</image:loc></image:image>\n  </url>`).join('\n')}\n</urlset>`;
}
