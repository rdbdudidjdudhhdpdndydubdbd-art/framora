export type Language = 'zh-CN' | 'en'

export type PhotoCategory =
  | 'city'
  | 'travel'
  | 'portrait'
  | 'landscape'
  | 'daily'

export type PhotoFilter = 'all' | PhotoCategory

export type Photo = {
  id: string
  filename: string
  originalUrl: string
  thumbnailUrl: string
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
  sortOrder: number
  createdAt: string
}

export const photoCategories: PhotoCategory[] = [
  'city',
  'travel',
  'portrait',
  'landscape',
  'daily',
]

export const photoFilters: PhotoFilter[] = ['all', ...photoCategories]
