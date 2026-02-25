import '@/app/globals.css';
import ClientProviders from '@/components/providers/ClientProviders';

export const metadata = {
  title: 'Growell — Platform Posyandu Digital Indonesia',
  description: 'Pantau tumbuh kembang balita dengan prediksi status gizi berbasis AI, konsultasi online bersama ahli gizi, dan laporan digital otomatis.',
  openGraph: {
    title: 'Growell — Platform Posyandu Digital Indonesia',
    description: 'Prediksi gizi AI, telemedicine, dan laporan digital untuk posyandu modern.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/growell-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-sans">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
