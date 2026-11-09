import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RecActs — Work. Track. Achieve.',
  description:
    'Production Multi-Tenant SaaS Web Application for Requirements Management, Time Logs, Approvals, Gantt Timelines, Blockers, Leave Planning, KPI Engine & God Mode Administration.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
