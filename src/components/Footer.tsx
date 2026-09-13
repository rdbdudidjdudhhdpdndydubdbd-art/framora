import type { Language } from '../types'

// TODO: 部署前替换为真实邮箱
const CONTACT_EMAIL = 'your-email@example.com'

const footerTranslations = {
  'zh-CN': {
    heading: '联系我',
    hint: '欢迎交流摄影与拍摄合作',
    emailLabel: '发送邮件',
    copyright: `© ${new Date().getFullYear()} Framora. 保留所有权利。`,
  },
  en: {
    heading: 'Contact',
    hint: 'Open to photography projects and collaborations',
    emailLabel: 'Send an email',
    copyright: `© ${new Date().getFullYear()} Framora. All rights reserved.`,
  },
} as const

export default function Footer({ language }: { language: Language }) {
  const copy = footerTranslations[language]

  return (
    <footer
      id="contact"
      className="border-t border-brand-dark/10 bg-brand-cream py-16 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
        <h2 className="font-helvetica-neue text-2xl tracking-tight text-brand-dark md:text-3xl">
          {copy.heading}
        </h2>
        <p className="mt-3 text-sm text-brand-dark/55">{copy.hint}</p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          aria-label={`${copy.emailLabel}（${CONTACT_EMAIL}）`}
          className="mt-6 inline-block border-b border-brand-dark/30 pb-1 text-lg text-brand-dark transition-opacity hover:opacity-70"
        >
          {CONTACT_EMAIL}
        </a>
        <p className="mt-12 text-xs uppercase tracking-[0.25em] text-brand-dark/40">
          {copy.copyright}
        </p>
      </div>
    </footer>
  )
}
