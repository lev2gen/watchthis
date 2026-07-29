import { useEffect } from 'react';

type SeoProps = {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  author?: string;
  jsonLd?: object;
};

export function Seo({
  title,
  description,
  path,
  type = 'website',
  publishedTime,
  author,
  jsonLd,
}: SeoProps) {
  const canonicalUrl = `https://watchthis.dev${path}`;
  const fullTitle = path === '/' ? title : `${title} | WatchThis`;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    setMeta('description', description);
    setMeta('robots', 'index,follow');
    setLink('canonical', canonicalUrl);

    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:type', type, true);
    setMeta('og:site_name', 'WatchThis', true);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);

    if (publishedTime) {
      setMeta('article:published_time', publishedTime, true);
    }
    if (author) {
      setMeta('article:author', author, true);
    }

    if (jsonLd) {
      let script = document.querySelector<HTMLScriptElement>(
        'script[type="application/ld+json"]',
      );
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }
  }, [fullTitle, description, canonicalUrl, type, publishedTime, author, jsonLd]);

  return null;
}
