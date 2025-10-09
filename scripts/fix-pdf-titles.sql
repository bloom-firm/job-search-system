-- PDFファイル名と一致するようにタイトルを修正

-- 例: シニアPMOの求人
UPDATE jobs
SET title = 'シニアPMO・お客様のDXを推進＜ベトナム最大手IT企業の日本法人＞ ・FPTソフトウェアジャパン'
WHERE title LIKE '%シニアPMO%'
AND company_name LIKE '%FPT%';

-- 確認
SELECT id, title FROM jobs WHERE title LIKE '%シニアPMO%';
