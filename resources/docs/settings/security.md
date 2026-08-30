## Overview

**Account settings → Security** covers your password and two-factor
authentication (2FA). Opening it for the first time in a session asks you to
[confirm your password](/docs/authentication/confirm-password) before
showing anything.

![The Security settings page, with an Update password card and a Two-factor authentication card](/docs-screenshots/settings/security-01-overview.png)

## Changing your password

Fill in your current password, then a new one twice, and click **Save**.

- Wrong current password:

  ![The security page showing "The password is incorrect." under the current password field](/docs-screenshots/settings/security-02-password-invalid.png)

- Correct current password: a "Password updated." confirmation appears:

  ![The security page after a successful password change, with a "Password updated." toast](/docs-screenshots/settings/security-03-password-success.png)

## Turning on two-factor authentication

Click **Enable 2FA**. A dialog shows a QR code plus the same secret as text,
for authenticator apps that can't scan.

![The two-factor setup dialog with a QR code and a manual setup key](/docs-screenshots/settings/security-04-2fa-setup.png)

Scan the QR code (or type the key in manually) with an authenticator app:
Google Authenticator, 1Password, Authy, and similar all work. Click
**Continue**, then enter the 6-digit code the app is now showing.

![The two-factor setup dialog's verification step with a 6-digit code entered](/docs-screenshots/settings/security-05-2fa-verify.png)

Click **Confirm**. 2FA is now active on your account; every future sign-in
will ask for a code, as covered in
[Two-factor authentication](/docs/authentication/two-factor). The page now
shows a **Disable 2FA** button and a recovery codes section.

![The Security page after 2FA is enabled, showing a Disable 2FA button and a 2FA recovery codes card](/docs-screenshots/settings/security-06-2fa-enabled.png)

## Saving your recovery codes

Click **View recovery codes** to reveal a set of one-time codes; save these
somewhere safe (a password manager, not your inbox). Each one gets you past
the two-factor challenge exactly once if you lose access to your
authenticator app. **Regenerate codes** invalidates the old set and issues a
new one.

![The recovery codes list revealed, with a Regenerate codes button](/docs-screenshots/settings/security-07-recovery-codes.png)

## Turning it off

Click **Disable 2FA** on the same page. This removes the requirement
immediately; no confirmation code needed, since you're already signed in
with a confirmed password.
