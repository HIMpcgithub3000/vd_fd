import { redirect } from 'next/navigation';

// Auth disabled — bounce straight into the chat.
export default function SignInPage() {
  redirect('/chat');
}
