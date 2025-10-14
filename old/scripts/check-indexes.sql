-- jobsテーブルのインデックス状況を確認するSQL

-- 1. jobsテーブルの全インデックス一覧
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'jobs'
ORDER BY indexname;

-- 2. インデックスのサイズ確認
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'jobs'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- 3. トリグラムインデックスの存在確認
SELECT
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'jobs'
AND indexname LIKE '%trgm%'
ORDER BY indexname;

-- 4. pg_trgm拡張機能が有効かどうか確認
SELECT
    extname,
    extversion
FROM pg_extension
WHERE extname = 'pg_trgm';

-- 5. インデックスの使用状況統計（もし利用可能な場合）
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'jobs'
ORDER BY idx_scan DESC;
