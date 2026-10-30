import type { CSSProperties } from 'react'
import { icon, type IconName } from '../lib/assets'

// 介面用的細線圖示（24×24、stroke 1.8）。料理與功能插圖用 <Art>（3D 生成圖）。
const P: Record<string, string> = {
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M8.5 8.5h.01|M15.5 8.5h.01|M12 12h.01|M8.5 15.5h.01|M15.5 15.5h.01',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M15.5 8.5l-2 5-5 2 2-5z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1|M16 3.2a4 4 0 0 1 0 7.6|M22 21v-1a6 6 0 0 0-4-5.6',
  cards: 'M8 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z|M3 7v11a3 3 0 0 0 3 3',
  user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z|M4 21a8 8 0 0 1 16 0',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M21 21l-4.3-4.3',
  sliders: 'M4 6h10|M18 6h2|M16 4v4|M4 12h4|M12 12h8|M10 10v4|M4 18h12|M20 18h0|M18 16v4',
  list: 'M8 6h13|M8 12h13|M8 18h13|M3.5 6h.01|M3.5 12h.01|M3.5 18h.01',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z|M9 4v14|M15 6v14',
  pin: 'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3 2',
  phone: 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  nav: 'M3 11l18-8-8 18-2-8z',
  share: 'M12 15V3|M8 7l4-4 4 4|M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1|M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  back: 'M15 5l-7 7 7 7',
  chev: 'M9 5l7 7-7 7',
  down: 'M6 9l6 6 6-6',
  heart: 'M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z',
  x: 'M6 6l12 12|M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  refresh: 'M20 11a8 8 0 0 0-14.7-4.3L4 8|M4 3v5h5|M4 13a8 8 0 0 0 14.7 4.3L20 16|M20 21v-5h-5',
  external: 'M14 4h6v6|M20 4l-9 9|M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  tag: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z|M7.5 7.5h.01',
  note: 'M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z|M9 12h6|M9 16h6|M9 8h3',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M5.6 5.6l12.8 12.8',
  plus: 'M12 5v14|M5 12h14',
  flag: 'M5 21V4|M5 4h11l-2 4 2 4H5',
  bot: 'M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z|M12 4v4|M9 14h.01|M15 14h.01',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z|M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  download: 'M12 3v12|M7 10l5 5 5-5|M5 21h14',
  upload: 'M12 15V3|M7 8l5-5 5 5|M5 21h14',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M3 12h18|M12 3a14 14 0 0 1 0 18|M12 3a14 14 0 0 0 0 18',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z|M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 11v5|M12 8h.01',
  walk: 'M13 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z|M10 21l2-6 3 3v3|M8 12l2-4 4 1 2 4h3|M12 15l-1-6',
  wallet: 'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11|M16 14h.01',
}

export type IcoName = keyof typeof P

export function Ico({ name, size = 20, stroke = 1.8, fill, style, className }: {
  name: IcoName; size?: number; stroke?: number; fill?: boolean; style?: CSSProperties; className?: string
}) {
  return (
    <svg className={`ico ${className ?? ''}`} width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {P[name].split('|').map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

/** 3D 插圖圖示（料理、骰子、獎盃…） */
export function Art({ name, size = 28, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <img className={`art ${className ?? ''}`} src={icon(name)} width={size} height={size} alt="" draggable={false} style={style} />
}
