-- Create companies_master table
CREATE TABLE IF NOT EXISTS companies_master (
  id BIGSERIAL PRIMARY KEY,
  company_name TEXT UNIQUE NOT NULL,
  official_name TEXT,
  founded TEXT,
  headquarters TEXT,
  employees TEXT,
  listing_status TEXT,
  business_description TEXT,
  location TEXT,
  work_format TEXT,
  annual_holidays TEXT,
  benefits TEXT,
  confidential_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on company_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_master_company_name ON companies_master(company_name);

-- Create index on listing_status for filtering
CREATE INDEX IF NOT EXISTS idx_companies_master_listing_status ON companies_master(listing_status);

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_master_updated_at BEFORE UPDATE
    ON companies_master FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE companies_master IS '企業マスターテーブル';
COMMENT ON COLUMN companies_master.company_name IS '企業名（ユニーク）';
COMMENT ON COLUMN companies_master.official_name IS '正式企業名';
COMMENT ON COLUMN companies_master.founded IS '設立年月';
COMMENT ON COLUMN companies_master.headquarters IS '本社所在地';
COMMENT ON COLUMN companies_master.employees IS '従業員数';
COMMENT ON COLUMN companies_master.listing_status IS '上場区分';
COMMENT ON COLUMN companies_master.business_description IS '事業内容';
COMMENT ON COLUMN companies_master.location IS '勤務地';
COMMENT ON COLUMN companies_master.work_format IS '勤務形態';
COMMENT ON COLUMN companies_master.annual_holidays IS '年間休日数';
COMMENT ON COLUMN companies_master.benefits IS '福利厚生';
COMMENT ON COLUMN companies_master.confidential_data IS '社外秘情報（JSON）';
