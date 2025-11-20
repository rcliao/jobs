import { searchGoogle } from '@/lib/search/google'
import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert'

// Mock process.env
const originalEnv = process.env

describe('searchGoogle', () => {
    beforeEach(() => {
        process.env = {
            ...originalEnv,
            GOOGLE_API_KEY: 'test-key',
            GOOGLE_SEARCH_ENGINE_ID: 'test-cx'
        }
        // Mock global.fetch
        global.fetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({ items: [] })
        })) as any
    })

    afterEach(() => {
        process.env = originalEnv
        mock.reset()
    })

    it('should include dateRestrict parameter in the URL', async () => {
        await searchGoogle('test query', 'm1')

        const expectedUrl = 'https://www.googleapis.com/customsearch/v1?key=test-key&cx=test-cx&q=test+query&num=10&dateRestrict=m1'

        const calls = (global.fetch as any).mock.calls
        assert.strictEqual(calls.length, 1)
        assert.strictEqual(calls[0].arguments[0], expectedUrl)
    })

    it('should use default dateRestrict if not provided', async () => {
        // The default is 'm1' as per our implementation
        await searchGoogle('test query')

        const expectedUrl = 'https://www.googleapis.com/customsearch/v1?key=test-key&cx=test-cx&q=test+query&num=10&dateRestrict=m1'

        const calls = (global.fetch as any).mock.calls
        assert.strictEqual(calls.length, 1)
        assert.strictEqual(calls[0].arguments[0], expectedUrl)
    })
})
