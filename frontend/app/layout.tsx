import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

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
      <body className="bg-onyx text-white dark:bg-[#0b090a] dark:text-[#f5f3f4] light:bg-[#f8f9fa] light:text-[#111827] font-sans antialiased selection:bg-mahogany-red selection:text-white transition-colors duration-200">
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
