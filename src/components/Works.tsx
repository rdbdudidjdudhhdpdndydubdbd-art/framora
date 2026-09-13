import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  photoFilters,
  type Language,
  type Photo,
  type PhotoFilter,
} from '../types'

type WorksProps = {
  language: Language
  selectedCategory: PhotoFilter
  onCategoryChange: (category: PhotoFilter) => void
}

const worksTranslations = {
  'zh-CN': {
    title: '作品',
    categories: {
      all: '全部',
      city: '城市',
      travel: '旅行',
      portrait: '人像',
      landscape: '风景',
      daily: '日常',
    },
    loading: '正在载入摄影作品…',
    empty: '还没有发布摄影作品。',
    error: '暂时无法载入摄影作品。',
    photograph: '摄影作品',
    close: '关闭大图',
    previous: '上一张',
    next: '下一张',
  },
  en: {
    title: 'Selected Works',
    categories: {
      all: 'All',
      city: 'City',
      travel: 'Travel',
      portrait: 'Portrait',
      landscape: 'Landscape',
      daily: 'Daily',
    },
    loading: 'Loading photographs…',
    empty: 'No photographs published yet.',
    error: 'Photographs are temporarily unavailable.',
    photograph: 'Photograph',
    close: 'Close photograph',
    previous: 'Previous photograph',
    next: 'Next photograph',
  },
} as const

type ViewerProps = {
  language: Language
  photos: Photo[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

function localizedPhotoField(
  language: Language,
  chineseValue: string,
  englishValue: string,
) {
  return language === 'en' ? englishValue || chineseValue : chineseValue
}

// 部署在 GitHub Pages 子路径（如 /repo/）时，图片路径需要带上 base 前缀。
function withBase(url: string) {
  return `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`
}

function PhotoViewer({
  language,
  photos,
  index,
  onClose,
  onIndexChange,
}: ViewerProps) {
  const copy = worksTranslations[language]
  const photo = photos[index]

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') {
        onIndexChange((index - 1 + photos.length) % photos.length)
      }
      if (event.key === 'ArrowRight') {
        onIndexChange((index + 1) % photos.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [index, onClose, onIndexChange, photos.length])

  if (!photo) return null

  const title = localizedPhotoField(language, photo.title, photo.titleEn)
  const location = localizedPhotoField(
    language,
    photo.location,
    photo.locationEn,
  )
  const description = localizedPhotoField(
    language,
    photo.description,
    photo.descriptionEn,
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || copy.photograph}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-5 py-6 text-white md:px-12 md:py-8"
    >
      <button
        type="button"
        aria-label={copy.close}
        onClick={onClose}
        className="absolute right-5 top-5 z-10 p-2 text-white/80 transition-opacity hover:opacity-60 md:right-8 md:top-7"
      >
        <X aria-hidden="true" className="h-7 w-7" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label={copy.previous}
            onClick={() =>
              onIndexChange((index - 1 + photos.length) % photos.length)
            }
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 p-3 text-white/75 transition-opacity hover:opacity-60 md:left-6"
          >
            <ChevronLeft aria-hidden="true" className="h-8 w-8" />
          </button>
          <button
            type="button"
            aria-label={copy.next}
            onClick={() => onIndexChange((index + 1) % photos.length)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 p-3 text-white/75 transition-opacity hover:opacity-60 md:right-6"
          >
            <ChevronRight aria-hidden="true" className="h-8 w-8" />
          </button>
        </>
      )}

      <div className="flex max-h-full w-full max-w-[90vw] flex-col items-center">
        <img
          src={withBase(photo.originalUrl)}
          alt={title || copy.photograph}
          className="max-h-[78vh] max-w-[90vw] object-contain md:max-h-[85vh]"
        />
        {(title || location || photo.shootDate || description) && (
          <div className="mt-4 w-full max-w-3xl text-center text-sm text-white/70">
            {title && <h3 className="text-base text-white">{title}</h3>}
            {(location || photo.shootDate) && (
              <p className="mt-1">
                {[location, photo.shootDate].filter(Boolean).join(' · ')}
              </p>
            )}
            {description && <p className="mx-auto mt-2 max-w-2xl">{description}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Works({
  language,
  selectedCategory,
  onCategoryChange,
}: WorksProps) {
  const copy = worksTranslations[language]
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPhotos() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}photos.json`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Unable to load photographs')
        setPhotos(await response.json())
        setError(false)
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') setError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPhotos()
    return () => controller.abort()
  }, [])

  const filteredPhotos = useMemo(
    () =>
      selectedCategory === 'all'
        ? photos
        : photos.filter((photo) => photo.category === selectedCategory),
    [photos, selectedCategory],
  )

  useEffect(() => {
    setViewerIndex(null)
  }, [selectedCategory])

  return (
    <section id="works" className="bg-brand-cream py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12 md:mb-16">
          <h2 className="text-2xl tracking-tight text-brand-dark md:text-3xl">
            {copy.title}
          </h2>
          <div
            role="group"
            aria-label={copy.title}
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm tracking-wide text-brand-dark"
          >
            {photoFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={selectedCategory === filter}
                onClick={() => onCategoryChange(filter)}
                className={`transition-opacity hover:opacity-70 ${
                  selectedCategory === filter ? 'opacity-100' : 'opacity-40'
                }`}
              >
                {copy.categories[filter]}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-brand-dark/50">{copy.loading}</p>}
        {!loading && error && <p className="text-brand-dark/50">{copy.error}</p>}
        {!loading && !error && filteredPhotos.length === 0 && (
          <p className="text-brand-dark/50">{copy.empty}</p>
        )}

        {!loading && !error && filteredPhotos.length > 0 && (
          <div className="columns-1 gap-5 md:columns-2 lg:columns-3">
            {filteredPhotos.map((photo, index) => {
              const title = localizedPhotoField(
                language,
                photo.title,
                photo.titleEn,
              )

              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setViewerIndex(index)}
                  className="mb-5 block w-full break-inside-avoid text-left"
                >
                  <img
                    src={withBase(photo.thumbnailUrl)}
                    alt={title || copy.photograph}
                    loading="lazy"
                    className="block h-auto w-full transition duration-300 hover:opacity-90 md:hover:scale-[1.01]"
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <PhotoViewer
          language={language}
          photos={filteredPhotos}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
        />
      )}
    </section>
  )
}
