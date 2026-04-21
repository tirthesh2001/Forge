import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Link2, Plus, Trash2, Copy, ExternalLink, Share2, Search,
  Folder, FolderPlus, Edit2, Check, X, ChevronDown,
  ChevronRight, MoreVertical, Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import ForgeEmptyState from '../../components/ForgeEmptyState'
import { copyWithHistory } from '../../utils/copyWithHistory'
import Favicon from './Favicon'
import {
  uid, GROUP_COLORS, DEFAULT_BOOKMARKS, normalizeBookmarks, sanitizeUrl, getDomain,
} from './utils'

export default function URLManager() {
  const [rawBookmarks, setBookmarks] = useCloudState('url-bookmarks', DEFAULT_BOOKMARKS)
  const bookmarks = useMemo(() => normalizeBookmarks(rawBookmarks), [rawBookmarks])

  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newGroupId, setNewGroupId] = useState('ungrouped')
  const [urlError, setUrlError] = useState('')

  const [groupModal, setGroupModal] = useState(null) // { mode: 'create' | 'edit', group? }
  const [groupName, setGroupName] = useState('')
  const [groupColor, setGroupColor] = useState(GROUP_COLORS[0])

  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null)
  const [dragEntry, setDragEntry] = useState(null) // { entryId, fromGroupId }
  const [dragOverGroup, setDragOverGroup] = useState(null)

  const hasData = bookmarks.groups.length > 0 || bookmarks.ungrouped.length > 0
  const totalCount = bookmarks.ungrouped.length + bookmarks.groups.reduce((s, g) => s + g.urls.length, 0)

  const findEntryGroup = useCallback((entryUrl) => {
    for (const g of bookmarks.groups) {
      if (g.urls.some((u) => u.url === entryUrl)) return g
    }
    if (bookmarks.ungrouped.some((u) => u.url === entryUrl)) return { id: 'ungrouped', name: 'Ungrouped' }
    return null
  }, [bookmarks])

  const resetAddForm = useCallback(() => {
    setNewUrl(''); setNewTitle(''); setUrlError(''); setNewGroupId('ungrouped')
  }, [])

  const addUrl = useCallback(() => {
    const sanitized = sanitizeUrl(newUrl)
    if (!sanitized) {
      setUrlError('Please enter a valid URL (e.g., https://example.com)')
      return
    }
    const existingGroup = findEntryGroup(sanitized)
    if (existingGroup) {
      toast(`Already saved in ${existingGroup.name}`, { icon: '\u26A0\uFE0F' })
    }
    const entry = {
      id: uid(),
      url: sanitized,
      title: newTitle.trim() || getDomain(sanitized),
      description: '',
      createdAt: Date.now(),
    }
    setBookmarks((prev) => {
      const n = normalizeBookmarks(prev)
      if (newGroupId === 'ungrouped') {
        return { ...n, ungrouped: [entry, ...n.ungrouped] }
      }
      return {
        ...n,
        groups: n.groups.map((g) => g.id === newGroupId ? { ...g, urls: [entry, ...g.urls] } : g),
      }
    })
    toast.success('URL saved')
    setAddOpen(false)
    resetAddForm()
  }, [newUrl, newTitle, newGroupId, findEntryGroup, setBookmarks, resetAddForm])

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setNewUrl(text)
        setUrlError('')
      }
    } catch {
      toast.error('Could not read clipboard')
    }
  }, [])

  const deleteEntry = useCallback((groupId, entryId) => {
    let deletedEntry = null
    setBookmarks((prev) => {
      const n = normalizeBookmarks(prev)
      if (groupId === 'ungrouped') {
        deletedEntry = n.ungrouped.find((u) => u.id === entryId)
        return { ...n, ungrouped: n.ungrouped.filter((u) => u.id !== entryId) }
      }
      const g = n.groups.find((gr) => gr.id === groupId)
      if (g) deletedEntry = g.urls.find((u) => u.id === entryId)
      return {
        ...n,
        groups: n.groups.map((gr) => gr.id === groupId ? { ...gr, urls: gr.urls.filter((u) => u.id !== entryId) } : gr),
      }
    })
    if (deletedEntry) {
      toast((t) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Deleted "{deletedEntry.title || getDomain(deletedEntry.url)}"</span>
          <button
            onClick={() => {
              setBookmarks((prev) => {
                const n = normalizeBookmarks(prev)
                if (groupId === 'ungrouped') return { ...n, ungrouped: [deletedEntry, ...n.ungrouped] }
                return {
                  ...n,
                  groups: n.groups.map((gr) => gr.id === groupId ? { ...gr, urls: [deletedEntry, ...gr.urls] } : gr),
                }
              })
              toast.dismiss(t.id)
            }}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
          >
            Undo
          </button>
        </span>
      ), { duration: 5000 })
    }
  }, [setBookmarks])

  const openUrl = useCallback((url) => {
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (!win) toast.error('Popup blocked. Please allow popups for Forge.')
  }, [])

  const copyUrl = useCallback((url) => {
    copyWithHistory(url, 'URL copied')
  }, [])

  const shareUrls = useCallback(async (urls, title = 'My URLs') => {
    if (!urls || urls.length === 0) { toast.error('Nothing to share'); return }
    const text = urls.map((u) => `${u.title || getDomain(u.url)}\n${u.url}`).join('\n\n')
    if (navigator.share) {
      try {
        await navigator.share({ title, text })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    copyWithHistory(text, 'URLs copied to clipboard (Share API not available)')
  }, [])

  const shareGroup = useCallback((group) => {
    shareUrls(group.urls, group.name)
  }, [shareUrls])

  const shareAll = useCallback(() => {
    const all = [
      ...bookmarks.ungrouped,
      ...bookmarks.groups.flatMap((g) => g.urls.map((u) => ({ ...u, _group: g.name }))),
    ]
    shareUrls(all, 'All saved URLs')
  }, [bookmarks, shareUrls])

  const openGroupModal = useCallback((mode, group = null) => {
    setGroupModal({ mode, group })
    setGroupName(group?.name || '')
    setGroupColor(group?.color || GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)])
  }, [])

  const saveGroup = useCallback(() => {
    const name = groupName.trim()
    if (!name) { toast.error('Group name required'); return }
    setBookmarks((prev) => {
      const n = normalizeBookmarks(prev)
      if (groupModal?.mode === 'edit' && groupModal.group) {
        return {
          ...n,
          groups: n.groups.map((g) => g.id === groupModal.group.id ? { ...g, name, color: groupColor } : g),
        }
      }
      return { ...n, groups: [...n.groups, { id: uid(), name, color: groupColor, collapsed: false, urls: [] }] }
    })
    setGroupModal(null)
    toast.success(groupModal?.mode === 'edit' ? 'Group updated' : 'Group created')
  }, [groupName, groupColor, groupModal, setBookmarks])

  const deleteGroup = useCallback((groupId, moveUngrouped = false) => {
    setBookmarks((prev) => {
      const n = normalizeBookmarks(prev)
      const g = n.groups.find((gr) => gr.id === groupId)
      if (!g) return n
      const nextGroups = n.groups.filter((gr) => gr.id !== groupId)
      const nextUngrouped = moveUngrouped ? [...g.urls, ...n.ungrouped] : n.ungrouped
      return { ...n, groups: nextGroups, ungrouped: nextUngrouped }
    })
    setDeleteGroupConfirm(null)
    toast.success(moveUngrouped ? 'Group deleted, URLs moved to Ungrouped' : 'Group and URLs deleted')
  }, [setBookmarks])

  const toggleGroupCollapsed = useCallback((groupId) => {
    setBookmarks((prev) => {
      const n = normalizeBookmarks(prev)
      return { ...n, groups: n.groups.map((g) => g.id === groupId ? { ...g, collapsed: !g.collapsed } : g) }
    })
  }, [setBookmarks])

  const moveEntry = useCallback((entryId, fromGroupId, toGroupId) => {
    if (fromGroupId === toGroupId) return
    setBookmarks((prev) => {
      const n = normalizeBookmarks(prev)
      let entry = null
      let newUngrouped = n.ungrouped
      if (fromGroupId === 'ungrouped') {
        entry = n.ungrouped.find((u) => u.id === entryId)
        newUngrouped = n.ungrouped.filter((u) => u.id !== entryId)
      }
      let newGroups = n.groups.map((g) => {
        if (g.id === fromGroupId) {
          if (!entry) entry = g.urls.find((u) => u.id === entryId)
          return { ...g, urls: g.urls.filter((u) => u.id !== entryId) }
        }
        return g
      })
      if (!entry) return n
      if (toGroupId === 'ungrouped') {
        newUngrouped = [entry, ...newUngrouped]
      } else {
        newGroups = newGroups.map((g) => g.id === toGroupId ? { ...g, urls: [entry, ...g.urls] } : g)
      }
      return { ...n, groups: newGroups, ungrouped: newUngrouped }
    })
  }, [setBookmarks])

  const onDragStart = (e, entryId, fromGroupId) => {
    setDragEntry({ entryId, fromGroupId })
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', entryId) } catch { /* ignore */ }
  }
  const onDragEnd = () => { setDragEntry(null); setDragOverGroup(null) }
  const onDragOverGroup = (e, groupId) => {
    if (!dragEntry) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGroup(groupId)
  }
  const onDropGroup = (e, groupId) => {
    e.preventDefault()
    if (dragEntry) moveEntry(dragEntry.entryId, dragEntry.fromGroupId, groupId)
    setDragEntry(null); setDragOverGroup(null)
  }

  const filterEntry = useCallback((entry) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return entry.url.toLowerCase().includes(q) || (entry.title || '').toLowerCase().includes(q)
  }, [search])

  const filteredUngrouped = useMemo(() => bookmarks.ungrouped.filter(filterEntry), [bookmarks.ungrouped, filterEntry])
  const filteredGroups = useMemo(() => bookmarks.groups.map((g) => ({ ...g, urls: g.urls.filter(filterEntry) })), [bookmarks.groups, filterEntry])

  if (!hasData) {
    return (
      <div>
        <ToolHeader toolId="urls" title="URL Manager" description="Save, group, and quickly access your favorite links" />
        <ForgeEmptyState
          icon={Link2}
          title="No saved URLs yet"
          description="Save your commonly used URLs, group them, and access them with one click."
          primaryAction={{ label: 'Add URL', onClick: () => setAddOpen(true) }}
          secondaryAction={{ label: 'New group', onClick: () => openGroupModal('create') }}
        />
        {addOpen && <AddModal
          newUrl={newUrl} setNewUrl={setNewUrl}
          newTitle={newTitle} setNewTitle={setNewTitle}
          newGroupId={newGroupId} setNewGroupId={setNewGroupId}
          urlError={urlError} setUrlError={setUrlError}
          groups={bookmarks.groups}
          onAdd={addUrl} onClose={() => { setAddOpen(false); resetAddForm() }}
          onPaste={pasteFromClipboard}
        />}
        {groupModal && <GroupModal
          mode={groupModal.mode} name={groupName} setName={setGroupName}
          color={groupColor} setColor={setGroupColor}
          onSave={saveGroup} onClose={() => setGroupModal(null)}
        />}
      </div>
    )
  }

  return (
    <div>
      <ToolHeader toolId="urls" title="URL Manager" description={`${totalCount} URLs across ${bookmarks.groups.length} group${bookmarks.groups.length === 1 ? '' : 's'}`}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setAddOpen(true)} className="forge-btn forge-btn-primary" style={{ fontSize: 12, padding: '6px 12px', gap: 4 }}>
            <Plus size={14} /> Add URL
          </button>
          <button onClick={() => openGroupModal('create')} className="forge-btn" style={{ fontSize: 12, padding: '6px 12px', gap: 4 }}>
            <FolderPlus size={14} /> New Group
          </button>
          <button onClick={shareAll} className="forge-btn" style={{ fontSize: 12, padding: '6px 12px', gap: 4 }}>
            <Share2 size={14} /> Share All
          </button>
        </div>
      </ToolHeader>

      {/* Search */}
      <div className="forge-card" style={{ padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={16} style={{ color: 'var(--text-muted)' }} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search URLs and titles..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-ui)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Groups */}
      {filteredGroups.map((group) => {
        const originalGroup = bookmarks.groups.find((g) => g.id === group.id)
        const collapsed = Boolean(originalGroup?.collapsed)
        const isDropTarget = dragOverGroup === group.id
        return (
          <div key={group.id} className="forge-card" style={{ padding: 0, marginBottom: 12, border: isDropTarget ? `2px solid ${group.color}` : '1px solid var(--border)', transition: 'border 0.15s' }}
            onDragOver={(e) => onDragOverGroup(e, group.id)}
            onDragLeave={() => setDragOverGroup(null)}
            onDrop={(e) => onDropGroup(e, group.id)}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: group.urls.length > 0 && !collapsed ? '1px solid var(--border)' : 'none' }}>
              <button onClick={() => toggleGroupCollapsed(group.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
                {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: group.color, flexShrink: 0 }} />
              <Folder size={16} style={{ color: group.color }} />
              <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{group.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>{group.urls.length}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => shareGroup(group)} title="Share group" className="forge-btn" style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}>
                <Share2 size={12} />
              </button>
              <button onClick={() => openGroupModal('edit', originalGroup)} title="Edit group" className="forge-btn" style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}>
                <Edit2 size={12} />
              </button>
              <button onClick={() => setDeleteGroupConfirm(originalGroup)} title="Delete group" className="forge-btn" style={{ fontSize: 11, padding: '4px 8px', gap: 4, color: '#EF4444' }}>
                <Trash2 size={12} />
              </button>
            </div>
            {!collapsed && (
              <div>
                {group.urls.length === 0 && (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, opacity: 0.7 }}>
                    No URLs in this group — drag URLs here or add new ones
                  </div>
                )}
                {group.urls.map((entry) => (
                  <URLRow key={entry.id} entry={entry} groupId={group.id}
                    onOpen={openUrl} onCopy={copyUrl} onDelete={deleteEntry}
                    onDragStart={onDragStart} onDragEnd={onDragEnd}
                    isDragging={dragEntry?.entryId === entry.id}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Ungrouped */}
      {(filteredUngrouped.length > 0 || bookmarks.ungrouped.length > 0) && (
        <div className="forge-card" style={{ padding: 0, marginBottom: 12, border: dragOverGroup === 'ungrouped' ? '2px solid var(--accent)' : '1px solid var(--border)', transition: 'border 0.15s' }}
          onDragOver={(e) => onDragOverGroup(e, 'ungrouped')}
          onDragLeave={() => setDragOverGroup(null)}
          onDrop={(e) => onDropGroup(e, 'ungrouped')}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: filteredUngrouped.length > 0 ? '1px solid var(--border)' : 'none' }}>
            <Link2 size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Ungrouped</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>{bookmarks.ungrouped.length}</span>
          </div>
          {filteredUngrouped.map((entry) => (
            <URLRow key={entry.id} entry={entry} groupId="ungrouped"
              onOpen={openUrl} onCopy={copyUrl} onDelete={deleteEntry}
              onDragStart={onDragStart} onDragEnd={onDragEnd}
              isDragging={dragEntry?.entryId === entry.id}
            />
          ))}
        </div>
      )}

      {search && totalCount > 0 && filteredUngrouped.length === 0 && filteredGroups.every((g) => g.urls.length === 0) && (
        <div className="forge-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No URLs match "{search}"
        </div>
      )}

      {addOpen && <AddModal
        newUrl={newUrl} setNewUrl={setNewUrl}
        newTitle={newTitle} setNewTitle={setNewTitle}
        newGroupId={newGroupId} setNewGroupId={setNewGroupId}
        urlError={urlError} setUrlError={setUrlError}
        groups={bookmarks.groups}
        onAdd={addUrl} onClose={() => { setAddOpen(false); resetAddForm() }}
        onPaste={pasteFromClipboard}
      />}

      {groupModal && <GroupModal
        mode={groupModal.mode} name={groupName} setName={setGroupName}
        color={groupColor} setColor={setGroupColor}
        onSave={saveGroup} onClose={() => setGroupModal(null)}
      />}

      {deleteGroupConfirm && <DeleteGroupModal
        group={deleteGroupConfirm}
        onConfirm={(moveUngrouped) => deleteGroup(deleteGroupConfirm.id, moveUngrouped)}
        onClose={() => setDeleteGroupConfirm(null)}
      />}

      <style>{`@keyframes forge-pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 0.8 } }`}</style>
    </div>
  )
}

