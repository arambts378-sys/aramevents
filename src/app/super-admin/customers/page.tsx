import { redirect } from 'next/navigation';

// Customers were merged into Organizers.
export default function CustomersRedirect() {
  redirect('/super-admin/organizers');
}
