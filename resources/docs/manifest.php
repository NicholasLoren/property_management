<?php

// Table of contents for the /docs module. Each module maps to a
// resources/docs/{module}/{page}.md file. Add pages here as they're written.

return [
    [
        'slug' => 'authentication',
        'title' => 'Authentication',
        'description' => 'Signing in and keeping your account secure.',
        'pages' => [
            ['slug' => 'login', 'title' => 'Logging in'],
            ['slug' => 'reset-password', 'title' => 'Resetting a forgotten password'],
            ['slug' => 'two-factor', 'title' => 'Two-factor authentication'],
            ['slug' => 'confirm-password', 'title' => 'Confirming your password'],
        ],
    ],
    [
        'slug' => 'dashboard',
        'title' => 'Dashboard',
        'description' => 'Your portfolio at a glance.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Dashboard overview'],
        ],
    ],
    [
        'slug' => 'settings',
        'title' => 'Account settings',
        'description' => 'Your own profile, password, 2FA, and theme.',
        'pages' => [
            ['slug' => 'profile', 'title' => 'Profile'],
            ['slug' => 'security', 'title' => 'Security & two-factor authentication'],
            ['slug' => 'appearance', 'title' => 'Appearance'],
        ],
    ],
    [
        'slug' => 'landlords',
        'title' => 'Landlords',
        'description' => 'The property owners you manage on behalf of.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Viewing and adding landlords'],
        ],
    ],
    [
        'slug' => 'properties',
        'title' => 'Properties',
        'description' => 'The buildings and houses you manage.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Adding and managing properties'],
        ],
    ],
    [
        'slug' => 'units',
        'title' => 'Units',
        'description' => 'The individual rentable spaces within a property.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Adding and managing units'],
        ],
    ],
    [
        'slug' => 'leases',
        'title' => 'Leases',
        'description' => 'Tenancy agreements, rent terms, and e-signing.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Adding, signing, and managing leases'],
            ['slug' => 'tenant-signing', 'title' => 'What a tenant sees when signing remotely'],
        ],
    ],
    [
        'slug' => 'tenants',
        'title' => 'Tenants',
        'description' => 'The people and companies who rent from you.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Adding and managing tenants'],
        ],
    ],
    [
        'slug' => 'maintenance',
        'title' => 'Maintenance',
        'description' => 'Repair and upkeep requests for your units.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Adding and managing requests'],
        ],
    ],
    [
        'slug' => 'documents',
        'title' => 'Documents',
        'description' => 'Contracts, certificates, and files on record.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Uploading and managing documents'],
        ],
    ],
    [
        'slug' => 'messages',
        'title' => 'Messages',
        'description' => 'In-app messages and broadcasts between users.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Sending personal messages and broadcasts'],
        ],
    ],
    [
        'slug' => 'notifications',
        'title' => 'Notifications',
        'description' => 'System alerts addressed to you.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Checking and clearing notifications'],
        ],
    ],
    [
        'slug' => 'payments',
        'title' => 'Payments',
        'description' => 'Rent received against a lease\'s schedule.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Recording and managing payments'],
        ],
    ],
    [
        'slug' => 'incomes',
        'title' => 'Income',
        'description' => 'Non-rent income across your portfolio.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Recording and managing income'],
        ],
    ],
    [
        'slug' => 'expenses',
        'title' => 'Expenses',
        'description' => 'Costs across your portfolio.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Recording and managing expenses'],
        ],
    ],
    [
        'slug' => 'financials',
        'title' => 'Financials',
        'description' => 'Portfolio-wide financial and occupancy performance.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Reading the Financials dashboard'],
        ],
    ],
    [
        'slug' => 'reports',
        'title' => 'Reports',
        'description' => 'Pre-built, downloadable reports.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Running and exporting reports'],
        ],
    ],
    [
        'slug' => 'users',
        'title' => 'Users',
        'description' => 'Staff and landlord accounts.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Inviting and managing users'],
        ],
    ],
    [
        'slug' => 'roles',
        'title' => 'Roles',
        'description' => 'Permission-based access control.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Creating and managing roles'],
        ],
    ],
    [
        'slug' => 'company-settings',
        'title' => 'Company Settings',
        'description' => 'Organization-wide configuration.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Configuring your organization'],
        ],
    ],
    [
        'slug' => 'extras',
        'title' => 'Extras',
        'description' => 'Categories, unit types, and property features.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Managing categories and lists'],
        ],
    ],
    [
        'slug' => 'logs',
        'title' => 'Activity Log',
        'description' => 'A permanent audit trail of every action taken.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Reading the activity log'],
        ],
    ],
    [
        'slug' => 'search',
        'title' => 'Global Search',
        'description' => 'Search across your whole portfolio at once.',
        'pages' => [
            ['slug' => 'overview', 'title' => 'Searching across the app'],
        ],
    ],
];
