// Schema.org data for search engines and AI answers. Describes only what the home page already says.
import { SITE_NAME, SITE_SUMMARY, SITE_URL } from '@/lib/seo/site';

export default function StructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_SUMMARY,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web browser',
    featureList: [
      'Synced .lrc lyric files from a song recording',
      'Line-by-line timing correction',
      'Lyric video generator',
      'Karaoke player',
      'Hook extractor',
      'Song structure mapper',
    ],
    offers: { '@type': 'Offer', price: '9', priceCurrency: 'USD', description: 'Monthly subscription, unlimited songs' },
    publisher: { '@type': 'Organization', name: 'WorkinWithAI', url: 'https://workinwithai.com' },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
