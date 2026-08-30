## Overview

The app is invite-only; there's no public sign-up. An administrator creates
your account from **Users → Invite user**, and you sign in from the login
page at `/login` using the email and password you were given (or set during
account setup).

## Step 1: Open the login page

Go to `/login`. You'll see a two-column screen: your organization's branding
and value proposition on the left, and the sign-in form on the right.

![The empty login form, with email and password fields, a "Remember me" checkbox, a "Forgot password?" link, and a Sign in button](/docs-screenshots/authentication/login-01-empty.png)

## Step 2: Enter your credentials

Fill in:

- **Email address**: the email your administrator invited you with.
- **Password**: your account password.

Optionally check **Remember me** to stay signed in on this device between
browser sessions.

![The login form filled in with an email address and a masked password](/docs-screenshots/authentication/login-02-filled.png)

## Step 3: Sign in

Click **Sign in**. What happens next depends on whether your credentials are
correct:

- **Incorrect email or password**: the form re-displays with an inline
  error under the email field: "These credentials do not match our records."
  Nothing is submitted until this is resolved.

  ![The login form showing a validation error: "These credentials do not match our records."](/docs-screenshots/authentication/login-03-invalid.png)

- **Correct credentials**: you're redirected straight to your **Dashboard**,
  which shows your portfolio's key numbers (net profit, income, expenses,
  arrears) and charts for the current period.

  ![The Dashboard after a successful login, showing summary cards and charts](/docs-screenshots/authentication/login-04-dashboard.png)

If your account has two-factor authentication enabled, you'll be asked for a
verification code after this step instead of going straight to the
dashboard; see [Two-factor authentication](/docs/authentication/two-factor)
for that flow.

## Forgotten your password?

Click **Forgot password?** next to the password field on the login form to
start a password reset; see
[Resetting a forgotten password](/docs/authentication/reset-password) for
the step-by-step.
