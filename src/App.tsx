import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TokenModal } from './components/common/TokenModal';

const OverviewTab = lazy(() => import('./components/dashboard/OverviewTab').then(m => ({ default: m.OverviewTab })));
const ReposTab = lazy(() => import('./components/dashboard/ReposTab').then(m => ({ default: m.ReposTab })));
const ContributorsTab = lazy(() => import('./components/dashboard/ContributorsTab').then(m => ({ default: m.ContributorsTab })));

function App() {
  const [showTokenModal, setShowTokenModal] = useState(false);

  useEffect(() => {
    const handleLimitHit = () => {
      setShowTokenModal(true);
    };
    window.addEventListener('github-api-limit', handleLimitHit);
    return () => window.removeEventListener('github-api-limit', handleLimitHit);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex bg-github-canvas min-h-screen text-github-text overflow-hidden">
        <Sidebar className="w-64 border-r border-github-border flex-shrink-0" onConnectToken={() => setShowTokenModal(true)} />
        
        <main className="flex-1 overflow-y-auto p-8 relative">
          <Suspense fallback={<div className="flex w-full h-full items-center justify-center text-aossie-green font-mono">LOADING_MODULE...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<OverviewTab />} />
              <Route path="/repos" element={<ReposTab />} />
              <Route path="/contributors" element={<ContributorsTab />} />
            </Routes>
          </Suspense>
        </main>

        <TokenModal 
          isOpen={showTokenModal} 
          onClose={() => setShowTokenModal(false)} 
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
