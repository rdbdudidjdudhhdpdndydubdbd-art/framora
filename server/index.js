import 'dotenv/config'

import cors from 'cors'
import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(serverDirectory, '..')
const dataDirectory = path.join(projectRoot, 'data')
const photosFile = path.join(dataDirectory, 'photos.json')
const uploadsDirectory = path.join(projectRoot, 'uploads')
const originalsDirectory = path.join(uploadsDirectory, 'original')
const thumbnailsDirectory = path.join(uploadsDirectory, 'thumbnails')

const port = Number(process.env.API_PORT || 3001)
const maxFileSize = 25 * 1024 * 1024
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const allowedFormats = new Set(['jpeg', 'png', 'webp'])
const allowedCategories = new Set([
  'city',
  'travel',
  'portrait',
  'landscape',
  'daily',
  'wedding',
])
const sessionLifetime = 12 * 60 * 60 * 1000
const adminSessions = new Map()
const loginWindowMs = 15 * 60 * 1000
const maxFailedLogins = 10
const failedLogins = new Map()

await ensureStorage()

const app = express()

app.disable('x-powered-by')
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        callback(null, true)
        return
      }

      callback(new Error('不允许的请求来源。'))
    },
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(
  '/uploads',
  express.static(uploadsDirectory, {
    index: false,
    fallthrough: false,
    maxAge: '1h',
  }),
)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
    files: 20,
  },
  fileFilter(_request, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase()
    if (
      !allowedMimeTypes.has(file.mimetype) ||
      !allowedExtensions.has(extension)
    ) {
      const error = new Error('仅支持 JPG、JPEG、PNG 和 WEBP 图片。')
      error.status = 400
      callback(error)
      return
    }

    callback(null, true)
  },
})

let mutationQueue = Promise.resolve()

function sortPhotos(photos) {
  return [...photos].sort(
    (first, second) =>
      Number(second.featured) - Number(first.featured) ||
      Number(first.sortOrder) - Number(second.sortOrder) ||
      String(second.createdAt).localeCompare(String(first.createdAt)),
  )
}

async function ensureStorage() {
  await Promise.all([
    mkdir(dataDirectory, { recursive: true }),
    mkdir(originalsDirectory, { recursive: true }),
    mkdir(thumbnailsDirectory, { recursive: true }),
  ])

  try {
    await readFile(photosFile, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await writePhotos([])
  }
}

async function readPhotos() {
  const rawData = await readFile(photosFile, 'utf8')
  const photos = JSON.parse(rawData)

  if (!Array.isArray(photos)) {
    throw new Error('data/photos.json 必须包含照片数组。')
  }

  return photos
}

async function writePhotos(photos) {
  const temporaryFile = `${photosFile}.${process.pid}.${Date.now()}.tmp`
  const json = `${JSON.stringify(photos, null, 2)}\n`

  try {
    await writeFile(temporaryFile, json, 'utf8')
    await rename(temporaryFile, photosFile)
  } catch (error) {
    await unlink(temporaryFile).catch(() => {})
    throw error
  }
}

function mutatePhotos(mutator) {
  const mutation = mutationQueue.then(async () => {
    const photos = await readPhotos()
    const result = await mutator(photos)
    await writePhotos(photos)
    return result
  })

  mutationQueue = mutation.catch(() => {})
  return mutation
}

function safeString(value, maximumLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : ''
}

function safeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function safeSortOrder(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : fallback
}

function normalizeCategory(value) {
  return allowedCategories.has(value) ? value : 'daily'
}

function parseMetadata(rawMetadata, fileCount) {
  if (!rawMetadata) return Array.from({ length: fileCount }, () => ({}))

  let parsed
  try {
    parsed = JSON.parse(rawMetadata)
  } catch {
    const error = new Error('照片信息不是有效的 JSON。')
    error.status = 400
    throw error
  }

  if (!Array.isArray(parsed)) parsed = [parsed]
  return Array.from({ length: fileCount }, (_, index) => parsed[index] || {})
}

function isPasswordValid(candidate) {
  const configuredPassword = process.env.ADMIN_PASSWORD || ''
  if (!configuredPassword || typeof candidate !== 'string') return false

  const configuredBuffer = Buffer.from(configuredPassword)
  const candidateBuffer = Buffer.from(candidate)
  if (configuredBuffer.length !== candidateBuffer.length) return false

  return timingSafeEqual(configuredBuffer, candidateBuffer)
}

function createSession() {
  const token = randomBytes(32).toString('hex')
  adminSessions.set(token, Date.now() + sessionLifetime)
  return token
}

function requireAdmin(request, response, next) {
  const authorization = request.get('authorization') || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : ''
  const expiresAt = adminSessions.get(token)

  if (!expiresAt || expiresAt <= Date.now()) {
    if (token) adminSessions.delete(token)
    response.status(401).json({ error: '管理员认证已失效，请重新登录。' })
    return
  }

  next()
}

function resolveUploadPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return null

  const resolvedPath = path.resolve(projectRoot, url.slice(1))
  const uploadsRootWithSeparator = `${uploadsDirectory}${path.sep}`
  if (!resolvedPath.startsWith(uploadsRootWithSeparator)) return null

  return resolvedPath
}

