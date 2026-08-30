import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'Aether | Intelligent Reflections',
  description: 'A private, user-authenticated reflection and journaling web application powered by Gemini 3.6 Flash and Cloud Firestore.',
  openGraph: {
    title: 'Aether | Intelligent Reflections',
    description: 'A private, user-authenticated reflection and journaling web application powered by Gemini 3.6 Flash and Cloud Firestore.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aether | Intelligent Reflections',
    description: 'A private, user-authenticated reflection and journaling web application powered by Gemini 3.6 Flash and Cloud Firestore.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="bg-[#0c0c0d] text-[#e4e4e7] antialiased selection:bg-[#d4ff33] selection:text-[#0c0c0d]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}


