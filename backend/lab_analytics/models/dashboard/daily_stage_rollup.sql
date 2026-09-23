{{ config(materialized='table') }}

WITH initiation AS (
    SELECT 
        'Initiation' AS stage,
        TRY_CAST(date AS DATE) AS date,
        TRY_CAST(technician_id AS INT) AS technician_id,
        TRY_CAST(variety_id AS INT) AS variety_id,
        SUM(TRY_CAST(bottles_inoculated AS INT)) AS produced_count,
        SUM(TRY_CAST(contaminated_bottles AS INT)) AS lost_count
    FROM read_csv_auto('../raw_data/initiation_logs_raw.csv', header=True)
    GROUP BY 1, 2, 3, 4
),

multiplication AS (
    SELECT 
        'Multiplication' AS stage,
        TRY_CAST(date AS DATE) AS date,
        TRY_CAST(technician_id AS INT) AS technician_id,
        TRY_CAST(variety_id AS INT) AS variety_id,
        SUM(TRY_CAST(bottles_produced AS INT)) AS produced_count,
        SUM(TRY_CAST(contaminated_bottles AS INT)) AS lost_count
    FROM read_csv_auto('../raw_data/multiplication_logs_raw.csv', header=True)
    GROUP BY 1, 2, 3, 4
),

rooting AS (
    SELECT 
        'Rooting' AS stage,
        TRY_CAST(date AS DATE) AS date,
        TRY_CAST(technician_id AS INT) AS technician_id,
        TRY_CAST(variety_id AS INT) AS variety_id,
        SUM(TRY_CAST(basal_bottles AS INT) + TRY_CAST(rooting_bottles AS INT)) AS produced_count,
        SUM(TRY_CAST(contaminated_bottles AS INT)) AS lost_count
    FROM read_csv_auto('../raw_data/rooting_logs_raw.csv', header=True)
    GROUP BY 1, 2, 3, 4
),

hardening AS (
    SELECT 
        'Hardening' AS stage,
        TRY_CAST(date AS DATE) AS date,
        TRY_CAST(technician_id AS INT) AS technician_id,
        TRY_CAST(variety_id AS INT) AS variety_id,
        SUM(TRY_CAST(seedlings_transplanted AS INT)) AS produced_count,
        SUM(TRY_CAST(seedlings_died AS INT)) AS lost_count
    FROM read_csv_auto('../raw_data/hardening_logs_raw.csv', header=True)
    GROUP BY 1, 2, 3, 4
),

transplantation AS (
    SELECT 
        'Transplantation' AS stage,
        TRY_CAST(date AS DATE) AS date,
        TRY_CAST(technician_id AS INT) AS technician_id,
        TRY_CAST(variety_id AS INT) AS variety_id,
        SUM(TRY_CAST(seedlings_transplanted AS INT)) AS produced_count,
        SUM(TRY_CAST(seedlings_died AS INT)) AS lost_count
    FROM read_csv_auto('../raw_data/transplantation_logs_raw.csv', header=True)
    GROUP BY 1, 2, 3, 4
)

SELECT * FROM initiation
UNION ALL
SELECT * FROM multiplication
UNION ALL
SELECT * FROM rooting
UNION ALL
SELECT * FROM hardening
UNION ALL
SELECT * FROM transplantation
