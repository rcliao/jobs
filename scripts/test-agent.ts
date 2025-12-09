import { executeSearch } from '../lib/agent/researcher'
import fs from 'fs'
import path from 'path'

// Load .env.local manually to ensure environment variables are available
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local')
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8')
            envConfig.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/)
                if (match) {
                    const key = match[1].trim()
                    const value = match[2].trim().replace(/^["']|["']$/g, '')
                    process.env[key] = value
                }
            })
            console.log('✅ .env.local loaded')
        } else {
            console.warn('⚠️ .env.local not found. Ensure environment variables are set.')
        }
    } catch (e) {
        console.error('❌ Error loading .env.local', e)
    }
}

async function main() {
    console.log('🚀 Starting Lead Search Agent Test...')
    loadEnv()

    try {
        console.log('\n--- Executing Search Graph ---')
        const result = await executeSearch()

        console.log('\n✅ Test Completed Successfully!')
        console.log('--------------------------------')
        console.log(`Search Run ID: ${result.searchRunId}`)
        console.log(`Jobs Found: ${result.jobsFound}`)
        console.log(`Queries Generated: ${result.queries.length}`)
        console.log('--------------------------------')

    } catch (error) {
        console.error('\n❌ Test Failed:', error)
        process.exit(1)
    }
}

main()
