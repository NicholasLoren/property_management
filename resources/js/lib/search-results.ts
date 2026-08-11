import {
    Banknote,
    Building2,
    DoorOpen,
    FileText,
    History,
    IdCard,
    KeyRound,
    TrendingDown,
    TrendingUp,
    Users as UsersIcon,
    Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type SearchResultType =
    | 'property'
    | 'unit'
    | 'tenant'
    | 'landlord'
    | 'user'
    | 'lease'
    | 'payment'
    | 'expense'
    | 'income'
    | 'maintenance'
    | 'document';

export type SearchResult = {
    type: SearchResultType;
    id: number;
    title: string;
    subtitle: string | null;
    url: string;
};

export const SEARCH_SECTION_META: Record<
    SearchResultType,
    { label: string; icon: ComponentType<{ className?: string }> }
> = {
    property: { label: 'Properties', icon: Building2 },
    unit: { label: 'Units', icon: DoorOpen },
    tenant: { label: 'Tenants', icon: UsersIcon },
    landlord: { label: 'Landlords', icon: KeyRound },
    user: { label: 'Users', icon: IdCard },
    lease: { label: 'Leases', icon: History },
    payment: { label: 'Payments', icon: Banknote },
    expense: { label: 'Expenses', icon: TrendingDown },
    income: { label: 'Income', icon: TrendingUp },
    maintenance: { label: 'Maintenance', icon: Wrench },
    document: { label: 'Documents', icon: FileText },
};

export const SEARCH_SECTION_ORDER: SearchResultType[] = [
    'property',
    'unit',
    'tenant',
    'landlord',
    'user',
    'lease',
    'payment',
    'expense',
    'income',
    'maintenance',
    'document',
];
