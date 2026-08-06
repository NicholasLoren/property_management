/** Formats an amount with the company's configured currency code, e.g. "UGX 1,850". */
export function formatCurrency(amount: number | string, currency: string): string {
    return `${currency} ${Number(amount).toLocaleString()}`;
}
