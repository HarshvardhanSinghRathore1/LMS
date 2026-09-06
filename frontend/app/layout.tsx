import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'Capacity Connect | Digital Capacity Building & LMS',
  description: 'AI-Powered Organizational Capacity-Building and Learning Management Platform (SIH 2026 - PS 26075)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-onyx text-white font-sans antialiased selection:bg-mahogany-red selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
