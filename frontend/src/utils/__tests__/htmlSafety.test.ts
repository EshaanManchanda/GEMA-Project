/**
 * Vendor/author HTML is rendered through DOMPurify with ADD_TAGS: ['iframe'] at 8 call sites,
 * and stripped to text by stripHtmlTags for SEO. Regressions for both.
 */
import DOMPurify from 'isomorphic-dompurify';
import '@/utils/sanitize'; // registers the iframe source policy (main.tsx imports it too)
import { stripHtmlTags } from '@/utils/seoUtils';
import { normalizeHtmlForTipTap } from '@/utils/normalizeHtmlForTipTap';

const asCallSites = (html: string) => DOMPurify.sanitize(html, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allowfullscreen', 'frameborder'] });

describe('iframe source policy (all DOMPurify call sites)', () => {
  it.each([
    'https://evil.example/phish',
    'http://www.youtube.com/embed/abc',          // not https
    'https://www.youtube.com.evil.example/embed/abc',
    '//www.youtube.com/embed/abc',
    'javascript:alert(1)',
    '',
  ])('drops an iframe pointing at %p', (src) => {
    expect(asCallSites(`<p>a</p><iframe src="${src}"></iframe>`)).not.toContain('<iframe');
  });

  it.each([
    'https://www.youtube.com/embed/abc',
    'https://www.youtube-nocookie.com/embed/abc',
    'https://player.vimeo.com/video/123',
    'https://www.google.com/maps/embed?pb=x',
  ])('keeps an embed from %p', (src) => {
    expect(asCallSites(`<iframe src="${src}"></iframe>`)).toContain(`src="${src.replace(/&/g, '&amp;')}"`);
  });

  it('leaves other tags alone', () => {
    expect(asCallSites('<p><a href="https://kidrove.com">k</a></p>')).toContain('<a href="https://kidrove.com">');
  });
});

describe('stripHtmlTags', () => {
  it('returns plain text', () => {
    expect(stripHtmlTags('<p>Hello <b>world</b></p>\n<p>x</p>')).toBe('Hello world x');
  });

  it('parses in an inert document, never a live element (an <img onerror> there runs script)', () => {
    const spy = jest.spyOn(document, 'createElement');
    stripHtmlTags('<img src=x onerror="alert(1)">text');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('normalizeHtmlForTipTap (HTML pasted/loaded into the editor)', () => {

  it('wraps orphan inline nodes in paragraphs', () => {
    expect(normalizeHtmlForTipTap('<b>a</b> text<p>block</p>')).toBe('<p><b>a</b> text</p><p>block</p>');
  });

  it('never touches the live document (adopting a parsed <img> there fires onerror)', () => {
    const spies = [jest.spyOn(document, 'createElement'), jest.spyOn(document, 'createTextNode')];
    normalizeHtmlForTipTap('<span><img src=x onerror="alert(1)"></span> t');
    spies.forEach((s) => { expect(s).not.toHaveBeenCalled(); s.mockRestore(); });
  });
});
