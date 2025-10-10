import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import type { CompanyData } from '@/lib/types'
import { formatErrorMessage } from '@/lib/utils/errors'

const RAW_DIR = path.join(process.cwd(), 'src/data/companies/raw')
const PROCESSED_DIR = path.join(process.cwd(), 'src/data/companies/processed')

async function parseRawFile(filename: string): Promise<CompanyData> {
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
        await fs.readFile(filePath, 'utf-8')

        // Parse the raw file content
        const parsedData = await parseRawFile(file)

        // Save to processed directory
        const outputFileName = file.endsWith('.txt') ? file.replace('.txt', '.json') : `${file}.json`
        const outputPath = path.join(PROCESSED_DIR, outputFileName)

        await fs.writeFile(outputPath, JSON.stringify(parsedData, null, 2), 'utf-8')
        processedCount++
      } catch (error: unknown) {
        const errorMessage = formatErrorMessage(error)
        errors.push(`Error processing ${file}: ${errorMessage}`)
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors
    })
  } catch (error: unknown) {
    const errorMessage = formatErrorMessage(error)
    return NextResponse.json({
      success: false,
      processed: processedCount,
      errors: [...errors, `Fatal error: ${errorMessage}`]
    }, { status: 500 })
  }
}
