export function PageHeader({ title, lede }: { title: string; lede?: string }) {
  return <header className="page-header shell">
    <h1 className="page-title">{title}</h1>
    {lede && <p className="page-lede measure">{lede}</p>}
    <div className="hairline page-header-rule" />
  </header>;
}
