import { PLATFORM_STATUS } from '@/lib/site-status'

/** The footer's platform status widget. Reads from `lib/site-status`. */
export function PlatformStatus() {
  return (
    <div className="platforms">
      {PLATFORM_STATUS.map(p => (
        <span key={p.name}>
          <i className={p.shipped ? 'live' : undefined} /> {p.name}: {p.status}
        </span>
      ))}
    </div>
  )
}
