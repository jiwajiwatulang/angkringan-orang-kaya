import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { siteJsonLd, breadcrumbJsonLd, jsonLdHtml, siteNavigation, SITE_URL } from '../src/lib/publicMetadata';

test('site structured data names the site SakuNota and lists only public pages', () => {
  const graph = siteJsonLd()['@graph'] as Record<string, any>[];
  const website = graph.find(node => node['@type'] === 'WebSite')!;
  assert.equal(website.name, 'SakuNota');
  assert.equal(website.url, `${SITE_URL}/`);
  assert.ok(website.alternateName.includes('sakunota.my.id'));
  assert.ok(graph.some(node => node['@type'] === 'Organization'));
  assert.ok(graph.some(node => node['@type'] === 'SoftwareApplication' && node.offers.price === '50000'));
  const nav = graph.find(node => node['@type'] === 'ItemList')!;
  assert.equal(nav.itemListElement.length, siteNavigation.length);
  for (const item of nav.itemListElement) {
    assert.ok(item.url.startsWith(SITE_URL));
    assert.ok(!/\/(admin|owner|pos|checkout|waiter|api)\b/.test(item.url), `private page exposed: ${item.url}`);
  }
});

test('breadcrumb links back to home and escapes markup safely', () => {
  const crumb = breadcrumbJsonLd('Panduan Penggunaan', '/panduan');
  assert.equal(crumb.itemListElement[0].item, `${SITE_URL}/`);
  assert.equal(crumb.itemListElement[1].item, `${SITE_URL}/panduan`);
  const html = jsonLdHtml({ name: '</script><script>alert(1)</script>' });
  assert.ok(!html.includes('</script>'));
  assert.deepEqual(JSON.parse(html), { name: '</script><script>alert(1)</script>' });
});

test('sitemap lists every public page with a valid date and robots keeps private pages out', () => {
  const xml = readFileSync('public/sitemap.xml', 'utf8');
  for (const path of ['/', '/panduan', '/tentang', '/privacy', '/terms']) {
    assert.ok(xml.includes(`<loc>${SITE_URL}${path}</loc>`), `missing ${path}`);
  }
  for (const date of xml.match(/<lastmod>([^<]+)<\/lastmod>/g) || []) {
    assert.ok(!Number.isNaN(Date.parse(date.replace(/<\/?lastmod>/g, ''))));
  }
  const robots = readFileSync('public/robots.txt', 'utf8');
  assert.ok(robots.includes('Disallow: /admin'));
  assert.ok(robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
});
