## Overview

**Settings** (in the Admin section of the sidebar) configures how the app
works for your whole organization, not just for you — visible only to
users with the settings permission. It's split into eight sections down
the left side.

![The Settings page's General section, with App name, Company name, Support email, Contact phone, Address, Default currency, and Timezone](/docs-screenshots/company-settings/company-settings-01-general.png)

## General

Your organization's name (shown in the sidebar and browser tab), the
formal company details used on invoices and receipts, default currency,
and timezone.

## Branding & exports

Upload a logo and app icon, set primary and accent colors used throughout
the interface, and the header text stamped on every exported PDF and Excel
report.

![The Branding section, with logo and app icon uploads, primary/accent color pickers, and export header text](/docs-screenshots/company-settings/company-settings-02-branding.png)

## SMS

Connect an SMS provider (Africa's Talking) to send text messages — an API
username, key, and sender ID, plus a way to send a test message to confirm
it's working.

## Notifications

Controls which automated notifications (like rent reminders) are sent and
when.

## Billing & reminders

Rules around rent billing cycles and reminder timing.

## Codes

Every Property, Unit, Document, Expense, Income, Lease, and Receipt gets a
unique code when created (the `PROP-D00304`, `DOC-2026-0005`-style codes
you'll see throughout the app) — this is where their prefix and format
template are configured.

![The Codes section, listing a prefix and template for Properties, Units, Documents, Expenses, Income, Leases, and Receipts, each with a live preview](/docs-screenshots/company-settings/company-settings-06-codes.png)

## Compliance

A single toggle: whether tenant and landlord forms ask for TIN,
registration number, and identity-document type. This is purely for your
own record-keeping — it's not a live connection to any government system.

![The Compliance section, with a single "Enable compliance fields" toggle](/docs-screenshots/company-settings/company-settings-07-compliance.png)

## Trash & data

How long deleted records stay recoverable in every module's Trash tab
before a daily background job permanently erases them — 30 days by
default. This is why "Undo" and the Trash tab are described as reversible
throughout the rest of this documentation: reversible until this window
closes, not forever.

![The Trash & data section, with a "Permanently delete items after" dropdown set to 30 days](/docs-screenshots/company-settings/company-settings-08-trash-data.png)
