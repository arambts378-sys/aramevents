import { redirect } from 'next/navigation';

// Not built yet: send anyone who lands here to the event workspace instead of a dead end.
export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  redirect(`/app/events/${eventId}`);
}
