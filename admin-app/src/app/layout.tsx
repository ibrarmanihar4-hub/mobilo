import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import ToastContainer from '@/components/ToastContainer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mobilo Admin',
  description: 'Mobilo Platform Admin & Management Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#070711] text-[#e8e8f8] min-h-screen antialiased`}>
        <AdminAuthProvider>
          {children}
          <ToastContainer />
        </AdminAuthProvider>
      </body>
    </html>
  );
}
