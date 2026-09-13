import { useEffect, useState } from 'react'
import { ArrowRight, Triangle } from 'lucide-react'
import AdminPage from './AdminPage'
import Footer from './components/Footer'
import Works from './components/Works'
import {
  photoCategories,
  type Language,
  type PhotoCategory,
  type PhotoFilter,
} from './types'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260820_010308_b1636845-4c15-4ab6-b0c9-9a29bfb0c6e3.mp4'

type Translation = {
  navigation: {
    works: string
    cta: string
  }
  announcement: string
  headline: {
    firstLine: string
    secondLine: string
  }
  backedBy: string
  brandName: string
  documentTitle: string
  categories: Record<PhotoCategory, string>
  language: {
    label: string
    chinese: string
    english: string
    separator: string
    switchToChinese: string
    switchToEnglish: string
  }
  accessibility: {
    primaryNavigation: string
    home: string
    toggleMenu: string
  }
}

const LANGUAGE_STORAGE_KEY = 'site-language'
const categoryStyles = [
  'font-playfair',
  'font-oswald uppercase',
  'font-montserrat',
  'font-roboto-slab uppercase',
  'font-raleway',
]

const translations: Record<Language, Translation> = {
  'zh-CN': {
    navigation: {
      works: '作品',
      cta: '联系我',
    },
    announcement: '记录光影，也记录生活。',
    headline: {
      firstLine: '用镜头记录城市、旅途与生活中的瞬间',
      secondLine: '',
    },
    backedBy: '浏览作品',
    brandName: 'Framora',
    documentTitle: 'Framora — 摄影作品集',
    categories: {
      city: '城市',
      travel: '旅行',
      portrait: '人像',
      landscape: '风景',
      daily: '日常',
    },
    language: {
      label: '语言选择',
      chinese: '中文',
      english: 'EN',
      separator: '/',
      switchToChinese: '切换到中文',
      switchToEnglish: '切换到英文',
    },
    accessibility: {
      primaryNavigation: '主导航',
      home: 'Framora 首页',
      toggleMenu: '切换菜单',
    },
  },
  en: {
    navigation: {
      works: 'Works',
      cta: 'Contact',
    },
    announcement: 'Capturing light, and life.',
    headline: {
      firstLine: 'Capturing moments in cities,',
      secondLine: 'journeys, and everyday life',
    },
    backedBy: 'Explore',
    brandName: 'Framora',
    documentTitle: 'Framora — Photography Portfolio',
    categories: {
      city: 'CITY',
      travel: 'TRAVEL',
      portrait: 'PORTRAIT',
      landscape: 'LANDSCAPE',
      daily: 'DAILY',
    },
    language: {
      label: 'Language selection',
      chinese: '中文',
      english: 'EN',
      separator: '/',
      switchToChinese: 'Switch to Chinese',
      switchToEnglish: 'Switch to English',
    },
    accessibility: {
      primaryNavigation: 'Primary navigation',
      home: 'Framora home',
      toggleMenu: 'Toggle menu',
    },
  },
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'

  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (savedLanguage === 'zh-CN' || savedLanguage === 'en') {
      return savedLanguage
    }
  } catch {
    // Fall back to the browser language when storage is unavailable.
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

type LanguageSwitcherProps = {
  language: Language
  copy: Translation
  onLanguageChange: (language: Language) => void
  mobile?: boolean
}

function LanguageSwitcher({
  language,
  copy,
  onLanguageChange,
  mobile = false,
}: LanguageSwitcherProps) {
  return (
    <div
      role="group"
      aria-label={copy.language.label}
      className={`flex items-center text-brand-dark ${
        mobile ? 'mt-2 gap-3 text-base' : 'gap-2 text-sm tracking-wide'
      }`}
    >
      <button
        type="button"
        aria-label={copy.language.switchToChinese}
        aria-pressed={language === 'zh-CN'}
        onClick={() => onLanguageChange('zh-CN')}
        className={`transition-opacity hover:opacity-70 ${
          language === 'zh-CN' ? 'opacity-100' : mobile ? 'opacity-40' : 'opacity-50'
        }`}
      >
        {copy.language.chinese}
      </button>
      <span aria-hidden="true">{copy.language.separator}</span>
      <button
        type="button"
        aria-label={copy.language.switchToEnglish}
        aria-pressed={language === 'en'}
        onClick={() => onLanguageChange('en')}
        className={`transition-opacity hover:opacity-70 ${
          language === 'en' ? 'opacity-100' : mobile ? 'opacity-40' : 'opacity-50'
        }`}
      >
        {copy.language.english}
      </button>
    </div>
  )
}

type LocalizedComponentProps = {
  language: Language
  copy: Translation
  onLanguageChange: (language: Language) => void
  onWorksClick: () => void
}

function Navbar({
  language,
  copy,
  onLanguageChange,
  onWorksClick,
}: LocalizedComponentProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <>
      <nav
        aria-label={copy.accessibility.primaryNavigation}
        className={`fixed left-0 right-0 top-0 z-50 transition duration-300 ${
          isScrolled
            ? 'bg-brand-cream/90 shadow-sm backdrop-blur-md'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative flex h-16 items-center md:h-20">
            <div className="animate-fade-down stagger-1 hidden items-center gap-8 md:flex">
              <button
                type="button"
                onClick={onWorksClick}
                className="text-sm uppercase tracking-wide text-brand-dark transition-opacity hover:opacity-70"
              >
                {copy.navigation.works}
              </button>
            </div>

            <a
              href="#hero"
              aria-label={copy.accessibility.home}
              className="animate-fade-down stagger-2 absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
            >
              <Triangle
                aria-hidden="true"
                className="h-5 w-5 fill-brand-dark text-brand-dark"
              />
              <span className="font-helvetica-neue text-xl tracking-tight text-brand-dark">
                {copy.brandName}
              </span>
            </a>

            <div className="animate-fade-down stagger-3 ml-auto hidden items-center gap-5 md:flex">
              <LanguageSwitcher
                language={language}
                copy={copy}
                onLanguageChange={onLanguageChange}
              />
              <a
                href="#contact"
                className="inline-flex items-center rounded-full bg-brand-dark px-5 py-2.5 text-sm uppercase tracking-wide text-white transition-colors hover:bg-brand-green"
              >
                {copy.navigation.cta}
              </a>
            </div>

            <button
              type="button"
              aria-label={copy.accessibility.toggleMenu}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="relative z-50 ml-auto h-10 w-10 md:hidden"
            >
              <span
                className={`absolute left-2 top-[6px] h-[2px] w-6 rounded bg-brand-dark transition-all duration-300 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] ${
                  isMenuOpen ? 'translate-y-[5px] rotate-45' : ''
                }`}
              />
              <span
                className={`absolute left-2 top-[13px] h-[2px] w-6 rounded bg-brand-dark transition-all duration-300 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] ${
                  isMenuOpen ? '-rotate-45' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      <div
        id="mobile-menu"
        aria-hidden={!isMenuOpen}
        className={`fixed inset-0 z-40 bg-brand-cream transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          isMenuOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          className={`flex h-full flex-col items-center justify-center gap-8 transition duration-500 delay-100 ${
            isMenuOpen
              ? 'translate-y-0 opacity-100'
              : '-translate-y-8 opacity-0'
          }`}
        >
          <a
            href="#works"
            tabIndex={isMenuOpen ? 0 : -1}
            onClick={(event) => {
              event.preventDefault()
              closeMenu()
              window.setTimeout(onWorksClick, 500)
            }}
            className="text-3xl tracking-tight text-brand-dark"
          >
            {copy.navigation.works}
          </a>
          <LanguageSwitcher
            language={language}
            copy={copy}
            onLanguageChange={onLanguageChange}
            mobile
          />
          <a
            href="#contact"
            tabIndex={isMenuOpen ? 0 : -1}
            onClick={closeMenu}
            className="mt-4 inline-flex items-center rounded-full bg-brand-dark px-8 py-3.5 text-lg tracking-wide text-white"
          >
            {copy.navigation.cta}
          </a>
        </div>
      </div>
    </>
  )
}

function CategoryLinks({
  copy,
  onCategorySelect,
}: {
  copy: Translation
  onCategorySelect: (category: PhotoCategory) => void
}) {
  return (
    <div className="animate-fade-up stagger-5 mt-8 w-full md:mt-10">
      <p className="mb-6 text-left font-helvetica-neue text-xs uppercase tracking-[0.25em] text-brand-dark/50 md:mb-8">
        {copy.backedBy}
      </p>
      <div className="animate-fade-up stagger-6 flex flex-wrap items-center justify-start gap-6 md:gap-12 lg:gap-16">
        {photoCategories.map((category, index) => (
          <button
            type="button"
            key={category}
            onClick={() => onCategorySelect(category)}
            className={`whitespace-nowrap text-lg text-brand-dark/80 transition-opacity hover:opacity-60 md:text-xl lg:text-2xl ${categoryStyles[index]}`}
          >
            {copy.categories[category]}
          </button>
        ))}
      </div>
    </div>
  )
}

function Hero({
  language,
  copy,
  onCategorySelect,
}: {
  language: Language
  copy: Translation
  onCategorySelect: (category: PhotoCategory) => void
}) {
  const [videoFailed, setVideoFailed] = useState(false)

  return (
    <section
      id="hero"
      className="relative h-screen min-h-[700px] w-full overflow-hidden bg-brand-cream"
    >
      {!videoFailed && (
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoFailed(true)}
            className="h-full w-full object-cover object-bottom"
          >
            <source src={VIDEO_URL} type="video/mp4" />
          </video>
        </div>
      )}

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start px-6 pt-28 md:pt-36 lg:px-8">
        <a
          href="#works"
          className="animate-fade-up stagger-3 mb-5 inline-flex items-center gap-2 rounded-full border border-brand-dark/15 bg-white/60 px-4 py-2 backdrop-blur-sm transition-colors hover:bg-white/80 md:mb-6"
        >
          <span className="text-sm text-brand-dark">
            {copy.announcement}
          </span>
          <ArrowRight
            aria-hidden="true"
            className="h-3.5 w-3.5 text-brand-dark"
          />
        </a>

        <h1 className="animate-fade-up stagger-4 max-w-4xl text-left font-helvetica-neue text-3xl leading-[1.05] tracking-tight text-brand-dark sm:text-4xl md:text-5xl lg:text-6xl">
          {copy.headline.firstLine}
          {language === 'en' && (
            <>
              <br className="hidden sm:block" />{' '}
              {copy.headline.secondLine}
            </>
          )}
        </h1>

        <CategoryLinks copy={copy} onCategorySelect={onCategorySelect} />
      </div>
    </section>
  )
}

function AdminUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-6 py-16 text-brand-dark">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-brand-dark/45">
          Framora
        </p>
        <h1 className="mt-4 text-2xl tracking-tight">管理后台仅本地可用</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-dark/55">
          线上为静态站点。照片管理请在本机运行 <code>npm run dev</code>{' '}
          后访问 <code>/admin</code>。
        </p>
        <a
          href={import.meta.env.BASE_URL}
          className="mt-6 inline-block border-b border-brand-dark/30 pb-1 text-sm text-brand-dark transition-opacity hover:opacity-70"
        >
          返回网站
        </a>
      </div>
    </main>
  )
}

export default function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const [selectedCategory, setSelectedCategory] = useState<PhotoFilter>('all')
  const copy = translations[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = translations[language].documentTitle

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // The language still works for the current visit when storage is unavailable.
    }
  }, [language])

  function showWorks(category: PhotoFilter = 'all') {
    setSelectedCategory(category)
    window.requestAnimationFrame(() => {
      document.getElementById('works')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  if (window.location.pathname === '/admin') {
    return import.meta.env.PROD ? <AdminUnavailable /> : <AdminPage />
  }

  return (
    <div className="font-helvetica-neue antialiased">
      <Navbar
        language={language}
        copy={copy}
        onLanguageChange={setLanguage}
        onWorksClick={() => showWorks('all')}
      />
      <main>
        <Hero
          language={language}
          copy={copy}
          onCategorySelect={showWorks}
        />
        <Works
          language={language}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </main>
      <Footer language={language} />
    </div>
  )
}
