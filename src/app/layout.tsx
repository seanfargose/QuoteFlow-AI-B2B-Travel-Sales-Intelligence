import type { Metadata } from 'next';
import './globals.css';
import { DataProvider } from '../services/dataContext';
import { Sidebar } from '../components/Sidebar';

export const metadata: Metadata = {
  title: 'QuoteFlow AI — B2B Travel Sales Intelligence',
  description: 'AI-assisted B2B travel quotation, dynamic pricing, and booking-conversion workbench.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased h-screen overflow-hidden flex">
        <DataProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
            {children}
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
