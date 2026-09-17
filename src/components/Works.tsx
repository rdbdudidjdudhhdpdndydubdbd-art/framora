import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
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
      wedding: '婚礼',
    },
    loading: '正在载入摄影作品…',
    empty: '还没有发布摄影作品。',
    error: '暂时无法载入摄影作品。',
    photograph: '摄影作品',
    close: '关闭大图',
    previous: '上一张',
    next: '下一张',
    previousPage: '上一页',
    nextPage: '下一页',
    pageIndicator: '第 {page} / {total} 页',
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
      wedding: 'Wedding',
    },
    loading: 'Loading photographs…',
    empty: 'No photographs published yet.',
    error: 'Photographs are temporarily unavailable.',
    photograph: 'Photograph',
    close: 'Close photograph',
    previous: 'Previous photograph',
    next: 'Next photograph',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    pageIndicator: 'Page {page} of {total}',
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
      className="animate-zoom-in fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-5 py-6 text-white md:px-12 md:py-8"
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

// 单张照片卡片：进入视口时错落浮现（苹果官网式滚动动效）。
// 宽高由行式布局计算后传入，图片以 object-cover 填满。
function PhotoCard({
  photo,
  title,
  index,
  language,
  width,
  rowHeight,
  onOpen,
}: {
  photo: Photo
  title: string
  index: number
  language: Language
  width: number
  rowHeight: number
  onOpen: () => void
}) {
  const copy = worksTranslations[language]
  const { ref, revealed } = useReveal<HTMLButtonElement>({
    threshold: 0.05,
    rootMargin: '0px 0px -5% 0px',
  })
  const delay = Math.min(index, 10) * 55

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      style={{
        width: `${width}px`,
        height: `${rowHeight}px`,
        transitionDelay: `${delay}ms`,
      }}
      className={`shrink-0 text-left transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        revealed
          ? 'translate-y-0 scale-100 opacity-100 blur-0'
          : 'translate-y-6 scale-[0.97] opacity-0 blur-[2px]'
      }`}
    >
      <img
        src={withBase(photo.thumbnailUrl)}
        alt={title || copy.photograph}
        loading="lazy"
        className="block h-full w-full object-cover transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:shadow-xl"
      />
    </button>
  )
}

// 行式对齐布局（Unsplash 风格）：每行照片等高、上下对齐，行与行高度错落，
// 整行恰好填满容器宽度（左右对齐）。贪心算法：按目标行高累计照片，
// 一行宽度超过容器后按比例微调该行高度，使行宽精确等于容器宽。
const PER_PAGE = 12

type PhotoRow = { photos: Photo[]; rowHeight: number }

function computeRows(
  photos: Photo[],
  containerWidth: number,
  targetRowHeight: number,
  gap: number,
): PhotoRow[] {
  if (containerWidth <= 0) return []
  const rows: PhotoRow[] = []
  let row: Photo[] = []
  let naturalWidth = 0

  const ratioOf = (photo: Photo) =>
    (photo.width || 1) / (photo.height || 1)

  for (const photo of photos) {
    row.push(photo)
    naturalWidth += ratioOf(photo) * targetRowHeight

    if (naturalWidth >= containerWidth) {
      const scale =
        (containerWidth - gap * (row.length - 1)) / naturalWidth
      rows.push({ photos: row, rowHeight: Math.round(targetRowHeight * scale) })
      row = []
      naturalWidth = 0
    }
  }

  // 最后一行不满时按目标行高显示，不强行拉伸。
  if (row.length > 0) rows.push({ photos: row, rowHeight: targetRowHeight })
  return rows
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
  const [page, setPage] = useState(1)
  const [containerWidth, setContainerWidth] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const { ref: sectionRef, revealed } = useReveal<HTMLElement>()

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

  // 监听作品区容器宽度，行式布局随窗口/屏幕尺寸重新计算。
  // 网格只在照片加载完成后才渲染：首次挂载时 gridRef 还是空引用，
  // 因此依赖里必须包含加载状态与照片数量，等网格出现后重建观察器，
  // 否则 containerWidth 一直为 0、照片永远不显示。
  useEffect(() => {
    const element = gridRef.current
    if (!element) return

    // 不支持 ResizeObserver 的环境退化为容器/窗口宽度（窗口缩放不实时重排）。
    if (typeof ResizeObserver === 'undefined') {
      const measure = () => setContainerWidth(element.clientWidth)
      measure()
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [loading, error, filteredPhotos.length])

  const totalPages = Math.max(1, Math.ceil(filteredPhotos.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const pagePhotos = useMemo(
    () => filteredPhotos.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
    [filteredPhotos, currentPage],
  )

  // 响应式目标行高与间距：桌面大行、移动端小行。
  const gap = containerWidth >= 768 ? 20 : 16
  const targetRowHeight = containerWidth >= 1024 ? 300 : containerWidth >= 640 ? 260 : 200
  const rows = useMemo(
    () => computeRows(pagePhotos, containerWidth, targetRowHeight, gap),
    [pagePhotos, containerWidth, targetRowHeight, gap],
  )

  function goToPage(nextPage: number) {
    setPage(nextPage)
    setViewerIndex(null)
    // 翻页后回到作品区顶部，让照片从第一张开始重新错落浮现。
    window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    setViewerIndex(null)
    setPage(1)
  }, [selectedCategory])

  return (
    <section
      id="works"
      ref={sectionRef}
      className={`snap-section min-h-screen bg-brand-cream py-20 transition-all duration-700 ease-out md:py-28 ${
        revealed ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
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
          <>
            <div ref={gridRef} className="flex flex-col" style={{ gap: `${gap}px` }}>
              {rows.map((row, rowIndex) => {
                const rowStartIndex = rows
                  .slice(0, rowIndex)
                  .reduce((count, r) => count + r.photos.length, 0)

                return (
                  <div
                    key={`${currentPage}-${rowIndex}`}
                    className="flex w-full"
                    style={{ gap: `${gap}px`, height: `${row.rowHeight}px` }}
                  >
                    {row.photos.map((photo, photoIndex) => {
                      const title = localizedPhotoField(
                        language,
                        photo.title,
                        photo.titleEn,
                      )
                      const width = Math.round(
                        ((photo.width || 1) / (photo.height || 1)) * row.rowHeight,
                      )

                      return (
                        <PhotoCard
                          key={`p${currentPage}-${photo.id}`}
                          photo={photo}
                          title={title}
                          index={rowStartIndex + photoIndex}
                          language={language}
                          width={width}
                          rowHeight={row.rowHeight}
                          onOpen={() =>
                            setViewerIndex(rowStartIndex + photoIndex)
                          }
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-6 text-sm tracking-wide text-brand-dark md:mt-12">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className={`transition-opacity hover:opacity-60 ${
                    currentPage <= 1 ? 'cursor-default opacity-30' : ''
                  }`}
                >
                  ‹ {copy.previousPage}
                </button>
                <span className="text-brand-dark/50">
                  {copy.pageIndicator
                    .replace('{page}', String(currentPage))
                    .replace('{total}', String(totalPages))}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  className={`transition-opacity hover:opacity-60 ${
                    currentPage >= totalPages ? 'cursor-default opacity-30' : ''
                  }`}
                >
                  {copy.nextPage} ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {viewerIndex !== null && (
        <PhotoViewer
          language={language}
          photos={pagePhotos}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
        />
      )}
    </section>
  )
}
