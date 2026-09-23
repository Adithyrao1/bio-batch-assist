{{ config(materialized='table') }}

SELECT 
    TRY_CAST(id AS INT) AS id,
    code
FROM read_csv_auto('../raw_data/varieties_raw.csv', header=True)
