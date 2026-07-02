// WorkinWithAI type stack · next/font exports
// Display: Bebas Neue (headlines only, with restraint)
// Labels/UI: Oswald · Body: Hanken Grotesk · Code/data: JetBrains Mono
import { Bebas_Neue, Oswald, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';

export const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bebas',
});

export const oswald = Oswald({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-oswald',
});

export const hanken = Hanken_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hanken',
});

export const jetbrains = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

/** All four families, ready to spread onto <body className={...}> */
export const fontClasses = [
  bebas.variable,
  oswald.variable,
  hanken.variable,
  jetbrains.variable,
].join(' ');
