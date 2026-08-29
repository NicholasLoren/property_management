## Overview

A handful of sensitive screens — **Account settings → Security** is one —
ask you to re-enter your password before showing them, even though you're
already signed in. This protects those settings if you've stepped away from
an unlocked device.

## Step 1: The confirmation prompt

Navigating to a protected screen shows a single password field instead of
the page you asked for.

![The confirm password page, showing a description and a single password field](/docs-screenshots/authentication/confirm-01-empty.png)

## Step 2: Enter your password

Type your current account password and click **Confirm password**.

- **Wrong password** — the form re-displays with "The provided password was
  incorrect." Nothing else happens until this is resolved.

  ![The confirm password page showing a validation error: "The provided password was incorrect."](/docs-screenshots/authentication/confirm-02-invalid.png)

- **Correct password** — you're taken straight through to the page you
  originally asked for.

  ![Account settings → Security, reached after confirming your password](/docs-screenshots/authentication/confirm-03-success.png)

This confirmation is remembered for a few hours, so you won't be asked again
immediately if you revisit the same area shortly after.
