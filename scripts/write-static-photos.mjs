// 在 vite build 之后运行：把「已发布」照片的元数据和图片文件写入 dist，
// 供静态托管使用。未发布的照片不会被拷贝，从而不会出现在公网。
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const dataFile = path.join(projectRoot, 'data', 'photos.json')
const distDirectory = path.join(projectRoot, 'dist')
const distPhotosFile = path.join(distDirectory, 'photos.json')
const distUploadsDirectory = path.join(distDirectory, 'uploads')

// 与服务端 server/index.js 的 sortPhotos 保持一致：
// 精选优先 → 排序值升序 → 创建时间降序。
function sortPhotos(photos) {
  return [...photos].sort(
    (first, second) =>
      Number(second.featured) - Number(first.featured) ||
      Number(first.sortOrder) - Number(second.sortOrder) ||
      String(second.createdAt).localeCompare(String(first.createdAt)),
  )
}

const photos = JSON.parse(await readFile(dataFile, 'utf8'))

if (!Array.isArray(photos)) {
  throw new Error('data/photos.json 必须包含照片数组。')
}

const publishedPhotos = sortPhotos(photos.filter((photo) => photo.published))

await rm(distUploadsDirectory, { recursive: true, force: true })

const missingFiles = []

for (const photo of publishedPhotos) {
  for (const url of [photo.originalUrl, photo.thumbnailUrl]) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
      missingFiles.push(String(url))
      continue
    }

    const relativePath = url.slice(1)
    const sourcePath = path.resolve(projectRoot, relativePath)
    const targetPath = path.join(distDirectory, relativePath)

    try {
      await mkdir(path.dirname(targetPath), { recursive: true })
      await cp(sourcePath, targetPath)
    } catch {
      missingFiles.push(url)
    }
  }
}

if (missingFiles.length > 0) {
  console.error('[write-static] 以下图片文件缺失，线上将出现坏图：')
  for (const file of missingFiles) console.error(`  ${file}`)
  process.exit(1)
}

await writeFile(
  distPhotosFile,
  `${JSON.stringify(publishedPhotos, null, 2)}\n`,
  'utf8',
)

console.log(
  `[write-static] 已写入 ${publishedPhotos.length} 张已发布照片到 dist/photos.json`,
)