async function deleteStoredPhotoFiles(photo) {
  const candidates = [
    resolveUploadPath(photo.originalUrl),
    resolveUploadPath(photo.thumbnailUrl),
  ].filter(Boolean)

  await Promise.all(
    candidates.map((filePath) =>
      unlink(filePath).catch((error) => {
        if (error.code !== 'ENOENT') throw error
      }),
    ),
  )
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/api/admin/login', (request, response) => {
  if (!process.env.ADMIN_PASSWORD) {
    response.status(503).json({ error: '请先在 .env 中设置 ADMIN_PASSWORD。' })
    return
  }

  // 滑动窗口限流：15 分钟内失败次数达到上限即拒绝，防暴力破解。
  const now = Date.now()
  const recentFailures = (failedLogins.get(request.ip) || []).filter(
    (timestamp) => now - timestamp < loginWindowMs,
  )

  if (recentFailures.length >= maxFailedLogins) {
    response.status(429).json({ error: '尝试次数过多，请 15 分钟后再试。' })
    return
  }

  if (!isPasswordValid(request.body?.password)) {
    failedLogins.set(request.ip, [...recentFailures, now])
    response.status(401).json({ error: '密码错误。' })
    return
  }

  failedLogins.delete(request.ip)
  response.json({ token: createSession() })
})

app.post('/api/admin/logout', requireAdmin, (request, response) => {
  const token = request.get('authorization').slice(7)
  adminSessions.delete(token)
  response.status(204).end()
})

app.get('/api/photos', async (_request, response, next) => {
  try {
    const photos = await readPhotos()
    response.set('Cache-Control', 'no-store')
    response.json(sortPhotos(photos.filter((photo) => photo.published)))
  } catch (error) {
    next(error)
  }
})

// 静态部署时前端直接读取 /photos.json（build 后由 scripts/write-static-photos.mjs
// 写入 dist）；本地开发则由本路由提供同样形状的数据。
app.get('/photos.json', async (_request, response, next) => {
  try {
    const photos = await readPhotos()
    response.set('Cache-Control', 'no-store')
    response.json(sortPhotos(photos.filter((photo) => photo.published)))
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/photos', requireAdmin, async (_request, response, next) => {
  try {
    response.set('Cache-Control', 'no-store')
    response.json(sortPhotos(await readPhotos()))
  } catch (error) {
    next(error)
  }
})

app.post(
  '/api/photos',
  requireAdmin,
  upload.array('photos', 20),
  async (request, response, next) => {
    const files = request.files || []
    if (files.length === 0) {
      response.status(400).json({ error: '请选择至少一张照片。' })
      return
    }

    const createdFilePaths = []

    try {
      const metadataEntries = parseMetadata(request.body.metadata, files.length)
      const existingPhotos = await readPhotos()
      const highestSortOrder = existingPhotos.reduce(
        (highest, photo) => Math.max(highest, Number(photo.sortOrder) || 0),
        0,
      )

      const createdPhotos = []

      for (const [index, file] of files.entries()) {
        const imageMetadata = await sharp(file.buffer).metadata()
        if (!imageMetadata.format || !allowedFormats.has(imageMetadata.format)) {
          const error = new Error('上传内容不是受支持的图片文件。')
          error.status = 400
          throw error
        }

        const id = `photo_${randomUUID().replaceAll('-', '')}`
        const originalExtension = imageMetadata.format === 'jpeg' ? 'jpg' : imageMetadata.format
        const filename = `${id}.${originalExtension}`
        const thumbnailFilename = `${id}.webp`
        const originalPath = path.join(originalsDirectory, filename)
        const thumbnailPath = path.join(thumbnailsDirectory, thumbnailFilename)
        const entry = metadataEntries[index]

        // 重编码原图：剥离全部元数据（EXIF/GPS），并先 .rotate() 把方向烘焙进像素，
        // 否则剥离 EXIF 后浏览器不再自动旋转，照片方向会出错。
        const originalBuffer =
          imageMetadata.format === 'png'
            ? await sharp(file.buffer).rotate().png().toBuffer()
            : imageMetadata.format === 'webp'
              ? await sharp(file.buffer).rotate().webp({ quality: 92 }).toBuffer()
              : await sharp(file.buffer)
                  .rotate()
                  .jpeg({ quality: 92, mozjpeg: true })
                  .toBuffer()

        await writeFile(originalPath, originalBuffer)
        createdFilePaths.push(originalPath)

        // 从已烘焙方向的重编码原图读取宽高，保证与浏览器实际显示一致。
        const orientedMetadata = await sharp(originalBuffer).metadata()

        await sharp(file.buffer)
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true, fit: 'inside' })
          .webp({ quality: 82 })
          .toFile(thumbnailPath)
        createdFilePaths.push(thumbnailPath)

        createdPhotos.push({
          id,
          filename,
          originalUrl: `/uploads/original/${filename}`,
          thumbnailUrl: `/uploads/thumbnails/${thumbnailFilename}`,
          width: orientedMetadata.width || 0,
          height: orientedMetadata.height || 0,
          title: safeString(entry.title, 200),
          titleEn: safeString(entry.titleEn, 200),
          category: normalizeCategory(entry.category),
          location: safeString(entry.location, 200),
          locationEn: safeString(entry.locationEn, 200),
          shootDate: safeString(entry.shootDate, 20),
          description: safeString(entry.description, 4000),
          descriptionEn: safeString(entry.descriptionEn, 4000),
          featured: safeBoolean(entry.featured, false),
          published: safeBoolean(entry.published, true),
          sortOrder: safeSortOrder(entry.sortOrder, highestSortOrder + index + 1),
          createdAt: new Date().toISOString(),
        })
      }

      await mutatePhotos((photos) => {
        photos.push(...createdPhotos)
        return createdPhotos
      })

      response.status(201).json(createdPhotos)
    } catch (error) {
      await Promise.all(createdFilePaths.map((filePath) => unlink(filePath).catch(() => {})))
      next(error)
    }
  },
)