function URLRow({ entry, groupId, onOpen, onCopy, onDelete, onDragStart, onDragEnd, isDragging }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, entry.id, groupId)}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover, var(--bg))'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <Favicon url={entry.url} size={20} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => onOpen(entry.url)}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.title || getDomain(entry.url)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.url}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={() => onOpen(entry.url)} title="Open in new tab" className="forge-btn" style={{ padding: '5px 8px', fontSize: 11 }}>
          <ExternalLink size={13} />
        </button>
        <button onClick={() => onCopy(entry.url)} title="Copy URL" className="forge-btn" style={{ padding: '5px 8px', fontSize: 11 }}>
          <Copy size={13} />
        </button>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} title="More" className="forge-btn" style={{ padding: '5px 6px', fontSize: 11 }}>
            <MoreVertical size={13} />
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minWidth: 140, overflow: 'hidden' }}>
              <button
                onClick={() => { setMenuOpen(false); onDelete(groupId, entry.id) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12, textAlign: 'left', fontFamily: 'var(--font-ui)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddModal({ newUrl, setNewUrl, newTitle, setNewTitle, newGroupId, setNewGroupId, urlError, setUrlError, groups, onAdd, onClose, onPaste }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Add URL</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>URL</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                autoFocus
                value={newUrl}
                onChange={(e) => { setNewUrl(e.target.value); if (urlError) setUrlError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter' && newUrl.trim()) onAdd() }}
                placeholder="https://example.com"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 6, border: `1px solid ${urlError ? '#EF4444' : 'var(--border)'}`, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-code)', outline: 'none' }}
              />
              <button onClick={onPaste} title="Paste from clipboard" className="forge-btn" style={{ padding: '9px 12px', fontSize: 12 }}>
                <Upload size={13} />
              </button>
            </div>
            {urlError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{urlError}</div>}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Title (optional)</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newUrl.trim()) onAdd() }}
              placeholder="My bookmark"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Group</label>
            <select
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
            >
              <option value="ungrouped">Ungrouped</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="forge-btn">Cancel</button>
          <button onClick={onAdd} disabled={!newUrl.trim()} className="forge-btn forge-btn-primary">Save</button>
        </div>
      </div>
    </div>
  )
}

function GroupModal({ mode, name, setName, color, setColor, onSave, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{mode === 'edit' ? 'Edit Group' : 'New Group'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave() }}
              placeholder="Work, Personal, Tools..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Color</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, background: c,
                    border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'transform 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="forge-btn">Cancel</button>
          <button onClick={onSave} disabled={!name.trim()} className="forge-btn forge-btn-primary">
            <Check size={13} /> {mode === 'edit' ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteGroupModal({ group, onConfirm, onClose }) {
  const count = group?.urls?.length || 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Delete Group</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
          Delete group <strong>"{group.name}"</strong>
          {count > 0 && <> and its {count} URL{count === 1 ? '' : 's'}</>}?
          {count > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              You can also move the URLs to Ungrouped instead.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 flex-wrap" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="forge-btn">Cancel</button>
          {count > 0 && (
            <button onClick={() => onConfirm(true)} className="forge-btn">Move to Ungrouped</button>
          )}
          <button
            onClick={() => onConfirm(false)}
            className="forge-btn"
            style={{ background: '#EF4444', color: '#fff', border: '1px solid #EF4444' }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}
