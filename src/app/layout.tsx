import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { APP_NAME } from '@/config/constants';
import { QueryProvider } from '@/lib/queries';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Minimal Next.js App Router boilerplate with a typed API layer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
