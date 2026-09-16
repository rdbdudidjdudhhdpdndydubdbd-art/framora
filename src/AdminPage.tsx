import { useEffect, useRef, useState } from 'react'
import { ImagePlus, LogOut, Pencil, Trash2, Upload, X } from 'lucide-react'
import { photoCategories, type Photo, type PhotoCategory } from './types'

const adminTokenKey = 'photo-admin-session'
const allowedFileTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxFileSize = 25 * 1024 * 1024

const categoryLabels: Record<PhotoCategory, string> = {
  city: '城市',
  travel: '旅行',
  portrait: '人像',
  landscape: '风景',
  daily: '日常',
  wedding: '婚礼',
}

const inputClass =
  'w-full border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none transition focus:border-brand-dark/45'
const labelClass = 'space-y-1 text-xs tracking-wide text-brand-dark/60'

type UploadDraft = {
  id: string
  file: File
  preview: string
  title: string
  titleEn: string
  category: PhotoCategory
  location: string
  locationEn: string
  shootDate: string
  description: string
  descriptionEn: string
  featured: boolean
  published: boolean
}

function createUploadDraft(file: File): UploadDraft {
  return {
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    preview: URL.createObjectURL(file),
    title: '',
    titleEn: '',
    category: 'daily',
    location: '',
    locationEn: '',
    shootDate: '',
    description: '',
    descriptionEn: '',
    featured: false,
    published: true,
  }
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(adminTokenKey))
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const [drafts, setDrafts] = useState<UploadDraft[]>([])
  const [batchCategory, setBatchCategory] = useState<PhotoCategory>('daily')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [listStatus, setListStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftsRef = useRef<UploadDraft[]>([])

  useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  useEffect(
    () => () => {
      draftsRef.current.forEach((draft) => URL.revokeObjectURL(draft.preview))
    },
    [],
  )

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    async function loadPhotos() {
      setIsLoadingPhotos(true)
      try {
        const response = await fetch('/api/admin/photos', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (response.status === 401) {
          sessionStorage.removeItem(adminTokenKey)
          setToken(null)
          setLoginError('登录已失效，请重新输入管理员密码。')
          return
        }
        if (!response.ok) throw new Error('无法载入作品列表。')
        setPhotos(await response.json())
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setListStatus((error as Error).message)
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingPhotos(false)
      }
    }

    loadPhotos()
    return () => controller.abort()
  }, [token])

  async function refreshPhotos(activeToken = token) {
    if (!activeToken) return
    const response = await fetch('/api/admin/photos', {
      headers: { Authorization: `Bearer ${activeToken}` },
    })
    if (!response.ok) throw new Error('无法刷新作品列表。')
    setPhotos(await response.json())
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    if (isLoggingIn) return

    setIsLoggingIn(true)
    setLoginError('')
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '登录失败。')

      sessionStorage.setItem(adminTokenKey, result.token)
      setToken(result.token)
      setPassword('')
    } catch (error) {
      setLoginError((error as Error).message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleLogout() {
    if (token) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    sessionStorage.removeItem(adminTokenKey)
    setToken(null)
    setPhotos([])
  }

  function addFiles(files: FileList | File[]) {
    const validFiles = Array.from(files).filter(
      (file) => allowedFileTypes.has(file.type) && file.size <= maxFileSize,
    )

    if (validFiles.length !== Array.from(files).length) {
      setUploadStatus('仅支持不超过 25MB 的 JPG、PNG 或 WEBP 图片。')
    } else {
      setUploadStatus('')
    }

    setDrafts((current) => [
      ...current,
      ...validFiles.map((file) => ({
        ...createUploadDraft(file),
        category: batchCategory,
      })),
    ])
  }

  function removeDraft(id: string) {
    setDrafts((current) => {
      const target = current.find((draft) => draft.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((draft) => draft.id !== id)
    })
  }

  function updateDraft<K extends keyof UploadDraft>(
    id: string,
    field: K,
    value: UploadDraft[K],
  ) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, [field]: value } : draft,
      ),
    )
  }

  function updateBatchCategory(category: PhotoCategory) {
    setBatchCategory(category)
    setDrafts((current) =>
      current.map((draft) => ({ ...draft, category })),
    )
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault()
    if (!token || drafts.length === 0 || isUploading) return

    setIsUploading(true)
    setUploadStatus('正在上传...')

    try {
      const formData = new FormData()
      drafts.forEach((draft) => formData.append('photos', draft.file))
      formData.append(
        'metadata',
        JSON.stringify(
          drafts.map(({ file: _file, preview: _preview, id: _id, ...metadata }) =>
            metadata,
          ),
        ),
      )

      const response = await fetch('/api/photos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '上传失败。')

      drafts.forEach((draft) => URL.revokeObjectURL(draft.preview))
      setDrafts([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      setUploadStatus(`上传成功，共保存 ${result.length} 张照片。`)
      await refreshPhotos()
    } catch (error) {
      setUploadStatus((error as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!token || !editingPhoto || isSaving) return

    setIsSaving(true)
    setListStatus('正在保存...')
    try {
      const response = await fetch(`/api/admin/photos/${editingPhoto.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingPhoto),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '保存失败。')

      setEditingPhoto(null)
      setListStatus('保存成功。')
      await refreshPhotos()
    } catch (error) {
      setListStatus((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(photo: Photo) {
    if (!token || !window.confirm('确定删除这张照片吗？')) return

    setListStatus('正在删除...')
    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '删除失败。')
      }

      setListStatus('照片已删除。')
      await refreshPhotos()
    } catch (error) {
      setListStatus((error as Error).message)
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-cream px-6 py-16 text-brand-dark">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm border border-brand-dark/10 bg-white/65 p-8"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-brand-dark/45">
            Framora
          </p>
          <h1 className="mt-4 text-2xl tracking-tight">摄影作品管理</h1>
          <p className="mt-2 text-sm text-brand-dark/55">
            请输入本机管理员密码后继续。
          </p>
          <Field label="管理员密码">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </Field>
          {loginError && <p className="mt-3 text-sm text-red-700">{loginError}</p>}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-5 w-full bg-brand-dark px-5 py-3 text-sm text-white transition-colors hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoggingIn ? '正在登录...' : '登录'}
          </button>
          <a
            href="/"
            className="mt-5 block text-center text-sm text-brand-dark/50 transition-opacity hover:opacity-70"
          >
            返回摄影网站
          </a>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream px-6 py-10 text-brand-dark lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-dark/10 pb-7">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-brand-dark/45">
              Framora Admin
            </p>
            <h1 className="mt-2 text-3xl tracking-tight">摄影作品管理</h1>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <a href="/" className="transition-opacity hover:opacity-60">
              查看网站
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 transition-opacity hover:opacity-60"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              退出
            </button>
          </div>
        </header>

        <section className="py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl tracking-tight">上传照片</h2>
              <p className="mt-1 text-sm text-brand-dark/50">
                支持一次选择多张 JPG、PNG 或 WEBP，单张不超过 25MB。
              </p>
            </div>
            <Field label="批量分类">
              <select
                value={batchCategory}
                onChange={(event) =>
                  updateBatchCategory(event.target.value as PhotoCategory)
                }
                className={`${inputClass} min-w-36`}
              >
                {photoCategories.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div
            onDragEnter={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              addFiles(event.dataTransfer.files)
            }}
            className={`mt-6 flex min-h-44 flex-col items-center justify-center border border-dashed px-6 py-10 text-center transition-colors ${
              isDragging
                ? 'border-brand-dark bg-white'
                : 'border-brand-dark/25 bg-white/35'
            }`}
          >
            <ImagePlus aria-hidden="true" className="h-8 w-8 text-brand-dark/55" />
            <p className="mt-3 text-sm">拖拽照片到这里，或点击选择图片</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 border border-brand-dark/20 bg-white px-5 py-2 text-sm transition-colors hover:bg-brand-light"
            >
              选择图片
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => event.target.files && addFiles(event.target.files)}
              className="hidden"
            />
          </div>

          {drafts.length > 0 && (
            <form onSubmit={handleUpload} className="mt-8 space-y-6">
              {drafts.map((draft) => (
                <article
                  key={draft.id}
                  className="grid gap-5 border-t border-brand-dark/10 pt-6 md:grid-cols-[180px_1fr]"
                >
                  <div className="relative">
                    <img
                      src={draft.preview}
                      alt="上传预览"
                      className="max-h-56 w-full object-contain object-top"
                    />
                    <button
                      type="button"
                      aria-label="移除这张照片"
                      onClick={() => removeDraft(draft.id)}
                      className="absolute right-2 top-2 bg-black/70 p-1.5 text-white"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <p className="mt-2 break-all text-xs text-brand-dark/45">
                      {draft.file.name}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="标题">
                      <input className={inputClass} value={draft.title} onChange={(event) => updateDraft(draft.id, 'title', event.target.value)} />
                    </Field>
                    <Field label="英文标题">
                      <input className={inputClass} value={draft.titleEn} onChange={(event) => updateDraft(draft.id, 'titleEn', event.target.value)} />
                    </Field>
                    <Field label="分类">
                      <select className={inputClass} value={draft.category} onChange={(event) => updateDraft(draft.id, 'category', event.target.value as PhotoCategory)}>
                        {photoCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
                      </select>
                    </Field>
                    <Field label="拍摄日期">
                      <input type="date" className={inputClass} value={draft.shootDate} onChange={(event) => updateDraft(draft.id, 'shootDate', event.target.value)} />
                    </Field>
                    <Field label="地点">
                      <input className={inputClass} value={draft.location} onChange={(event) => updateDraft(draft.id, 'location', event.target.value)} />
                    </Field>
                    <Field label="英文地点">
                      <input className={inputClass} value={draft.locationEn} onChange={(event) => updateDraft(draft.id, 'locationEn', event.target.value)} />
                    </Field>
                    <Field label="描述">
                      <textarea rows={3} className={inputClass} value={draft.description} onChange={(event) => updateDraft(draft.id, 'description', event.target.value)} />
                    </Field>
                    <Field label="英文描述">
                      <textarea rows={3} className={inputClass} value={draft.descriptionEn} onChange={(event) => updateDraft(draft.id, 'descriptionEn', event.target.value)} />
                    </Field>
                    <div className="flex items-center gap-6 text-sm sm:col-span-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={draft.featured} onChange={(event) => updateDraft(draft.id, 'featured', event.target.checked)} />
                        精选作品
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={draft.published} onChange={(event) => updateDraft(draft.id, 'published', event.target.checked)} />
                        公开展示
                      </label>
                    </div>
                  </div>
                </article>
              ))}
              <button
                type="submit"
                disabled={isUploading}
                className="inline-flex items-center gap-2 bg-brand-dark px-6 py-3 text-sm text-white transition-colors hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload aria-hidden="true" className="h-4 w-4" />
                {isUploading ? '正在上传...' : `上传 ${drafts.length} 张照片`}
              </button>
            </form>
          )}
          {uploadStatus && <p className="mt-4 text-sm text-brand-dark/65">{uploadStatus}</p>}
        </section>

        {editingPhoto && (
          <section className="border-y border-brand-dark/10 bg-white/45 py-8">
            <form onSubmit={handleSaveEdit} className="mx-auto max-w-4xl px-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl tracking-tight">编辑照片信息</h2>
                <button type="button" onClick={() => setEditingPhoto(null)} aria-label="关闭编辑">
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="标题"><input className={inputClass} value={editingPhoto.title} onChange={(event) => setEditingPhoto({ ...editingPhoto, title: event.target.value })} /></Field>
                <Field label="英文标题"><input className={inputClass} value={editingPhoto.titleEn} onChange={(event) => setEditingPhoto({ ...editingPhoto, titleEn: event.target.value })} /></Field>
                <Field label="分类"><select className={inputClass} value={editingPhoto.category} onChange={(event) => setEditingPhoto({ ...editingPhoto, category: event.target.value as PhotoCategory })}>{photoCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></Field>
                <Field label="拍摄日期"><input type="date" className={inputClass} value={editingPhoto.shootDate} onChange={(event) => setEditingPhoto({ ...editingPhoto, shootDate: event.target.value })} /></Field>
                <Field label="地点"><input className={inputClass} value={editingPhoto.location} onChange={(event) => setEditingPhoto({ ...editingPhoto, location: event.target.value })} /></Field>
                <Field label="英文地点"><input className={inputClass} value={editingPhoto.locationEn} onChange={(event) => setEditingPhoto({ ...editingPhoto, locationEn: event.target.value })} /></Field>
                <Field label="描述"><textarea rows={3} className={inputClass} value={editingPhoto.description} onChange={(event) => setEditingPhoto({ ...editingPhoto, description: event.target.value })} /></Field>
                <Field label="英文描述"><textarea rows={3} className={inputClass} value={editingPhoto.descriptionEn} onChange={(event) => setEditingPhoto({ ...editingPhoto, descriptionEn: event.target.value })} /></Field>
                <Field label="排序"><input type="number" className={inputClass} value={editingPhoto.sortOrder} onChange={(event) => setEditingPhoto({ ...editingPhoto, sortOrder: Number(event.target.value) })} /></Field>
                <div className="flex items-end gap-6 pb-2 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editingPhoto.featured} onChange={(event) => setEditingPhoto({ ...editingPhoto, featured: event.target.checked })} />精选</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editingPhoto.published} onChange={(event) => setEditingPhoto({ ...editingPhoto, published: event.target.checked })} />公开</label>
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="mt-6 bg-brand-dark px-6 py-3 text-sm text-white transition-colors hover:bg-brand-green disabled:opacity-50">
                {isSaving ? '正在保存...' : '保存修改'}
              </button>
            </form>
          </section>
        )}

        <section className="py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl tracking-tight">作品列表</h2>
              <p className="mt-1 text-sm text-brand-dark/50">共 {photos.length} 张照片</p>
            </div>
            {listStatus && <p className="text-sm text-brand-dark/60">{listStatus}</p>}
          </div>

          {isLoadingPhotos && <p className="mt-6 text-brand-dark/50">正在载入...</p>}
          {!isLoadingPhotos && photos.length === 0 && <p className="mt-6 text-brand-dark/50">还没有照片，请先上传。</p>}
          <div className="mt-6 space-y-3">
            {photos.map((photo) => (
              <article key={photo.id} className="grid items-center gap-4 border-t border-brand-dark/10 py-4 sm:grid-cols-[100px_1fr_auto]">
                <img src={photo.thumbnailUrl} alt={photo.title || '照片缩略图'} className="h-24 w-24 object-cover" />
                <div className="min-w-0">
                  <h3 className="truncate">{photo.title || photo.titleEn || '未命名照片'}</h3>
                  <p className="mt-1 text-sm text-brand-dark/50">
                    {categoryLabels[photo.category]}{photo.shootDate ? ` · ${photo.shootDate}` : ''} · 排序 {photo.sortOrder}
                  </p>
                  <div className="mt-2 flex gap-3 text-xs">
                    {photo.featured && <span>精选</span>}
                    <span className={photo.published ? 'text-green-800' : 'text-brand-dark/40'}>{photo.published ? '已公开' : '未公开'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <button type="button" onClick={() => setEditingPhoto({ ...photo })} className="flex items-center gap-1.5 transition-opacity hover:opacity-60"><Pencil aria-hidden="true" className="h-4 w-4" />编辑</button>
                  <button type="button" onClick={() => handleDelete(photo)} className="flex items-center gap-1.5 text-red-800 transition-opacity hover:opacity-60"><Trash2 aria-hidden="true" className="h-4 w-4" />删除</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
