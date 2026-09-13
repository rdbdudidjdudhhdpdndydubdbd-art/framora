// 生成 Framora 品牌分享图 public/og.png（1200x630）。
// 品牌元素如需调整（颜色、字体、文案），修改下方 SVG 后重新运行 npm run generate:og。
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const outputFile = path.join(projectRoot, 'public', 'og.png')

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#faf8f5"/>
  <path d="M600 170 756 450H444Z" fill="#2d3a2e"/>
  <text x="600" y="556" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="78" letter-spacing="14" fill="#2d3a2e">FRAMORA</text>
</svg>
`

await sharp(Buffer.from(svg)).png().toFile(outputFile)
console.log(`[generate-og] 已生成 ${outputFile}`)
