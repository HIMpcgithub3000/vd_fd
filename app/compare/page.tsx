'use client';

import dynamic from 'next/dynamic';

const CompareWorkbench = dynamic(() => import('@/components/compare/CompareWorkbench'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      Compare Workbench लोड हो रहा है…
    </div>
  ),
});

export default function ComparePage() {
  return <CompareWorkbench />;
}
