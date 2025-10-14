-- FPTソフトウェアジャパンの求人タイトルを詳細確認

SELECT
  id,
  title,
  company_name,
  LENGTH(title) as title_length,
  POSITION('.pdf' IN title) as pdf_position,
  POSITION('.PDF' IN title) as PDF_position
FROM jobs
WHERE company_name LIKE '%FPTソフトウェアジャパン%'
OR company_name LIKE '%FPT%'
ORDER BY title;

-- タイトルに「東京」と「pdf」の両方が含まれる求人
SELECT
  id,
  title,
  company_name
FROM jobs
WHERE (company_name LIKE '%FPT%')
AND (title LIKE '%東京%')
ORDER BY title;
