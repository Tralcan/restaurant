import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a clean, modern font
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Buscador Global de Antojos',
  description: 'Encuentra restaurantes con el ambiente nocturno perfecto.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      {/* Force dark theme by applying 'dark' class to <html> */}
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster /> {/* Add Toaster for notifications */}
      </body>
    </html>
  );
}
