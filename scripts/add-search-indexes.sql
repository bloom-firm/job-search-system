-- フリーワード検索のパフォーマンス改善用インデックス
-- pg_trgm拡張機能を使用したトリグラムインデックス

-- pg_trgm拡張機能を有効化（まだ有効化されていない場合）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 各カラムにトリグラムインデックスを作成
-- これによりLIKE検索（%keyword%）のパフォーマンスが向上します

-- 職種名のインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);

-- 企業名のインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_company_name_trgm ON jobs USING gin (company_name gin_trgm_ops);

-- 職務内容のインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_description_trgm ON jobs USING gin (description gin_trgm_ops);

-- 必須要件のインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_requirements_trgm ON jobs USING gin (requirements gin_trgm_ops);

-- 歓迎スキルのインデックス（NULLを許容）
CREATE INDEX IF NOT EXISTS idx_jobs_preferred_skills_trgm ON jobs USING gin (preferred_skills gin_trgm_ops);

-- 勤務地のインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_location_trgm ON jobs USING gin (location gin_trgm_ops);

-- 職種タイプのインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_job_type_trgm ON jobs USING gin (job_type gin_trgm_ops);

-- 業界カテゴリのインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_industry_category_trgm ON jobs USING gin (industry_category gin_trgm_ops);

-- 雇用形態のインデックス
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type_trgm ON jobs USING gin (employment_type gin_trgm_ops);

-- 元のMarkdown内容のインデックス（最重要：文字数が多いため）
CREATE INDEX IF NOT EXISTS idx_jobs_original_md_content_trgm ON jobs USING gin (original_md_content gin_trgm_ops);

-- インデックス作成完了
COMMENT ON INDEX idx_jobs_title_trgm IS 'フリーワード検索用トリグラムインデックス（職種名）';
COMMENT ON INDEX idx_jobs_company_name_trgm IS 'フリーワード検索用トリグラムインデックス（企業名）';
COMMENT ON INDEX idx_jobs_description_trgm IS 'フリーワード検索用トリグラムインデックス（職務内容）';
COMMENT ON INDEX idx_jobs_requirements_trgm IS 'フリーワード検索用トリグラムインデックス（必須要件）';
COMMENT ON INDEX idx_jobs_preferred_skills_trgm IS 'フリーワード検索用トリグラムインデックス（歓迎スキル）';
COMMENT ON INDEX idx_jobs_location_trgm IS 'フリーワード検索用トリグラムインデックス（勤務地）';
COMMENT ON INDEX idx_jobs_job_type_trgm IS 'フリーワード検索用トリグラムインデックス（職種タイプ）';
COMMENT ON INDEX idx_jobs_industry_category_trgm IS 'フリーワード検索用トリグラムインデックス（業界）';
COMMENT ON INDEX idx_jobs_employment_type_trgm IS 'フリーワード検索用トリグラムインデックス（雇用形態）';
COMMENT ON INDEX idx_jobs_original_md_content_trgm IS 'フリーワード検索用トリグラムインデックス（元のMarkdown内容・最重要）';

-- インデックスのサイズを確認
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'jobs'
AND indexname LIKE '%trgm%'
ORDER BY indexname;
