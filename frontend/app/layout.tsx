import type { Metadata } from 'next';
import "./globals.css";
import Providers from "./Providers";

export const metadata: Metadata = {
  title: {
    template: '%s | LabFace',
    default: 'LabFace - Smart Attendance System',
  },
  description: 'AI-Powered Facial Recognition Attendance System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

