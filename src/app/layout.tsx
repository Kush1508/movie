import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cinemesh — Private Synchronized Cinema with Friends',
  description: 'Zero-buffer, zero-signup synchronized movie watch party room with real-time WebRTC voice, multi-input media stage, and soundboard alerts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-cinema-950 text-cinema-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
