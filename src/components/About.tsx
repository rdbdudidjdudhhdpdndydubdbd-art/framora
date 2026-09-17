import { useState } from 'react'
import { Triangle } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import type { Language } from '../types'

// 站长肖像：把图片放到 public/portrait.jpg 即会自动显示；没有则显示品牌占位图。
const PORTRAIT_URL = `${import.meta.env.BASE_URL}portrait.jpg`

const aboutTranslations = {
  'zh-CN': {
    eyebrow: '站长介绍',
    name: '鹏飞',
    tagline: '白天和设备、图纸打交道，晚上拿着相机到处找感觉。',
    paragraphs: [
      '喜欢拍人，也喜欢拍风景、城市和那些不经意的小瞬间。比起追求「大片」，我更在意照片里有没有一点真实的故事。',
      '偶尔认真摄影，偶尔随手乱拍。毕竟，生活已经够严肃了，照片就负责好看一点。',
    ],
    portraitLabel: '站长肖像',
    stats: [
      { value: '15 岁', label: '第一次接触相机' },
      { value: '20 岁', label: '开始萌生爱好' },
      { value: '如今', label: '已被工作和生活占据' },
    ],
  },
  en: {
    eyebrow: 'About the Photographer',
    name: 'Peng Fei',
    tagline: 'Days with equipment and drawings; nights wandering with a camera, looking for a feeling.',
    paragraphs: [
      'I love photographing people, and also landscapes, cities, and those unguarded little moments. Rather than chasing "epic shots", I care about whether a photo carries a bit of a true story.',
      'Sometimes I shoot seriously; sometimes I just snap away. Life is serious enough — photos are here to make it look a little better.',
    ],
    portraitLabel: 'Photographer portrait',
    stats: [
      { value: 'Age 15', label: 'First touched a camera' },
      { value: 'Age 20', label: 'A hobby began to bloom' },
      { value: 'Now', label: 'Taken over by work and life' },
    ],
  },
} as const

export default function About({ language }: { language: Language }) {
  const copy = aboutTranslations[language]
  const portrait = useReveal<HTMLDivElement>({ threshold: 0.2 })
  const intro = useReveal<HTMLDivElement>({ threshold: 0.2 })
  const [portraitFailed, setPortraitFailed] = useState(false)

  const revealClass = (revealed: boolean) =>
    revealed ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'

  return (
    <section
      id="about"
      className="snap-section flex min-h-screen items-center bg-brand-light py-20 md:py-28"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center md:gap-16 lg:px-8">
        <div
          ref={portrait.ref}
          style={{ transitionDelay: '0ms' }}
          className={`mx-auto w-full max-w-sm transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] md:max-w-none ${revealClass(portrait.revealed)}`}
        >
          {portraitFailed ? (
            <div className="flex aspect-[3/4] w-full items-center justify-center border border-brand-dark/10 bg-brand-dark/5">
              <Triangle
                aria-hidden="true"
                className="h-10 w-10 fill-brand-dark/25 text-brand-dark/25"
              />
            </div>
          ) : (
            <img
              src={PORTRAIT_URL}
              alt={copy.portraitLabel}
              onError={() => setPortraitFailed(true)}
              className="aspect-[3/4] w-full border border-brand-dark/10 object-cover"
            />
          )}
          <p className="mt-3 text-center text-xs uppercase tracking-[0.25em] text-brand-dark/40">
            {copy.portraitLabel}
          </p>
        </div>

        <div
          ref={intro.ref}
          style={{ transitionDelay: '150ms' }}
          className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${revealClass(intro.revealed)}`}
        >
          <p className="text-xs uppercase tracking-[0.25em] text-brand-dark/50">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 font-helvetica-neue text-3xl tracking-tight text-brand-dark md:text-4xl">
            {copy.name}
          </h2>
          <p className="mt-4 text-base text-brand-dark/70 md:text-lg">
            {copy.tagline}
          </p>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-brand-dark/65 md:text-base">
            {copy.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-brand-dark/10 pt-8">
            {copy.stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-helvetica-neue text-2xl tracking-tight text-brand-dark md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-brand-dark/45">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
