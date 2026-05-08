import { redirect } from 'next/navigation';

// Auth disabled — bounce straight into onboarding.
export default function SignUpPage() {
  redirect('/onboarding');
}
