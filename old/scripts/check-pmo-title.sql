-- PMOタイトルの確認
SELECT
  id,
  title,
  company_name,
  LENGTH(title) as title_length,
  encode(title::bytea, 'hex') as title_hex
FROM jobs
WHERE title LIKE '%PMO%'
AND company_name LIKE '%FPT%'
LIMIT 5;
