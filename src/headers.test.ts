// The site's response headers are written twice: public/_headers (Netlify, Cloudflare Pages) and
// vercel.json (Vercel). Both must send the same headers on the same paths, so a security
// header added to one host can't be missing on the other.
import { describe, expect, it } from 'vitest';
import headersFile from '../public/_headers?raw';
import vercelConfig from '../vercel.json';

type Rules = Record<string, Record<string, string>>;

/** public/_headers: a path line, then indented "Name: value" lines; # starts a comment. */
function fromHeadersFile(text: string): Rules {
  const rules: Rules = {};
  let path: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      path = line.trim();
      rules[path] = {};
    } else if (path) {
      const at = line.indexOf(':');
      rules[path][line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
  }
  return rules;
}

/** vercel.json: "/(.*)" style sources, written here as the "/*" of _headers. */
function fromVercel(json: { headers: { source: string; headers: { key: string; value: string }[] }[] }): Rules {
  const rules: Rules = {};
  for (const rule of json.headers) {
    const path = rule.source.replace(/\(\.\*\)$/, '*');
    rules[path] = { ...rules[path], ...Object.fromEntries(rule.headers.map((h) => [h.key, h.value])) };
  }
  return rules;
}

describe('response headers', () => {
  const netlify = fromHeadersFile(headersFile);
  const vercel = fromVercel(vercelConfig);

  it('are the same in public/_headers and vercel.json', () => {
    expect(vercel).toEqual(netlify);
  });

  it('include the security headers on every path', () => {
    expect(Object.keys(netlify['/*']).sort()).toEqual(
      ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options'].sort(),
    );
    expect(netlify['/*']['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });
});
