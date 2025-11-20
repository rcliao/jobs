import { containsAvoidKeywords } from './text-processing'
import assert from 'assert'

console.log('Running text-processing tests...')

// Test Case 1: Exact match
assert.strictEqual(
    containsAvoidKeywords('We are looking for a blockchain developer', ['blockchain']),
    true,
    'Should detect exact match'
)

// Test Case 2: Case insensitivity
assert.strictEqual(
    containsAvoidKeywords('We are looking for a BLOCKCHAIN developer', ['blockchain']),
    true,
    'Should be case insensitive'
)

// Test Case 3: Partial match (Should NOT match)
assert.strictEqual(
    containsAvoidKeywords('We are Google, a tech company', ['Go']),
    false,
    'Should NOT match "Go" in "Google"'
)

// Test Case 4: Partial match (Should NOT match)
assert.strictEqual(
    containsAvoidKeywords('We use JavaScript for frontend', ['Java']),
    false,
    'Should NOT match "Java" in "JavaScript"'
)

// Test Case 5: Multiple keywords
assert.strictEqual(
    containsAvoidKeywords('We are a crypto startup', ['blockchain', 'crypto']),
    true,
    'Should detect one of multiple keywords'
)

// Test Case 6: No keywords
assert.strictEqual(
    containsAvoidKeywords('Any text', []),
    false,
    'Should return false for empty keywords list'
)

// Test Case 7: Word boundaries with punctuation
assert.strictEqual(
    containsAvoidKeywords('We do crypto.', ['crypto']),
    true,
    'Should match word followed by punctuation'
)

console.log('✓ All tests passed!')