app.put('/api/admin/photos/:id', requireAdmin, async (request, response, next) => {
  try {
    const updatedPhoto = await mutatePhotos((photos) => {
      const photo = photos.find((candidate) => candidate.id === request.params.id)
      if (!photo) {
        const error = new Error('没有找到这张照片。')
        error.status = 404
        throw error
      }

      const updates = request.body || {}
      const stringFields = [
        ['title', 200],
        ['titleEn', 200],
        ['location', 200],
        ['locationEn', 200],
        ['shootDate', 20],
        ['description', 4000],
        ['descriptionEn', 4000],
      ]

      for (const [field, maximumLength] of stringFields) {
        if (field in updates) photo[field] = safeString(updates[field], maximumLength)
      }

      if ('category' in updates) {
        if (!allowedCategories.has(updates.category)) {
          const error = new Error('无效的照片分类。')
          error.status = 400
          throw error
        }
        photo.category = updates.category
      }
      if ('featured' in updates) {
        photo.featured = safeBoolean(updates.featured, photo.featured)
      }
      if ('published' in updates) {
        photo.published = safeBoolean(updates.published, photo.published)
      }
      if ('sortOrder' in updates) {
        photo.sortOrder = safeSortOrder(updates.sortOrder, photo.sortOrder)
      }

      return photo
    })

    response.json(updatedPhoto)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/photos/:id', requireAdmin, async (request, response, next) => {
  try {
    const deletedPhoto = await mutatePhotos((photos) => {
      const index = photos.findIndex((photo) => photo.id === request.params.id)
      if (index === -1) {
        const error = new Error('没有找到这张照片。')
        error.status = 404
        throw error
      }

      const [photo] = photos.splice(index, 1)
      return photo
    })

    await deleteStoredPhotoFiles(deletedPhoto)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      response.status(413).json({ error: '单张照片不能超过 25MB。' })
      return
    }
    response.status(400).json({ error: '照片上传失败，请检查文件数量与格式。' })
    return
  }

  const status = Number(error.status) || 500
  if (status >= 500) console.error(error)
  response.status(status).json({
    error: status >= 500 ? '服务器处理请求时出现错误。' : error.message,
  })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`Photography API: http://127.0.0.1:${port}`)
})

const sessionCleanup = setInterval(() => {
  const now = Date.now()
  for (const [token, expiresAt] of adminSessions) {
    if (expiresAt <= now) adminSessions.delete(token)
  }
  for (const [ip, timestamps] of failedLogins) {
    const recent = timestamps.filter((timestamp) => now - timestamp < loginWindowMs)
    if (recent.length === 0) failedLogins.delete(ip)
    else failedLogins.set(ip, recent)
  }
}, 60 * 60 * 1000)
sessionCleanup.unref()
