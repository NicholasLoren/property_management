## Overview

Roles define exactly what a user can see and do, permission by permission
— not just a fixed set of tiers. Every user has exactly one role.

## Viewing roles

**Roles** lists every role and how many users currently have it.

![The Roles list, showing role name, description, and user count](/docs-screenshots/roles/roles-01-index.png)

## Adding a role

Click **Add role**, then name it and check off exactly the permissions it
should grant.

![The empty Add role form: Name, Description, and a grid of permission checkboxes grouped by module](/docs-screenshots/roles/roles-02-create-empty.png)

Permissions are grouped by module (Documents, Expenses, Leases,
Maintenance, Payments, Properties, Users, and so on), each with its own
Add/Edit/Delete/View checkboxes so access can be scoped down to individual
actions — for example, a role that can record payments but not delete them.
**Select all** grants everything at once.

![The form filled in with a name, description, and several permissions checked across different modules](/docs-screenshots/roles/roles-03-create-filled.png)

Click **Add role**.

![The roles list after adding one, showing a confirmation](/docs-screenshots/roles/roles-04-created.png)

## Editing or removing a role

Click a role to change its name or permissions — changes apply immediately
to everyone with that role. The trash icon moves it to the trash, reversible
via **Undo** immediately after or from the Trash tab later. A role still
assigned to any user can't be deleted at all — reassign those users to a
different role first. A handful of built-in system roles can't be deleted
regardless.
