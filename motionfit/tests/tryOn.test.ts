import { describe, expect, it } from 'vitest'
import { parseTryOn, provider } from '../server/tryOn'

const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

describe('try-on request', () => {
  it('accepts two image data URLs and cleans the description', () => {
    const r = parseTryOn({ person: IMG, garment: IMG, description: 'Red tee <script>', category: 'weird' })
    expect(r.category).toBe('tops')
    expect(r.description).toBe('Red tee script')
  })
  it('rejects anything that is not an inline image', () => {
    expect(() => parseTryOn({ person: 'https://evil.example/x.jpg', garment: IMG })).toThrow('bad-image')
    expect(() => parseTryOn({ person: 'data:text/html;base64,PGgxPg==', garment: IMG })).toThrow('bad-image')
    expect(() => parseTryOn(null)).toThrow('bad-request')
  })
  it('picks the provider from the configured key', () => {
    expect(provider({})).toBeNull()
    expect(provider({ HF_TOKEN: 'hf_x' })).toBe('huggingface')
    expect(provider({ HF_TOKEN: 'hf_x', FASHN_API_KEY: 'k' })).toBe('fashn')
  })
})
