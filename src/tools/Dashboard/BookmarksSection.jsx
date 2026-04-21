import { useMemo } from 'react'
import { Link2, ExternalLink, Copy, ChevronRight, Folder } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useCloudState from '../../hooks/useCloudState'
import { copyWithHistory } from '../../utils/copyWithHistory'
import Favicon from '../URLManager/Favicon'
import { normalizeBookmarks, getDomain, DEFAULT_BOOKMARKS } from '../URLManager/utils'

function BookmarkItem({ entry }) {
  const handleOpen = () => { try { window.open(entry.url, '_blank', 'noopener,noreferrer') } catch { /* ignore */ } }
  const handleCopy = (e) => { e.stopPropagation(); copyWithHistory(entry.url, 'URL copied') }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') handleOpen() }}
      className="forge-card"
      style={{
        padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        border: '1px solid var(--border)', transition: 'border-color 0.15s, transform 0.1s',
        minWidth: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
      title={entry.url}
    >
      <Favicon url={entry.url} size={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.title || getDomain(entry.url)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {getDomain(entry.url)}
        </div>
      </div>
      <button
        onClick={handleCopy}
        title="Copy URL"
        style={{ background: 'transparent', border: 'none', padding: 4, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
      >
        <Copy size={13} />
      </button>
      <ExternalLink size={13} style={{ color: 'var(--text-muted)', opacity: 0.45, flexShrink: 0 }} />
    </div>
  )
}

function GroupCluster({ group }) {
  const visible = (group.urls || []).slice(0, 6)
  const extra = (group.urls?.length || 0) - visible.length
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: group.color || 'var(--accent)' }} />
        <Folder size={13} style={{ color: 'var(--text-muted)' }} />
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{group.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
          {group.urls?.length || 0}
        </div>
      </div>
      {visible.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 16 }}>No URLs yet</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {visible.map((e) => <BookmarkItem key={e.id} entry={e} />)}
        </div>
      )}
      {extra > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, paddingLeft: 16 }}>
          + {extra} more
        </div>
      )}
    </div>
  )
}

export default function BookmarksSection() {
  const navigate = useNavigate()
  const [rawBookmarks] = useCloudState('url-bookmarks', DEFAULT_BOOKMARKS)
  const bookmarks = useMemo(() => normalizeBookmarks(rawBookmarks), [rawBookmarks])

  const groupCount = bookmarks.groups.length
  const total = bookmarks.groups.reduce((acc, g) => acc + (g.urls?.length || 0), 0) + bookmarks.ungrouped.length

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link2 size={14} style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-ui)' }}>
            Saved URLs
          </h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', opacity: 0.7 }}>
            {total} total · {groupCount} {groupCount === 1 ? 'group' : 'groups'}
          </span>
        </div>
        <button onClick={() => navigate('/urls')} className="forge-btn" style={{ padding: '6px 12px', fontSize: 12, gap: 4 }}>
          Manage <ChevronRight size={13} />
        </button>
      </div>

      {total === 0 ? (
        <div className="forge-card" style={{ padding: 24, textAlign: 'center' }}>
          <Link2 size={22} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>No saved URLs yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Bookmark your frequently-used links and organize them into groups.
          </div>
          <button onClick={() => navigate('/urls')} className="forge-btn forge-btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
            Open URL Manager
          </button>
        </div>
      ) : (
        <div>
          {bookmarks.groups.map((g) => <GroupCluster key={g.id} group={g} />)}

          {bookmarks.ungrouped.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--text-muted)', opacity: 0.4 }} />
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Ungrouped</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
                  {bookmarks.ungrouped.length}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {bookmarks.ungrouped.slice(0, 8).map((e) => <BookmarkItem key={e.id} entry={e} />)}
              </div>
              {bookmarks.ungrouped.length > 8 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, paddingLeft: 16 }}>
                  + {bookmarks.ungrouped.length - 8} more
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
