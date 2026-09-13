import 'dotenv/config'

import { existsSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const baseUrl = `http://127.0.0.1:${process.env.API_PORT || 3001}`
const projectRoot = process.cwd()
const markerFile = path.join(projectRoot, 'data', '.smoke-test-ids.json')
const keepPublishedPhotos = process.argv.includes('--keep')
const cleanupOnly = process.argv.includes('--cleanup-only')
const password = process.env.ADMIN_PASSWORD

if (!password) throw new Error('ADMIN_PASSWORD is not configured in .env')

async function request(url, options = {}) {
  return fetch(`${baseUrl}${url}`, options)
}

async function expectStatus(response, expected, label) {
  if (response.status !== expected) {
    const body = await response.text()
    throw new Error(`${label}: expected ${expected}, received ${response.status}: ${body}`)
  }
  return response
}

async function login() {
  const response = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  await expectStatus(response, 200, '管理员登录')
  return (await response.json()).token
}

async function deletePhotos(token, photos) {
  for (const photo of photos) {
    const response = await request(`/api/admin/photos/${photo.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await expectStatus(response, 204, `删除 ${photo.id}`)

    for (const url of [photo.originalUrl, photo.thumbnailUrl]) {
      const localPath = path.join(projectRoot, url.replace(/^\//, ''))
      if (existsSync(localPath)) throw new Error(`文件未删除: ${localPath}`)
    }
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await request('/api/health')
      if (response.ok) return
    } catch {
      // The concurrently started API may still be booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('API server did not become ready')
}

await waitForServer()

if (cleanupOnly) {
  const photos = JSON.parse(await readFile(markerFile, 'utf8'))
  const token = await login()
  await deletePhotos(token, photos)
  await rm(markerFile, { force: true })
  console.log(`Cleanup passed: removed ${photos.length} smoke-test photos and files.`)
  process.exit(0)
}

const results = []
let token = ''
let createdPhotos = []
let completed = false

try {
  await expectStatus(
    await request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'definitely-wrong-password' }),
    }),
    401,
    '错误密码拒绝',
  )
  results.push('错误密码拒绝')

  token = await login()
  results.push('正确密码登录')

  const source = {
    create: {
      width: 720,
      height: 960,
      channels: 3,
      background: { r: 72, g: 91, b: 73 },
    },
  }
  const jpg = await sharp(source).jpeg({ quality: 88 }).toBuffer()
  const png = await sharp({
    create: {
      width: 1100,
      height: 700,
      channels: 3,
      background: { r: 207, g: 190, b: 160 },
    },
  }).png().toBuffer()
  const webp = await sharp({
    create: {
      width: 800,
      height: 800,
      channels: 3,
      background: { r: 119, g: 131, b: 119 },
    },
  }).webp({ quality: 84 }).toBuffer()

  const unauthenticatedForm = new FormData()
  unauthenticatedForm.append('photos', new Blob([jpg], { type: 'image/jpeg' }), 'unauthorized.jpg')
  await expectStatus(
    await request('/api/photos', { method: 'POST', body: unauthenticatedForm }),
    401,
    '未认证上传拒绝',
  )
  results.push('未认证上传拒绝')

  const uploadForm = new FormData()
  uploadForm.append('photos', new Blob([jpg], { type: 'image/jpeg' }), 'sample-one.jpg')
  uploadForm.append('photos', new Blob([png], { type: 'image/png' }), 'sample-two.png')
  uploadForm.append('photos', new Blob([webp], { type: 'image/webp' }), 'sample-three.webp')
  uploadForm.append('metadata', JSON.stringify([
    {
      title: 'API 测试城市',
      titleEn: 'API Test City',
      category: 'city',
      location: '测试地点一',
      locationEn: 'Test Location One',
      shootDate: '2026-08-15',
      description: '用于验证大图信息。',
      descriptionEn: 'Used to verify viewer information.',
      featured: true,
      published: true,
      sortOrder: 1,
    },
    {
      title: 'API 测试旅行',
      titleEn: 'API Test Travel',
      category: 'travel',
      location: '测试地点二',
      locationEn: 'Test Location Two',
      shootDate: '2026-08-16',
      published: true,
      sortOrder: 2,
    },
    {
      title: 'API 测试未公开',
      titleEn: 'API Test Unpublished',
      category: 'portrait',
      published: false,
      sortOrder: 3,
    },
  ]))

  const uploadResponse = await request('/api/photos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: uploadForm,
  })
  await expectStatus(uploadResponse, 201, 'JPG/PNG/WEBP 多图上传')
  createdPhotos = await uploadResponse.json()
  if (createdPhotos.length !== 3) throw new Error('Expected three uploaded photos')
  results.push('JPG/PNG/WEBP 多图上传与缩略图生成')

  for (const photo of createdPhotos) {
    for (const url of [photo.originalUrl, photo.thumbnailUrl]) {
      if (!existsSync(path.join(projectRoot, url.replace(/^\//, '')))) {
        throw new Error(`Stored file missing: ${url}`)
      }
    }
  }
  results.push('原图与缩略图持久化')

  const metadata = JSON.parse(await readFile(path.join(projectRoot, 'data', 'photos.json'), 'utf8'))
  if (!createdPhotos.every((photo) => metadata.some((entry) => entry.id === photo.id))) {
    throw new Error('Metadata JSON did not persist uploaded photos')
  }
  results.push('photos.json 元数据持久化')

  const publicPhotos = await (await request('/api/photos')).json()
  if (!publicPhotos.some((photo) => photo.id === createdPhotos[0].id)) {
    throw new Error('Published photo missing from public endpoint')
  }
  if (publicPhotos.some((photo) => photo.id === createdPhotos[2].id)) {
    throw new Error('Unpublished photo leaked to public endpoint')
  }
  results.push('公开/未公开过滤')

  const editResponse = await request(`/api/admin/photos/${createdPhotos[0].id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'API 测试城市（已编辑）',
      titleEn: 'API Test City (Edited)',
      category: 'landscape',
      featured: false,
      published: true,
      sortOrder: 9,
    }),
  })
  await expectStatus(editResponse, 200, '编辑照片')
  const editedPhoto = await editResponse.json()
  createdPhotos[0] = editedPhoto
  if (editedPhoto.category !== 'landscape' || editedPhoto.sortOrder !== 9) {
    throw new Error('Photo edit was not saved')
  }
  results.push('照片编辑、分类、精选、公开与排序')

  const invalidForm = new FormData()
  invalidForm.append('photos', new Blob(['not an image'], { type: 'text/plain' }), 'invalid.txt')
  await expectStatus(
    await request('/api/photos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: invalidForm,
    }),
    400,
    '非法格式拒绝',
  )
  results.push('非法格式拒绝')

  const oversizedForm = new FormData()
  oversizedForm.append(
    'photos',
    new Blob([Buffer.alloc(25 * 1024 * 1024 + 1)], { type: 'image/jpeg' }),
    'oversized.jpg',
  )
  await expectStatus(
    await request('/api/photos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: oversizedForm,
    }),
    413,
    '超大文件拒绝',
  )
  results.push('超过 25MB 文件拒绝')

  await deletePhotos(token, [createdPhotos[2]])
  createdPhotos = createdPhotos.slice(0, 2)
  results.push('删除照片与对应文件')

  if (keepPublishedPhotos) {
    await writeFile(markerFile, JSON.stringify(createdPhotos, null, 2), 'utf8')
  } else {
    await deletePhotos(token, createdPhotos)
    createdPhotos = []
  }

  completed = true
  console.log(JSON.stringify({ ok: true, kept: keepPublishedPhotos, results }, null, 2))
} finally {
  if (!completed && token && createdPhotos.length > 0) {
    await deletePhotos(token, createdPhotos).catch(() => {})
  }
}
