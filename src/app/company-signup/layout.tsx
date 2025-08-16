import React from 'react';

// Route segment config must be exported from a Server Component module
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default function CompanySignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
