import documentCategories from '@/routes/extras/document-categories';
import expenseCategories from '@/routes/extras/expense-categories';
import incomeCategories from '@/routes/extras/income-categories';
import propertyFeatures from '@/routes/extras/property-features';
import unitTypes from '@/routes/extras/unit-types';
import type { ExtrasSection } from '@/types/extras';

/**
 * Every section's create/store/edit/update/destroy/restore/forceDelete
 * routes share the same shape but live in different Wayfinder modules (one
 * per Laravel route group) and bind on different parameter names
 * (category/amenity/unitType) — this normalizes them to a single `(id)`
 * signature so extras/index.tsx doesn't need a per-section switch.
 */
export function sectionRoutes(section: ExtrasSection) {
    switch (section) {
        case 'expense-categories':
            return withNumericId(expenseCategories);
        case 'income-categories':
            return withNumericId(incomeCategories);
        case 'document-categories':
            return withNumericId(documentCategories);
        case 'property-features':
            return withNumericId(propertyFeatures);
        case 'unit-types':
            return withNumericId(unitTypes);
    }
}

/**
 * The five imported route modules share this shape but TypeScript can't
 * unify their exact function types (each binds a differently-named route
 * parameter — category/amenity/unitType) — `any` here only weakens the
 * input side; the return type below stays fully typed.
 */
function withNumericId(mod: any) {
    return {
        create: (): string => mod.create().url,
        store: (): string => mod.store().url,
        edit: (id: number): string => mod.edit(id).url,
        update: (id: number): string => mod.update(id).url,
        destroy: (id: number): string => mod.destroy(id).url,
        restore: (id: number): string => mod.restore(id).url,
        forceDelete: (id: number): string => mod.forceDelete(id).url,
    };
}
