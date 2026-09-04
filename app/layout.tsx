import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { GoogleMapsWrapper } from '@/components/maps/GoogleMapsWrapper';

export const metadata: Metadata = {
  title: 'Gemini Reflection Journal',
  description: 'A private, user-authenticated reflection and journaling web application with an interactive daily schedule planner, powered by cost-optimized Gemini 3.1 Flash-Lite and Cloud Firestore with Google Sign-In.',
  openGraph: {
    title: 'Gemini Reflection Journal',
    description: 'A private, user-authenticated reflection and journaling web application with an interactive daily schedule planner, powered by cost-optimized Gemini 3.1 Flash-Lite and Cloud Firestore with Google Sign-In.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gemini Reflection Journal',
    description: 'A private, user-authenticated reflection and journaling web application with an interactive daily schedule planner, powered by cost-optimized Gemini 3.1 Flash-Lite and Cloud Firestore with Google Sign-In.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: '#0c0c0d', color: '#e4e4e7' }}>
      <body
        suppressHydrationWarning
        style={{ backgroundColor: '#0c0c0d', color: '#e4e4e7', margin: 0, minHeight: '100vh' }}
        className="bg-[#0c0c0d] text-[#e4e4e7] antialiased selection:bg-[#d4ff33] selection:text-[#0c0c0d]"
      >
        <AuthProvider>
          <GoogleMapsWrapper>
            {children}
          </GoogleMapsWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}


