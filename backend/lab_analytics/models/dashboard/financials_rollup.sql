{{ config(materialized='table') }}

WITH expenses AS (
    SELECT 
        TRY_CAST(date AS DATE) AS date,
        SUM(TRY_CAST(amount AS DOUBLE)) AS total_expenses
    FROM read_csv_auto('../raw_data/expenses_raw.csv', header=True)
    GROUP BY 1
),

chemical_usages AS (
    SELECT 
        TRY_CAST(date AS DATE) AS date,
        SUM(TRY_CAST(quantity_consumed AS DOUBLE) * TRY_CAST(unit_price AS DOUBLE)) AS total_chemical_cost
    FROM read_csv_auto('../raw_data/chemical_usages_raw.csv', header=True)
    GROUP BY 1
),

all_dates AS (
    SELECT date FROM expenses
    UNION
    SELECT date FROM chemical_usages
)

SELECT 
    d.date,
    COALESCE(e.total_expenses, 0.0) AS total_expenses,
    COALESCE(c.total_chemical_cost, 0.0) AS total_chemical_cost,
    COALESCE(e.total_expenses, 0.0) + COALESCE(c.total_chemical_cost, 0.0) AS total_cost
FROM all_dates d
LEFT JOIN expenses e ON d.date = e.date
LEFT JOIN chemical_usages c ON d.date = c.date
