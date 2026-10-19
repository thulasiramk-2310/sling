import { describe, expect, it } from 'vitest'
import { extractProduct, guessGarment, parseProductLink, storeOf, upgradeImage } from '../src/productLink'
import { markersFromPose } from '../src/upload'
import { isPrivateAddress } from '../server/productApi'

describe('parseProductLink', () => {
  it('finds the link inside share text', () => {
    const l = parseProductLink('Check out this product on Amazon: https://amzn.in/d/3xYz9AB, thanks')
    expect(l).toEqual({ store: 'amazon', url: 'https://amzn.in/d/3xYz9AB', image: false })
  })
  it('accepts bare store links and app short links', () => {
    expect(parseProductLink('www.flipkart.com/roadster-tee/p/itm123?pid=TSH')?.store).toBe('flipkart')
    expect(parseProductLink('https://dl.flipkart.com/s/abc')?.store).toBe('flipkart')
    expect(parseProductLink('https://fkrt.it/xyz')?.store).toBe('flipkart')
    expect(parseProductLink('https://www.amazon.com/dp/B0C1234567')?.store).toBe('amazon')
    expect(parseProductLink('https://www.myntra.com/tshirts/hrx/123/buy')?.store).toBe('myntra')
  })
  it('spots direct image links and rejects non-links', () => {
    expect(parseProductLink('https://m.media-amazon.com/images/I/71abc.jpg')?.image).toBe(true)
    expect(parseProductLink('just some words')).toBeNull()
    expect(parseProductLink('javascript:alert(1)')).toBeNull()
  })
  it('does not treat look-alike hosts as stores', () => {
    expect(storeOf('amazon.in.evil.example')).toBe('other')
    expect(storeOf('notflipkart.com')).toBe('other')
    expect(storeOf('www.amazon.co.uk')).toBe('amazon')
  })
})

const AMAZON = `<html><head><title>Amazon.in: Men's Cotton Half Sleeve T-Shirt : Clothing &amp; Accessories</title>
<meta property="og:image" content="https://m.media-amazon.com/images/I/41small._SX300_.jpg"></head><body>
<span id="productTitle" class="a-size-large">   Men's Regular Fit Cotton Half Sleeve T-Shirt   </span>
<span class="a-price-whole">499</span>
<img id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/71front._SL1500_.jpg" data-a-dynamic-image="{&quot;https://m.media-amazon.com/images/I/71front._SX522_.jpg&quot;:[522,600]}">
<script>var data = {'colorImages': { 'initial': [{"hiRes":"https://m.media-amazon.com/images/I/71front._SL1500_.jpg","thumb":"x"},{"hiRes":"https://m.media-amazon.com/images/I/81back._SL1500_.jpg"}]}}</script>
</body></html>`

const FLIPKART = `<html><head><title>Buy ROADSTER Men Solid Round Neck Black T-Shirt Online at Best Prices in India | Flipkart.com</title>
<meta property="og:title" content="Roadster Solid Men Round Neck Black T-Shirt">
<script type="application/ld+json">[{"@context":"https://schema.org","@type":"Product","name":"ROADSTER Solid Men Round Neck Black T-Shirt","image":["https://rukminim2.flixcart.com/image/128/128/xif0q/t-shirt/a/b/c/m-tee.jpeg?q=70"],"offers":{"@type":"Offer","price":399,"priceCurrency":"INR"}}]</script>
</head><body><img src="https://rukminim2.flixcart.com/image/416/416/xif0q/t-shirt/a/b/c/m-tee.jpeg?q=70"><img src="https://rukminim2.flixcart.com/image/416/416/xif0q/t-shirt/x/y/z/m-back.jpeg?q=70"><div>₹399</div></body></html>`

