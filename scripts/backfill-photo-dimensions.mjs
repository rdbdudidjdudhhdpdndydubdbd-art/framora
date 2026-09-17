// 一次性迁移：为 data/photos.json 中缺少 width/height 的照片，
// 从 uploads/original 原图读取像素宽高并回写。可重复运行（幂等）。
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataFile = path.join(projectRoot, 'data', 'photos.json')

const photos = JSON.parse(await readFile(dataFile, 'utf8'))
let updated = 0

for (const photo of photos) {
  if (photo.width && photo.height) continue
  const sourcePath = path.join(projectRoot, photo.originalUrl.replace(/^\//, ''))
  try {
    const { width, height } = await sharp(sourcePath).metadata()
    if (!width || !height) throw new Error('metadata missing')
    photo.width = width
    photo.height = height
    updated += 1
    console.log(`✓ ${photo.title || photo.filename}: ${width}x${height}`)
  } catch (error) {
    console.error(`✗ ${photo.title || photo.filename}: ${error.message}`)
  }
}

await writeFile(dataFile, `${JSON.stringify(photos, null, 2)}\n`, 'utf8')
console.log(`完成:补齐 ${updated} 张照片的宽高`)
