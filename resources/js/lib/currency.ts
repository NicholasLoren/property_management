/** Formats an amount with the company's configured currency code, e.g. "UGX 1,850". */
export function formatCurrency(
    amount: number | string,
    currency: string,
): string {
    return `${currency} ${Number(amount).toLocaleString()}`;
}

/**
 * A short form for tight spaces — chart bar-end labels, stat deltas — e.g.
 * "UGX 1.4M" instead of "UGX 1,354,041". Full precision still belongs in the
 * tooltip or table, never gated behind this.
 */
export function formatCurrencyCompact(
    amount: number | string,
    currency: string,
): string {
    const compact = new Intl.NumberFormat(undefined, {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(amount));

    return `${currency} ${compact}`;
}
