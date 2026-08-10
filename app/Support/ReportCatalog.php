<?php

namespace App\Support;

/**
 * Static metadata for every report on the /reports catalog page — title,
 * description, the icon key the frontend maps to a lucide icon, which
 * category it's grouped under, and whether it takes a from/to date filter
 * (a point-in-time snapshot report, like Vacancies, doesn't). ReportController
 * looks a slug up here for its title/description and to validate the
 * {type} route param; the actual query per slug lives in ReportController.
 */
class ReportCatalog
{
    /**
     * @return array<int, array{category: string, items: array<int, array{slug: string, title: string, description: string, icon: string, date_filter: bool}>}>
     */
    public static function grouped(): array
    {
        return collect(self::definitions())
            ->map(fn (array $definition, string $slug): array => [...$definition, 'slug' => $slug])
            ->groupBy('category')
            ->map(fn ($items, $category): array => ['category' => (string) $category, 'items' => $items->values()->all()])
            ->values()
            ->all();
    }

    /**
     * @return array<string, array{category: string, title: string, description: string, icon: string, date_filter: bool}>
     */
    public static function definitions(): array
    {
        return [
            'income' => [
                'category' => 'Financial',
                'title' => 'Income Report',
                'description' => 'All income received, grouped by category',
                'icon' => 'ArrowDown',
                'date_filter' => true,
            ],
            'expense' => [
                'category' => 'Financial',
                'title' => 'Expense Report',
                'description' => 'All expenses paid, grouped by category',
                'icon' => 'ArrowUp',
                'date_filter' => true,
            ],
            'profit-loss' => [
                'category' => 'Financial',
                'title' => 'Profit & Loss',
                'description' => 'Income vs expenses by category, with net profit',
                'icon' => 'Scale',
                'date_filter' => true,
            ],
            'rent-collection' => [
                'category' => 'Financial',
                'title' => 'Rent Collection',
                'description' => 'Rent billed vs collected per property',
                'icon' => 'Percent',
                'date_filter' => true,
            ],
            'rent-arrears' => [
                'category' => 'Balances',
                'title' => 'Rent Arrears',
                'description' => 'Outstanding balances grouped by tenant status',
                'icon' => 'AlertTriangle',
                'date_filter' => false,
            ],
            'advance-payments' => [
                'category' => 'Balances',
                'title' => 'Advance Payments',
                'description' => 'Tenants who have prepaid future rent',
                'icon' => 'CheckSquare',
                'date_filter' => false,
            ],
            'tenant-roster' => [
                'category' => 'Tenants',
                'title' => 'Tenant Roster',
                'description' => 'All active tenants with lease and contact details',
                'icon' => 'Users',
                'date_filter' => false,
            ],
            'new-residents' => [
                'category' => 'Tenants',
                'title' => 'New Residents',
                'description' => 'Tenants who moved in during the selected period',
                'icon' => 'UserPlus',
                'date_filter' => true,
            ],
            'expiring-leases' => [
                'category' => 'Tenants',
                'title' => 'Expiring Leases',
                'description' => 'Fixed leases ending soon — act before they lapse',
                'icon' => 'Hourglass',
                'date_filter' => false,
            ],
            'vacancies' => [
                'category' => 'Property',
                'title' => 'Vacancies',
                'description' => 'Empty units and the rent they could earn',
                'icon' => 'DoorOpen',
                'date_filter' => false,
            ],
            'deposits' => [
                'category' => 'Property',
                'title' => 'Deposit Report',
                'description' => 'Deposit status across all tenants',
                'icon' => 'ShieldCheck',
                'date_filter' => false,
            ],
        ];
    }
}
