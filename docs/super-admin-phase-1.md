ARAM BTS: Complete Supabase Password Reset Investigation and Fix

Project Context

I am developing ARAM BTS, an event management platform built with Next.js App Router, React, TypeScript, and Supabase Authentication.

I have a persistent password recovery problem. Users cannot successfully reset their passwords because the application displays an invalid or expired recovery link error.

Current observed behavior

When I open a password reset email link, the browser redirects to a URL similar to:

http://localhost:3000/reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired

The application then displays:

Heading: Choose a new password

Error: This reset link is invalid or expired.

Action: Request a new reset link

Requesting another reset email has not resolved the issue.

Supabase dashboard configuration already checked

Authentication → URL Configuration:

Site URL: http://localhost:3000

Redirect URL allowlist: http://localhost:3000/**

Authentication → Emails → Templates → Reset password:

The default reset password template is enabled.

The subject is Reset your password.

The default template preview displays a Reset password link.

The Source editor is disabled because Supabase requires custom SMTP to edit the template source.

Do not configure custom SMTP merely to troubleshoot this issue. Do not assume the default email template is the cause.

Primary Objective

Perform a complete, evidence-based audit of the existing password recovery implementation, identify the actual root cause, implement the smallest secure fix, and verify the entire flow.

Do not simply change the displayed error message, suppress the error, or generate a replacement password.

Phase 1: Audit the Existing Authentication Architecture

Inspect the actual repository before making changes.

Locate and review:

The forgot-password page and form.

Every call to supabase.auth.resetPasswordForEmail().

The /reset-password page and its client/server components.

Supabase browser and server client initialization.

Authentication callback routes and middleware.

Existing auth utilities and session management.

Login, signup, logout, and password update implementations.

Environment variable names and redirect URL construction.

Existing authentication tests and test mocks.

Any redirects that modify, discard, or consume authentication callback parameters.

Search for duplicate password recovery implementations and conflicting redirect logic.

Before editing, provide a concise diagnosis based on the actual source code. Continue with the fix once sufficient evidence identifies the likely cause.

Phase 2: Investigate the Actual Failure

Explicitly investigate these possibilities:

Incorrect redirectTo values passed to resetPasswordForEmail().

Redirect URLs that do not match the configured allowlist.

Incorrect callback routes or redirects.

Recovery links being consumed more than once.

Token expiration or reuse caused by requesting multiple reset emails.

PKCE verifier or recovery session loss.

Incorrect handling of URL query parameters and URL fragments.

Confusion between Supabase token_hash verification and PKCE-based recovery.

Incorrect use of verifyOtp(), exchangeCodeForSession(), or setSession().

Session state not being established before the password update.

Middleware or server-side redirects interfering with recovery.

Multiple Supabase client instances with inconsistent storage or session behavior.

Client-side navigation removing authentication parameters before they are processed.

Incorrect callback behavior when the recovery link opens in a different browser context.

Incorrect use of window.location, router navigation, or callback URL parsing.

Recovery links being invalidated by another reset request.

Do not assume all these issues exist. Determine which, if any, are supported by the implementation and available evidence.

Use the Supabase SDK's supported recovery flow. Do not invent a custom authentication protocol.

Phase 3: Implement a Secure, Consistent Recovery Flow

Make the minimum necessary changes to support the following flow:

The user enters their registered email address.

The application requests a password reset through Supabase Auth.

The generated email link returns the user to the correct local recovery route.

The application processes the recovery callback using the flow supported by the existing Supabase configuration.

The recovery token is verified and the appropriate recovery session is established.

The user sees the new password form only when the recovery state is valid.

The user enters and confirms a new password.

The application validates the password according to the existing password policy.

The application calls the appropriate Supabase password update method.

Success is confirmed only after Supabase reports that the update succeeded.

The user receives a clear success message and can sign in with the new password.

Security requirements

Never accept an unverified recovery token.

Never bypass Supabase token validation.

Never allow password changes merely because the user opened /reset-password.

Never trust client-supplied user IDs to authorize password updates.

Never log or expose passwords, OTPs, recovery tokens, access tokens, refresh tokens, or session credentials.

Do not store recovery tokens in local storage, cookies created manually, application databases, analytics, or logs.

Do not create a public password-reset endpoint that can change another user's password.

Do not expose the Supabase service-role key in browser code.

Do not weaken existing authentication, authorization, RLS, or Super Admin protections.

Do not reveal whether an email address exists in the system.

Handle expired, invalid, reused, and malformed recovery links safely.

Use clear, user-friendly messages for expired links, invalid sessions, network errors, and successful password updates.

Do not mark a password reset as successful unless the actual password update succeeds.

Phase 4: Handle Recovery State Correctly

Review how the current implementation handles Supabase callback parameters.

Choose the correct flow based on the actual implementation:

If the project uses a PKCE recovery flow, preserve the required verifier and use the supported authorization-code exchange at the correct point in the callback.

