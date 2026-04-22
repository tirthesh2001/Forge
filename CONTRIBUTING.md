# Contributing to Forge

## Prerequisites

- Node.js 18+
- npm

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

## Adding a New Tool

Every tool lives in its own folder under `src/tools/`. Follow these steps to add one:

### 1. Create the tool folder

```
src/tools/MyTool/
  index.jsx      # Default export: the tool's root component
```

Use `ToolHeader` for the page title and `useCloudState` for any data that should persist and sync.

```jsx
import ToolHeader from '../../components/ToolHeader'
import useCloudState from '../../hooks/useCloudState'

export default function MyTool() {
  const [data, setData] = useCloudState('my-tool', { items: [] })

  return (
    <div>
      <ToolHeader title="My Tool" subtitle="A short description" />
      {/* tool UI */}
    </div>
  )
}
```

### 2. Add a lazy route in `src/App.jsx`

```jsx
const MyTool = lazy(() => import('./tools/MyTool'))

// Inside <Routes>:
<Route path="my-tool" element={<LazyRoute><MyTool /></LazyRoute>} />
```

### 3. Add a nav entry in `src/components/Sidebar.jsx`

Import an icon from `lucide-react` and add an entry to the `navItems` array:

```jsx
{ label: 'My Tool', icon: Wrench, path: '/my-tool', defaultKey: null },
```

Set `defaultKey` to a digit (`'0'`-`'9'`) to assign a default `Cmd+<digit>` shortcut, or `null` if no default is needed.

### 4. Add to Dashboard (optional)

In `src/tools/Dashboard/index.jsx`, add the tool to the `DEFAULT_TOOLS` array so it appears on the home screen grid.

### 5. Add to Command Palette (optional)

In `src/components/CommandPalette.jsx`, add a matching entry to the `COMMANDS` array so the tool is reachable via `Cmd+K`.

## Coding Conventions

### General

- **JSX, not TSX** -- the project uses plain JavaScript with JSX.
- **Tailwind CSS 4** -- use utility classes for styling. Global CSS variables (`var(--accent)`, `var(--text-muted)`, etc.) are defined in `src/index.css` and `src/contexts/ThemeContext.jsx`.
- **Functional components only** -- no class components.
- **`lucide-react`** for icons -- keep icon imports consistent with the rest of the app.

### State Management

| Need | Use |
|------|-----|
| Persistent + synced data | `useCloudState(category, defaultValue)` from `src/hooks/useCloudState.js` |
| App-wide theme/device/clipboard | Existing React Contexts in `src/contexts/` |
| Ephemeral UI state | React `useState` / `useRef` |

Do **not** introduce Redux, Zustand, or other state libraries.

### File Structure

- One folder per tool under `src/tools/`.
- Shared components go in `src/components/`.
- Utility functions go in `src/utils/`.
- Keep tool-specific sub-components, hooks, and helpers inside the tool's own folder (see `FileConverter/` for an example with `components/`, `hooks/`, and `services/` subfolders).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Linting

ESLint 9 with a flat config is set up in `eslint.config.js`. Run `npm run lint` before pushing. The Vercel CI also runs lint as part of the build step.

## Cloud Sync (Supabase)

Cloud sync is optional. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set, the app works fully offline using `localStorage` only.

When adding a new `useCloudState` category, no database schema changes are needed -- the `forge_data` table stores arbitrary JSONB keyed by `(device_id, category)`.

## Deployment

See the **Deployment** section in `README.md` for Vercel setup instructions.
