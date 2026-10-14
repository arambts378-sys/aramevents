# ARAM BTS Responsive Audit Checklist

This checklist records source-level route inventory and responsive follow-up for the mobile responsiveness work. “Source-reviewed” means the route was included in the repository route/layout review; it does not mean every interaction or viewport has been browser-tested. Browser checks remain pending unless explicitly marked below.

## Viewport matrix

- [x] 320px (homepage and login)
- [x] 360px (homepage and login)
- [x] 375px (homepage and login)
- [x] 390px (homepage and login)
- [x] 430px (homepage and login)
- [x] 768px (homepage and login)
- [x] 1024px (homepage and login)
- [x] 1280px (homepage and login)
- [x] 1440px (homepage and login)

## Public marketing

| Route | Source audit | Browser check |
|---|---|---|
| `/` | [x] | [x] No page-level horizontal overflow at all nine listed widths; mobile menu opened and closed with Escape. |
| `/about` | [x] | [x] No page-level horizontal overflow or offscreen interactive controls at all nine widths. |
| `/contact` | [x] | [x] No page-level horizontal overflow or offscreen interactive controls at all nine widths. |
| `/pricing` | [x] | [x] No page-level horizontal overflow or offscreen interactive controls at all nine widths. |
| `/privacy` | [x] | [x] No page-level horizontal overflow or offscreen interactive controls at all nine widths. |
| `/terms` | [x] | [x] No page-level horizontal overflow or offscreen interactive controls at all nine widths. |

## Workspace

Workspace routes do not share one common application layout; sidebar and main sizing are embedded in route pages. Verify mobile navigation triggers, content sizing, and duplicate sidebar behavior on each applicable route.

| Route | Source audit | Browser check |
|---|---|---|
| `/app` | [x] | [ ] |
| `/app/analytics` | [x] | [ ] |
| `/app/events` | [x] | [ ] |
| `/app/events/new` | [x] Date/time subgrid needs narrow-width attention. | [ ] |
| `/app/events/[eventId]` | [x] | [ ] |
| `/app/events/[eventId]/agenda` | [x] | [ ] |
| `/app/events/[eventId]/analytics` | [x] KPI grids now stack below `sm`; charts still need visual checks. | [ ] |
| `/app/events/[eventId]/check-in` | [x] | [ ] |
| `/app/events/[eventId]/communications` | [x] | [ ] |
| `/app/events/[eventId]/exhibitors` | [x] | [ ] |
| `/app/events/[eventId]/integrations` | [x] | [ ] |
| `/app/events/[eventId]/operations` | [x] | [ ] |
| `/app/events/[eventId]/operations/access-control` | [x] | [ ] |
| `/app/events/[eventId]/operations/check-in` | [x] | [ ] |
| `/app/events/[eventId]/operations/volunteers` | [x] | [ ] |
| `/app/events/[eventId]/people` | [x] | [ ] |
| `/app/events/[eventId]/registration` | [x] Bounded wide table scroll; metrics stack below `sm`. | [ ] |
| `/app/events/[eventId]/settings` | [x] | [ ] |
| `/app/events/[eventId]/speakers` | [x] Speaker modal form grids stack below `sm`. | [ ] |
| `/app/events/[eventId]/sponsors` | [x] | [ ] |
| `/app/events/[eventId]/tickets` | [x] Existing mobile card presentation; inspect modal controls. | [ ] |
| `/app/events/[eventId]/venues` | [x] | [ ] |
| `/app/events/[eventId]/website` | [x] | [ ] |
| `/app/events/[eventId]/website/editor` | [x] Tabbed narrow-screen panels exist; toolbar controls need browser verification. | [ ] |
| `/app/events/[eventId]/website/preview` | [x] | [ ] |
| `/app/events/[eventId]/website/review` | [x] | [ ] |
| `/app/people` | [x] Existing mobile card view. | [ ] |
| `/app/people/[id]` | [x] | [ ] |
| `/app/profile` | [x] Fixed desktop-like padding/heading needs narrow-width check. | [ ] |
| `/app/settings` | [x] | [ ] |

## Public event pages

| Route | Source audit | Browser check |
|---|---|---|
| `/events/[slug]` | [x] | [ ] |
| `/events/[slug]/register` | [x] | [ ] |

## Authentication and account

| Route | Source audit | Browser check |
|---|---|---|
| `/login` | [x] | [x] No page-level horizontal overflow or offscreen form controls at all nine listed widths. |
| `/signup` | [x] | [ ] |
| `/forgot-password` | [x] | [ ] |
| `/reset-password` | [x] | [ ] |
| `/organizer/register` | [x] | [ ] |
| `/organizer/verify` | [x] | [ ] |

## Check-in, invites, and volunteers

| Route | Source audit | Browser check |
|---|---|---|
| `/check-in` | [x] | [ ] |
| `/invite` | [x] | [ ] |
| `/volunteer/scanner/[tokenId]` | [x] | [ ] |

## Shared components and known responsive follow-up

- [x] Global structural elements use `min-width: 0`; form controls stay within their containers and have mobile touch/zoom safeguards.
- [x] Workspace sidebar supports desktop collapse and an accessible mobile drawer with Escape, focus, and scroll handling.
- [x] Shared modal is viewport-bounded, scrollable, and keyboard dismissible.
- [x] Shared tables use a bounded horizontal scroll region.
- [x] Website editor toolbar controls remain available in a horizontally scrollable compact layout.
- [ ] Verify sidebar triggers and main-content widths across all workspace routes.
- [ ] Inspect registration/ticket/speaker dialogs, date-time controls, profile forms, analytics charts, and public event renderer at narrow widths.
- [ ] Test drawer, modal, editor panel switching, and table scrolling with keyboard and touch.
- [ ] Record console errors and any routes that require authentication and cannot be accessed in the browser test session.

## Coverage note

The route inventory contains 47 UI routes. API handlers do not have viewports and are outside this visual checklist. Browser verification covers the six public marketing/legal routes and `/login` at all nine widths, with no page-level horizontal overflow or interactive elements outside the viewport. The homepage mobile menu was also opened and dismissed with Escape. `/app/events/new` redirected to `/login` in the available browser session, so protected workspace interactions, dialogs, charts, and editor remain source-reviewed but not browser-verified. The browser reported existing unused font-preload warnings on the login route; no new console errors were observed in the routes checked.
