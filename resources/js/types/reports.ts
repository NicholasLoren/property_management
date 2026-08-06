export type ReportSummary = {
    rent_collected: string;
    other_income: string;
    total_expense: string;
    net_income: string;
    total_units: number;
    occupied_units: number;
    occupancy_rate: number;
    expected_monthly_rent: string;
    maintenance_open: number;
    maintenance_completed_cost: string;
};

export type ReportPropertyRow = {
    property_name: string;
    rent_collected: string;
    other_income: string;
    total_expense: string;
    net_income: string;
    occupancy_rate: number;
    maintenance_open: number;
};
