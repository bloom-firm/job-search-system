import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const RAW_DIR = path.join(process.cwd(), 'src/data/companies/raw')
const PROCESSED_DIR = path.join(process.cwd(), 'src/data/companies/processed')

interface CompanyData {
  company_name: string
  public: {
    basic_info: {
      official_name: string
      founded: string
      headquarters: string
      employees: string
      business_description: string
    }
    work_style: {
      work_format: string
      annual_holidays: string
      benefits: string
    }
  }
  confidential: {
    selection_process: Record<string, any>
    recruitment_reality: Record<string, any>
    internal_memo: Record<string, any>
    ng_items: Record<string, any>
    application_system: Record<string, any>
    contract_info: Record<string, any>
    target_details: Record<string, any>
  }
}

async function parseRawFile(filename: string, content: string): Promise<CompanyData> {
  const companyName = filename.replace('.txt', '')

  // Basic template structure
  return {
    company_name: companyName,
    public: {
      basic_info: {
        official_name: companyName,
        founded: '',
        headquarters: '',
        employees: '',
        business_description: ''
      },
      work_style: {
        work_format: '',
        annual_holidays: '',
        benefits: ''
      }
    },
    confidential: {
      selection_process: {},
      recruitment_reality: {},
      internal_memo: {},
      ng_items: {},
      application_system: {},
      contract_info: {},
      target_details: {}
    }
  }
}

export async function POST() {
  const errors: string[] = []
  let processedCount = 0

  try {
    // Ensure processed directory exists
    await fs.mkdir(PROCESSED_DIR, { recursive: true })

    // Read all files from raw directory
    const files = await fs.readdir(RAW_DIR)
    const txtFiles = files.filter(file => file.endsWith('.txt') || !file.includes('.'))

    for (const file of txtFiles) {
      try {
        const filePath = path.join(RAW_DIR, file)
        const content = await fs.readFile(filePath, 'utf-8')

        // Parse the raw file content
        const parsedData = await parseRawFile(file, content)

        // Save to processed directory
        const outputFileName = file.endsWith('.txt') ? file.replace('.txt', '.json') : `${file}.json`
        const outputPath = path.join(PROCESSED_DIR, outputFileName)

        await fs.writeFile(outputPath, JSON.stringify(parsedData, null, 2), 'utf-8')
        processedCount++
      } catch (error: any) {
        errors.push(`Error processing ${file}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      processed: processedCount,
      errors: [...errors, `Fatal error: ${error.message}`]
    }, { status: 500 })
  }
}
