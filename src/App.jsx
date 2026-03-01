import { useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ContentProvider } from './context/ContentContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MusicPlayer from './components/MusicPlayer';
import Login from './pages/Login';

// Lazy-loaded pages for performance
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Memories = lazy(() => import('./pages/Memories'));
const Surprise = lazy(() => import('./pages/Surprise'));
const Messages = lazy(() => import('./pages/Messages'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const OurFuture = lazy(() => import('./pages/OurFuture'));

// Loading fallback
function PageLoader() {
  return (
    <div className="page-loader flex-col-center" style={{ minHeight: '100vh' }}>
      <span className="animate-pulse-heart" style={{ fontSize: '2.5rem' }}>💕</span>
      <p className="text-soft" style={{ marginTop: '0.8rem' }}>Loading with love…</p>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// Admin-only route wrapper
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

// Main content with scrolling sections
function MainContent() {
  const sectionRefs = {
    home: useRef(null),
    about: useRef(null),
    gallery: useRef(null),
    memories: useRef(null),
    surprise: useRef(null),
  };

  const scrollTo = (key) => {
    sectionRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Navbar scrollTo={scrollTo} />
      <MusicPlayer />

      <main className="vertical-scroll-main">
        <Suspense fallback={<PageLoader />}>
          <section ref={sectionRefs.home} id="home" className="scroll-section">
            <Home scrollTo={scrollTo} />
          </section>
          <section ref={sectionRefs.about} id="about" className="scroll-section">
            <About />
          </section>
          <section ref={sectionRefs.gallery} id="gallery" className="scroll-section">
            <Gallery />
          </section>
          <section ref={sectionRefs.memories} id="memories" className="scroll-section">
            <Memories />
          </section>
          <section ref={sectionRefs.surprise} id="surprise" className="scroll-section">
            <Surprise scrollTo={scrollTo} />
          </section>
        </Suspense>
      </main>

      <Footer scrollTo={scrollTo} />
    </>
  );
}

// Messages page (separate route)
function MessagesPage() {
  return (
    <>
      <Navbar isMessagesPage />
      <Suspense fallback={<PageLoader />}>
        <Messages />
      </Suspense>
    </>
  );
}

// Admin page (separate route, admin-only)
function AdminPage() {
  return (
    <>
      <Navbar isMessagesPage />
      <Suspense fallback={<PageLoader />}>
        <AdminPanel />
      </Suspense>
    </>
  );
}

// Our Future page
function FuturePage() {
  return (
    <>
      <Navbar isMessagesPage />
      <Suspense fallback={<PageLoader />}>
        <OurFuture />
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainContent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route
              path="/our-future"
              element={
                <ProtectedRoute>
                  <FuturePage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ContentProvider>
    </AuthProvider>
  );
}

// Redirect to home if already logged in
function LoginGuard() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Login />;
}
