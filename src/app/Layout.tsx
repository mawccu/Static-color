import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDb } from '../data/db'
import { useLang, useT } from '../i18n'
import { Icon, type IconName } from '../ui'
import type { DictKey } from '../i18n'

interface NavItem {
  to: string
  key: DictKey
  icon: IconName
}

interface NavGroup {
  key: DictKey
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    key: 'nav.operations',
    items: [
      { to: '/', key: 'nav.dashboard', icon: 'dashboard' },
      { to: '/jobs', key: 'nav.jobs', icon: 'job' },
      { to: '/samples', key: 'nav.lab', icon: 'flask' },
      { to: '/quality', key: 'nav.quality', icon: 'shield' },
    ],
  },
  {
    key: 'nav.library',
    items: [
      { to: '/dyes', key: 'nav.dyes', icon: 'dye' },
      { to: '/chemicals', key: 'nav.chemicals', icon: 'chem' },
      { to: '/wash-types', key: 'nav.washTypes', icon: 'wash' },
      { to: '/machines', key: 'nav.machines', icon: 'machine' },
      { to: '/fabrics', key: 'nav.fabrics', icon: 'fabric' },
    ],
  },
  {
    key: 'nav.money',
    items: [
      { to: '/clients', key: 'nav.clients', icon: 'users' },
      { to: '/estimates', key: 'nav.estimates', icon: 'doc' },
      { to: '/invoices', key: 'nav.invoices', icon: 'doc' },
      { to: '/cashbook', key: 'nav.cashbook', icon: 'cash' },
      { to: '/reports', key: 'nav.reports', icon: 'chart' },
    ],
  },
]

export default function Layout() {
  const { t, pick } = useT()
  const { lang, toggle } = useLang()
  const { db } = useDb()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const company =
    pick(db.settings.companyName, db.settings.companyNameAr) || t('app.name')

  const nav = (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div className="flex items-center gap-2.5 px-1">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white shadow-lg shadow-brand-900/30">
          <Icon name="dye" size={19} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{company}</p>
          <p className="truncate text-[11px] text-ink-400">{t('app.tagline')}</p>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.key}>
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-ink-500">
            {t(g.key)}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-300'
                        : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon name={it.icon} size={17} />
                  <span className="truncate">{t(it.key)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-auto space-y-0.5">
        <NavLink
          to="/settings"
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-brand-500/15 text-brand-300'
                : 'text-ink-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Icon name="gear" size={17} />
          {t('nav.settings')}
        </NavLink>
        <button
          onClick={toggle}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-300 transition hover:bg-white/5 hover:text-white"
        >
          <Icon name="globe" size={17} />
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-full">
      {/* desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-ink-900 lg:block no-print">
        {nav}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div
            className="absolute inset-0 bg-ink-950/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-64 bg-ink-900 shadow-2xl">
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden no-print">
          <button className="btn-quiet btn-sm" onClick={() => setOpen(true)}>
            <Icon name="dashboard" />
          </button>
          <span className="text-sm font-bold">{company}</span>
          <button className="btn-quiet btn-sm ms-auto" onClick={toggle}>
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </header>

        <main key={location.pathname} className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