If the project uses a token-hash flow, verify the appropriate recovery token hash with the correct OTP type.

If the project uses another supported Supabase recovery configuration, document why that flow is appropriate and implement it consistently.

Do not mix incompatible recovery flows.

Ensure the callback is processed once, in the correct order, and before navigation removes required parameters.

Account for React Strict Mode and component remounts where relevant. Prevent duplicate callback processing without introducing fragile global flags or permanently suppressing legitimate recovery attempts.

Do not replace a working auth architecture with an unnecessary new callback system.

Phase 5: Review Redirect and Environment Configuration

Use the existing project conventions and environment variable names.

Verify:

The configured Supabase project URL and public anon/publishable key are read correctly.

The password reset redirect points to the actual recovery route.

The redirect URL matches the configured Supabase allowlist.

Local development uses the expected local URL.

Production configuration can use its own explicitly configured URL.

Redirect URLs are not assembled from untrusted request parameters.

The default Supabase email template can work with the chosen supported recovery flow.

Do not print environment variable values, secrets, or tokens in logs or final output.

Do not change production dashboard settings automatically.

If a dashboard change is genuinely required, explain exactly what needs to be changed and why. Keep local and production configurations separate.

Phase 6: Improve the Password Reset UI

Preserve the existing ARAM BTS visual design.

The page should include:

ARAM BTS branding.

A new password field.

A confirm password field.

Show/hide password controls.

Password validation messages beside the relevant fields.

A clear submit button and loading state.

A clear recovery-session-expired state.

A button to request a new reset email.

A link back to sign in.

A success state after a confirmed password update.

Responsive behavior on mobile and desktop.

Accessible labels and keyboard navigation.

Use the existing password policy. Do not introduce arbitrary new complexity rules without checking the current implementation.

Do not display the password form as usable when no valid recovery session exists.

Avoid exposing raw Supabase error objects or sensitive callback parameters in the UI.

Phase 7: Add Regression Tests

Add or update tests using the repository's existing testing framework and conventions.

Cover at least these scenarios:

Reset email request succeeds.

Reset email request fails safely.

Correct redirect URL is supplied.

Valid recovery callback establishes the expected session.

Invalid token is rejected.

Expired token displays a recoverable error.

Reused recovery link is rejected safely.

Missing recovery session prevents password updates.

Valid recovery session permits a password update.

Password mismatch prevents submission.

Password validation errors are shown correctly.

Failed password updates do not display success.

Successful password updates display success.

Duplicate callback processing does not break recovery.

Normal login and signup remain functional.

Super Admin route authorization remains unchanged.

Sensitive credentials are never written to application logs.

Mock Supabase Auth appropriately for unit tests. Do not claim mocked tests prove that real email links work.

If a local Supabase integration test is possible, document the required environment and test it without affecting production users.

Phase 8: Verify the Implementation

Run the relevant checks available in the project:

Password recovery tests.

Existing authentication regression tests.

Super Admin tests.

npx tsc --noEmit

npm run build

Use the actual scripts defined in package.json. If a command does not exist, report that rather than pretending it passed.

Review the final changes for:

Unintended authentication changes.

Duplicate callback logic.

Unsafe redirects.

Secret exposure.

Type errors.

Broken login/signup behavior.

Inconsistent Supabase clients.

New lint or build issues.

If local Supabase or email delivery is unavailable, state that clearly and distinguish code-level verification from a real email-link test.

Phase 9: Manual Verification Instructions

After implementing the fix, give me exact step-by-step instructions to verify it:

Start the correct local Supabase and Next.js environments.

Open the ARAM BTS login page.

Request one password reset email.

Open the newest email.

Click the recovery link once.

Confirm the application reaches the recovery page without otp_expired.

Enter and confirm a new password.

Verify that Supabase confirms the password update.

Sign in using the new password.

Verify that the Super Admin panel remains protected and accessible only to a provisioned Super Admin account.

Explain any dashboard or email-provider steps that cannot be automated.

Constraints

Work in the existing ARAM BTS repository.

Inspect before modifying.

Keep the fix minimal, maintainable, and secure.

Reuse the existing Supabase clients and authentication architecture where appropriate.

Do not configure custom SMTP unless the root cause proves it is necessary.

Do not modify unrelated subscription, billing, workspace, event, or customer functionality.

Do not apply database migrations.

Do not run supabase db reset.

Do not modify production Supabase settings.

Do not deploy, commit, or push.

Do not claim that real email delivery or recovery has been verified unless it was actually tested.

Required Final Report

Provide:

Root cause identified, with references to the relevant files and functions.

Exact changes made.

List of files modified.

Tests executed and their actual results.

Whether a real password reset email was tested.

Any remaining blockers or manual dashboard actions.

Exact manual verification steps.

Any security limitations still present.

If the root cause cannot be confirmed, clearly state what evidence is missing. Do not invent a cause or apply speculative fixes.

Start by auditing the current implementation. Then fix the verified problem and run the available checks.