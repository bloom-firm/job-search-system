-- 求人票のPDFファイル名問題を調査

-- 1. FPTソフトウェアジャパンのサンプルデータを確認
SELECT
  id,
  title,
  company_name,
  CASE
    WHEN title LIKE '%.pdf%' THEN 'PDFタイトル'
    ELSE '通常タイトル'
  END as title_type,
  LEFT(requirements, 100) as requirements_preview,
  LEFT(description, 100) as description_preview
FROM jobs
WHERE company_name LIKE '%FPTソフトウェアジャパン%'
LIMIT 5;

-- 2. PDFファイル名を含む求人を全件確認
SELECT id, title, company_name
FROM jobs
WHERE title LIKE '%.pdf%' OR title LIKE '%.PDF%'
ORDER BY company_name, title;

-- 3. PDFファイル名を含む求人の件数
SELECT
  COUNT(*) as pdf_title_count,
  COUNT(DISTINCT company_name) as affected_companies
FROM jobs
WHERE title LIKE '%.pdf%' OR title LIKE '%.PDF%';

-- 4. 企業別のPDF問題件数
SELECT
  company_name,
  COUNT(*) as pdf_count
FROM jobs
WHERE title LIKE '%.pdf%' OR title LIKE '%.PDF%'
GROUP BY company_name
ORDER BY pdf_count DESC;

-- 5. タイトルのパターン分析
SELECT
  CASE
    WHEN title LIKE '%.pdf%' THEN 'Contains .pdf'
    WHEN title LIKE '%.PDF%' THEN 'Contains .PDF'
    WHEN title ~ '^[0-9]+\.pdf' THEN 'Starts with number.pdf'
    WHEN title ~ '\.pdf$' THEN 'Ends with .pdf'
    ELSE 'Normal'
  END as pattern,
  COUNT(*) as count
FROM jobs
GROUP BY pattern
ORDER BY count DESC;

-- 6. サンプル：PDFタイトルの実例
SELECT
  title,
  company_name,
  created_at
FROM jobs
WHERE title LIKE '%.pdf%' OR title LIKE '%.PDF%'
LIMIT 20;
