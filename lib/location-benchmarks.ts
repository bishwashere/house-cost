// Historical benchmarks, not quotes or statutory tax rates. Retrieved 2026-10-14.
// BEA SARPP, all-items regional price parity, 2024 (US = 100):
// https://apps.bea.gov/regional/zip/SARPP.zip
// https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area
export const statePriceIndex: Record<string, number> = {"AL": 88.823, "AK": 102.359, "AZ": 100.677, "AR": 86.937, "CA": 110.72, "CO": 103.052, "CT": 103.61, "DE": 99.808, "DC": 109.901, "FL": 103.414, "GA": 96.293, "HI": 109.951, "ID": 95.494, "IL": 99.958, "IN": 93.329, "IA": 87.762, "KS": 90.068, "KY": 90.159, "LA": 88.207, "ME": 97.05, "MD": 104.959, "MA": 105.757, "MI": 96.217, "MN": 98.621, "MS": 86.953, "MO": 90.817, "MT": 94.645, "NE": 90.103, "NV": 99.979, "NH": 104.165, "NJ": 108.805, "NM": 92.212, "NY": 107.921, "NC": 94.326, "ND": 88.959, "OH": 92.774, "OK": 87.843, "OR": 103.361, "PA": 97.572, "RI": 102.28, "SC": 93.749, "SD": 88.586, "TN": 91.87, "TX": 97.057, "UT": 98.864, "VT": 97.958, "VA": 101.104, "WA": 107.013, "WV": 89.497, "WI": 94.095, "WY": 92.691};

// Tax Foundation calculations from Census ACS B25082/B25090, 2024.
// Table 2: taxes paid / owner-occupied housing value, not a new purchase assessment.
// https://taxfoundation.org/data/all/state/property-taxes-by-state-county/
export const stateTaxRate: Record<string, number> = {"AL": 0.37, "AK": 0.94, "AZ": 0.48, "AR": 0.56, "CA": 0.7, "CO": 0.5, "CT": 1.54, "DE": 0.54, "DC": 0.6, "FL": 0.78, "GA": 0.79, "HI": 0.29, "ID": 0.5, "IL": 1.88, "IN": 0.76, "IA": 1.33, "KS": 1.21, "KY": 0.74, "LA": 0.55, "ME": 0.98, "MD": 0.92, "MA": 1.0, "MI": 1.19, "MN": 1.0, "MS": 0.58, "MO": 0.89, "MT": 0.61, "NE": 1.44, "NV": 0.5, "NH": 1.5, "NJ": 1.88, "NM": 0.63, "NY": 1.3, "NC": 0.66, "ND": 0.92, "OH": 1.36, "OK": 0.79, "OR": 0.81, "PA": 1.26, "RI": 1.12, "SC": 0.49, "SD": 1.0, "TN": 0.52, "TX": 1.4, "UT": 0.48, "VT": 1.51, "VA": 0.78, "WA": 0.75, "WV": 0.51, "WI": 1.32, "WY": 0.53};
