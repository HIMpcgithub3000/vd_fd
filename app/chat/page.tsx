'use client';

import dynamic from 'next/dynamic';

const ChatInterface = dynamic(() => import('@/components/chat/ChatInterface'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      लोड हो रहा है…
    </div>
  ),
});

export default function ChatPage() {
  return <ChatInterface />;
}
