-- companies_masterテーブルのJSONBカラム構造を確認

-- 1. サンプルデータを3件取得
SELECT
  id,
  company_name,
  basic_info,
  work_style,
  selection_process,
  recruitment_reality,
  internal_memo,
  ng_items,
  application_system,
  contract_info,
  target_details
FROM companies_master
LIMIT 3;

-- 2. basic_infoの詳細構造を確認
SELECT
  company_name,
  jsonb_pretty(basic_info) as basic_info_formatted
FROM companies_master
WHERE basic_info IS NOT NULL
LIMIT 3;

-- 3. work_styleの詳細構造を確認
SELECT
  company_name,
  jsonb_pretty(work_style) as work_style_formatted
FROM companies_master
WHERE work_style IS NOT NULL
LIMIT 3;

-- 4. selection_processの詳細構造を確認
SELECT
  company_name,
  jsonb_pretty(selection_process) as selection_process_formatted
FROM companies_master
WHERE selection_process IS NOT NULL
LIMIT 3;

-- 5. recruitment_realityの詳細構造を確認
SELECT
  company_name,
  jsonb_pretty(recruitment_reality) as recruitment_reality_formatted
FROM companies_master
WHERE recruitment_reality IS NOT NULL
LIMIT 3;

-- 6. internal_memoの詳細構造を確認
SELECT
  company_name,
  jsonb_pretty(internal_memo) as internal_memo_formatted
FROM companies_master
WHERE internal_memo IS NOT NULL
LIMIT 3;

-- 7. contract_infoの詳細構造を確認
SELECT
  company_name,
  jsonb_pretty(contract_info) as contract_info_formatted
FROM companies_master
WHERE contract_info IS NOT NULL
LIMIT 3;

-- 8. 全JSONBカラムのキー一覧を確認
SELECT DISTINCT
  jsonb_object_keys(basic_info) as basic_info_keys
FROM companies_master
WHERE basic_info IS NOT NULL;

SELECT DISTINCT
  jsonb_object_keys(work_style) as work_style_keys
FROM companies_master
WHERE work_style IS NOT NULL;

SELECT DISTINCT
  jsonb_object_keys(selection_process) as selection_process_keys
FROM companies_master
WHERE selection_process IS NOT NULL;

SELECT DISTINCT
  jsonb_object_keys(recruitment_reality) as recruitment_reality_keys
FROM companies_master
WHERE recruitment_reality IS NOT NULL;

SELECT DISTINCT
  jsonb_object_keys(internal_memo) as internal_memo_keys
FROM companies_master
WHERE internal_memo IS NOT NULL;

SELECT DISTINCT
  jsonb_object_keys(contract_info) as contract_info_keys
FROM companies_master
WHERE contract_info IS NOT NULL;
