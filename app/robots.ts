import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';

const PRIVATE = ['/api/', '/auth/', '/dashboard', '/editor/', '/tool', '/membership', '/login', '/signup', '/pricing', '/timing-preview'];

// AI answer engines are named on purpose so LRC Forge can be quoted in their answers.
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
