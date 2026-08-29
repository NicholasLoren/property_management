## Overview

If two-factor authentication (2FA) is turned on for your account (from
**Account settings → Security → Enable 2FA**), signing in takes one extra
step after your email and password are accepted.

## Step 1: Enter your authentication code

After a successful email/password sign-in, you're shown a 6-digit code
entry screen instead of going straight to the dashboard.

![The two-factor authentication challenge, showing a 6-box code entry field](/docs-screenshots/authentication/two-factor-01-empty.png)

Open your authenticator app (the one you scanned a QR code into when you
enabled 2FA) and type the current 6-digit code it shows.

![The code entry field filled in with a 6-digit code](/docs-screenshots/authentication/two-factor-02-filled.png)

Click **Continue**. An incorrect or expired code re-displays the form with
an error — codes refresh every 30 seconds, so if yours was rejected, use the
next one your app shows.

![The two-factor challenge showing a validation error for an invalid code](/docs-screenshots/authentication/two-factor-03-invalid.png)

A correct code takes you to your dashboard, the same as a normal sign-in.

## Lost access to your authenticator?

Click **login using a recovery code** below the code field. Each account
with 2FA enabled has a set of one-time recovery codes generated when it was
turned on — enter one of those instead.

![The recovery code entry screen, with a single text field for the code](/docs-screenshots/authentication/two-factor-04-recovery.png)

Each recovery code works once. If you've used them all, ask an administrator
to disable and re-enable 2FA on your account so a fresh set is generated.
