import { redirect } from 'next/navigation';

// Profile details live in Settings > Account.
export default function UserProfilePage() {
  redirect('/app/settings#account');
}
