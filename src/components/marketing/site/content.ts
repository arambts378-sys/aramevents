/**
 * Copy for the public website. Every capability listed here was checked against
 * the product code before being written down; keep it that way when editing.
 * Not advertised on purpose: online payment collection (paid checkout is blocked
 * until a payment provider is connected) and self-serve certificates (no organizer UI yet).
 */

export const WORKFLOW = [
  {
    title: 'Create the event',
    body: 'Add the name, type, dates, time zone and venue. Walkathons get distance categories with their own capacity.',
  },
  {
    title: 'Publish a website',
    body: 'Start from a template, upload your flyer as the banner, and turn sections like speakers, agenda and sponsors on or off.',
  },
  {
    title: 'Open registration',
    body: 'Set ticket types, quantities and a capacity. Each confirmed attendee gets a QR ticket by email.',
  },
  {
    title: 'Check guests in',
    body: 'Share a scanner link with volunteers. They scan tickets on their phone camera, by gate or zone, with no app to install.',
  },
  {
    title: 'Review the results',
    body: 'See registrations and check-ins by day, the attendance rate, and keep every attendee in your people directory.',
  },
] as const;

export type FeatureKey = 'website' | 'registration' | 'checkin' | 'people' | 'team' | 'analytics';

export const FEATURES: {
  key: FeatureKey;
  title: string;
  summary: string;
  points: string[];
}[] = [
  {
    key: 'website',
    title: 'Event websites',
    summary: 'A page for every event, built from your details instead of from scratch.',
    points: [
      'Templates with sections for about, speakers, agenda, venue, sponsors and exhibitors',
      'Use your flyer as the hero banner',
      'Preview your changes live and publish when you are ready',
    ],
  },
  {
    key: 'registration',
    title: 'Registration and tickets',
    summary: 'One registration form per event, with the limits you set.',
    points: [
      'Free and paid ticket types with quantities',
      'Event capacity enforced when people register',
      'Confirmation email with a QR ticket for every attendee',
    ],
  },
  {
    key: 'checkin',
    title: 'QR check-in',
    summary: 'Volunteers scan tickets from a link on their phone.',
    points: [
      'Signed QR codes that cannot be guessed or copied into a new ticket',
      'Scanner links per volunteer, with an expiry you choose',
      'Gates and zones, and a clear message for duplicate or invalid scans',
    ],
  },
  {
    key: 'people',
    title: 'Attendee management',
    summary: 'Everyone who registers, in one directory across all your events.',
    points: [
      'Import attendee lists from CSV or Excel',
      'Each person’s registrations and check-ins in one place',
      'Resend a ticket when someone loses theirs',
    ],
  },
  {
    key: 'team',
    title: 'Team access',
    summary: 'Invite your team and give each person the access they need.',
    points: [
      'Owner, admin, editor, member and viewer roles',
      'Invitations by email that expire after seven days',
      'Volunteers scan tickets without a full account',
    ],
  },
  {
    key: 'analytics',
    title: 'Analytics',
    summary: 'Know how registration and entry are going without a spreadsheet.',
    points: [
      'Registrations and check-ins over time',
      'Attendance rate, and attendance by walkathon distance',
      'Send registrations to Google Sheets as they arrive',
    ],
  },
];

export const USE_CASES = [
  {
    slug: 'conferences',
    title: 'Conferences and summits',
    body: 'Publish speakers and the agenda, sell several ticket types, and run separate entry for halls and sessions.',
    uses: ['Speakers and agenda sections', 'Ticket types with quantities', 'Zones for halls and sessions'],
  },
  {
    slug: 'walkathons',
    title: 'Walkathons and runs',
    body: 'Offer distance categories with their own capacity, import participant lists, and check runners in at the start line.',
    uses: ['Distance categories', 'Bulk participant import', 'Start-line scanning by volunteers'],
  },
  {
    slug: 'workshops',
    title: 'Workshops and training',
    body: 'Cap seats, confirm each registration by email, and see who actually turned up on each day.',
    uses: ['Event capacity', 'Email confirmations', 'Attendance by day'],
  },
  {
    slug: 'corporate',
    title: 'Corporate and community events',
    body: 'Give each colleague the right role, keep guest lists in one directory, and reuse your defaults for the next event.',
    uses: ['Team roles', 'People directory', 'Saved event defaults'],
  },
] as const;

/** Facts checked against the code: auth routes, RLS migrations, qrCredentials.ts, encryption.ts, fileValidator, next.config.ts. */
export const SECURITY_FACTS = [
  {
    title: 'Verified sign-up',
    body: 'New organizer accounts confirm their email with a six-digit code that expires in ten minutes, with limits on retries and resends.',
  },
  {
    title: 'Workspace isolation',
    body: 'Database row-level security keeps every workspace’s events, registrations and people separate from every other workspace.',
  },
  {
    title: 'Role-based permissions',
    body: 'What each team member can create, edit, publish or delete is checked by the database, not only hidden in the interface.',
  },
  {
    title: 'Signed QR tickets',
    body: 'Ticket codes are signed with a secret key and stored only as a hash, so a ticket cannot be forged from an attendee’s details.',
  },
  {
    title: 'Encrypted credentials',
    body: 'Email passwords you connect for sending tickets are encrypted with AES-256-GCM before they are stored.',
  },
  {
    title: 'Checked uploads',
    body: 'Flyers and images are checked by their actual file contents, not just their name, and stored under the uploader’s own folder.',
  },
] as const;

export const FAQS = [
  {
    q: 'What does it cost to start?',
    a: 'The Free plan costs nothing and includes up to two active events and three team members. Paid plans raise those limits.',
  },
  {
    q: 'Can attendees pay for tickets online?',
    a: 'You can create paid ticket types today, but online payment collection is not available yet. Free tickets can be booked straight away.',
  },
  {
    q: 'Do volunteers need an account or an app to scan tickets?',
    a: 'No. You create a scanner link for each volunteer. They open it on their phone and scan with the camera.',
  },
  {
    q: 'Can I bring in an existing attendee list?',
    a: 'Yes. Import a CSV or Excel file into an event, and each person is added to your people directory.',
  },
  {
    q: 'What happens if someone scans the same ticket twice?',
    a: 'The scanner tells the volunteer the ticket was already checked in to that zone, and does not admit it again.',
  },
  {
    q: 'Who on my team can see attendee data?',
    a: 'Only members of your workspace, and only as far as their role allows. Viewers can look but not change anything.',
  },
] as const;
