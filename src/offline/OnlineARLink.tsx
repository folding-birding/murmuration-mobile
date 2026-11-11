import './online-ar-link.css'

export function OnlineARLink({ href }: { href: string }) {
  return <div className="online-ar-link"><a href={href} target="_blank" rel="noopener noreferrer">{href}</a></div>
}
