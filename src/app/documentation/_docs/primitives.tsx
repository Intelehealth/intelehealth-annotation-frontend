import { ReactNode } from 'react'

// Plain, server-renderable building blocks for the user docs. No hooks, no
// motion, and no next/link (a client reference) — so the search-index route can
// render every page to static markup with react-dom/server.

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} data-section={id}>
      <a href={`#${id}`}>{children}</a>
    </h2>
  )
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return <h3 id={id}>{children}</h3>
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="steps">{children}</ol>
}

export function Step({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <li>
      <strong>{title}</strong>
      {children}
    </li>
  )
}

export function Callout({ kind = 'note', children }: { kind?: 'note' | 'warn'; children: ReactNode }) {
  return (
    <div className="callout" data-kind={kind}>
      <p>{children}</p>
    </div>
  )
}

export function Table({ head, rows }: { head: string[]; rows: (ReactNode | string)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Internal doc link by slug (+ optional section anchor). A plain anchor on
 *  purpose: it has to render server-side in the search index. */
export function D({ to, hash, children }: { to: string; hash?: string; children: ReactNode }) {
  return <a href={`/documentation/${to}${hash ? `#${hash}` : ''}`}>{children}</a>
}
