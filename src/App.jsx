import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Toast from './components/Toast'

const Dashboard = lazy(() => import('./tools/Dashboard'))
const QRTools = lazy(() => import('./tools/QRGenerator'))
const JsonEditor = lazy(() => import('./tools/JsonEditor'))
const DiffTool = lazy(() => import('./tools/DiffTool'))
const CSVEditor = lazy(() => import('./tools/CSVEditor'))
const ColorConverter = lazy(() => import('./tools/ColorConverter'))
const JWTTool = lazy(() => import('./tools/JWTTool'))
const MeetTool = lazy(() => import('./tools/MeetTool'))
const Base64Tool = lazy(() => import('./tools/Base64Tool'))
const TimestampTool = lazy(() => import('./tools/TimestampTool'))
const HashTool = lazy(() => import('./tools/HashTool'))
const RegexTool = lazy(() => import('./tools/RegexTool'))
const MarkdownTool = lazy(() => import('./tools/MarkdownTool'))
const ImageTool = lazy(() => import('./tools/ImageTool'))
const APITool = lazy(() => import('./tools/APITool'))
const FileConverter = lazy(() => import('./tools/FileConverter'))
const URLManager = lazy(() => import('./tools/URLManager'))
const Settings = lazy(() => import('./tools/Settings'))

export function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, flexDirection: 'column' }}>
      <div style={{
        width: 32, height: 32, border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
      }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Loading...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function LazyRoute({ children }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LazyRoute><Dashboard /></LazyRoute>} />
          <Route path="qr" element={<LazyRoute><QRTools /></LazyRoute>} />
          <Route path="json-editor" element={<LazyRoute><JsonEditor /></LazyRoute>} />
          <Route path="diff" element={<LazyRoute><DiffTool /></LazyRoute>} />
          <Route path="csv-editor" element={<LazyRoute><CSVEditor /></LazyRoute>} />
          <Route path="color" element={<LazyRoute><ColorConverter /></LazyRoute>} />
          <Route path="jwt" element={<LazyRoute><JWTTool /></LazyRoute>} />
          <Route path="meet" element={<LazyRoute><MeetTool /></LazyRoute>} />
          <Route path="base64" element={<LazyRoute><Base64Tool /></LazyRoute>} />
          <Route path="timestamp" element={<LazyRoute><TimestampTool /></LazyRoute>} />
          <Route path="hash" element={<LazyRoute><HashTool /></LazyRoute>} />
          <Route path="regex" element={<LazyRoute><RegexTool /></LazyRoute>} />
          <Route path="markdown" element={<LazyRoute><MarkdownTool /></LazyRoute>} />
          <Route path="image" element={<LazyRoute><ImageTool /></LazyRoute>} />
          <Route path="api" element={<LazyRoute><APITool /></LazyRoute>} />
          <Route path="converter" element={<LazyRoute><FileConverter /></LazyRoute>} />
          <Route path="urls" element={<LazyRoute><URLManager /></LazyRoute>} />
          <Route path="settings" element={<LazyRoute><Settings /></LazyRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
