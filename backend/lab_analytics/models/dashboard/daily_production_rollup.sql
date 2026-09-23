{{ config(materialized='table') }}

-- Aggregates production logs (Multiplication) by date, technician, and variety
SELECT 
    date,
    technician_id,
    variety_id,
    SUM(TRY_CAST(bottles_produced AS INT)) as total_bottles_produced,
    SUM(TRY_CAST(contaminated_bottles AS INT)) as total_contaminated_bottles
FROM read_csv_auto('../raw_data/multiplication_logs_*.csv', header=True)
GROUP BY 1, 2, 3