describe('extractProduct', () => {
  it('reads an Amazon page: title, price and full-size gallery photos', () => {
    const p = extractProduct(AMAZON, 'https://www.amazon.in/dp/B0TEST')
    expect(p.store).toBe('amazon')
    expect(p.title).toBe("Men's Regular Fit Cotton Half Sleeve T-Shirt")
    expect(p.price).toBe(499)
    expect(p.images[0]).toBe('https://m.media-amazon.com/images/I/71front.jpg')
    expect(p.images).toContain('https://m.media-amazon.com/images/I/81back.jpg')
    expect(new Set(p.images).size).toBe(p.images.length)
  })
  it('reads a Flipkart page and asks for large photos', () => {
    const p = extractProduct(FLIPKART, 'https://www.flipkart.com/roadster/p/itm1')
    expect(p.store).toBe('flipkart')
    expect(p.title).toBe('ROADSTER Solid Men Round Neck Black T-Shirt')
    expect(p.price).toBe(399)
    expect(p.images[0]).toBe('https://rukminim2.flixcart.com/image/832/832/xif0q/t-shirt/a/b/c/m-tee.jpeg')
    expect(p.images).toContain('https://rukminim2.flixcart.com/image/832/832/xif0q/t-shirt/x/y/z/m-back.jpeg')
  })
  it('falls back to Open Graph tags on any other store', () => {
    const html = `<meta property="og:title" content="Linen Shirt | Some Brand"><meta property="og:image" content="/img/linen.jpg"><meta property="product:price:amount" content="2,499.00">`
    const p = extractProduct(html, 'https://shop.example.com/p/linen')
    expect(p.images).toEqual(['https://shop.example.com/img/linen.jpg'])
    expect(p.price).toBe(2499)
    expect(p.title).toBe('Linen Shirt | Some Brand')
  })
  it('ignores icons and non-http image sources', () => {
    const html = `<meta property="og:image" content="javascript:alert(1)"><meta name="twitter:image" content="https://cdn.example.com/logo.svg">`
    expect(extractProduct(html, 'https://shop.example.com/').images).toEqual([])
  })
  it('upgrades thumbnails only for known image hosts', () => {
    expect(upgradeImage('https://cdn.example.com/a._SX300_.jpg')).toBe('https://cdn.example.com/a._SX300_.jpg')
  })
})

describe('guessGarment', () => {
  it('reads category and sleeve length from titles', () => {
    expect(guessGarment("Men's Cotton Half Sleeve T-Shirt")).toMatchObject({ category: 'Tees', sleeves: 'short', wearable: true })
    expect(guessGarment('Slim Fit Formal Shirt, Full Sleeve')).toMatchObject({ category: 'Shirts', sleeves: 'long' })
    expect(guessGarment('Women Hooded Sweatshirt')).toMatchObject({ category: 'Knitwear', sleeves: 'long' })
    expect(guessGarment('Men Denim Jacket')).toMatchObject({ category: 'Jackets', sleeves: 'long' })
    expect(guessGarment('Polo T-shirt')).toMatchObject({ category: 'Tees', sleeves: 'short' })
  })
  it('flags things that are not tops', () => {
    expect(guessGarment('Men Slim Fit Jeans').wearable).toBe(false)
    expect(guessGarment('Running Shoes').wearable).toBe(false)
  })
})

describe('markersFromPose', () => {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  // A model facing the camera: their right shoulder (12) appears on the photo's left.
  lm[12] = { x: 0.35, y: 0.3, visibility: 0.99 }
  lm[11] = { x: 0.65, y: 0.3, visibility: 0.99 }
  lm[14] = { x: 0.3, y: 0.45, visibility: 0.9 }
  lm[13] = { x: 0.7, y: 0.45, visibility: 0.9 }
  lm[16] = { x: 0.28, y: 0.6, visibility: 0.9 }
  lm[15] = { x: 0.72, y: 0.6, visibility: 0.9 }
  lm[24] = { x: 0.4, y: 0.7, visibility: 0.9 }
  lm[23] = { x: 0.6, y: 0.7, visibility: 0.9 }

  it('places shoulders, hem and cuffs on the right side of the photo', () => {
    const m = markersFromPose(lm, 1000, 1000, 'short')!
    expect(m.shoulderL.x).toBeLessThan(350)
    expect(m.shoulderR.x).toBeGreaterThan(650)
    expect(m.hemL.y).toBeGreaterThan(700)
    expect(m.cuffL.x).toBeLessThan(m.shoulderL.x)
    expect(m.cuffL.y).toBeLessThan(450)
  })
  it('runs long sleeves to the wrist', () => {
    const m = markersFromPose(lm, 1000, 1000, 'long')!
    expect(m.cuffL.y).toBeGreaterThan(550)
  })
  it('gives up when the shoulders are not visible', () => {
    const hidden = lm.map((p, i) => (i === 11 ? { ...p, visibility: 0.1 } : p))
    expect(markersFromPose(hidden, 1000, 1000, 'short')).toBeNull()
  })
})

describe('isPrivateAddress', () => {
  it('blocks loopback, private and link-local addresses', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', 'not-an-ip'])
      expect(isPrivateAddress(ip), ip).toBe(true)
  })
  it('allows public addresses', () => {
    for (const ip of ['8.8.8.8', '13.32.1.1', '172.32.0.1', '2606:4700::1111']) expect(isPrivateAddress(ip), ip).toBe(false)
  })
})
