// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Web3Provider } from './contexts/Web3Context';
import { AuthProvider } from './contexts/AuthContext';
import { theme } from './styles/theme';

// Páginas
import Login from './pages/Login';
import VoterDashboard from './pages/VoterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Vote from './pages/Vote';
import Results from './pages/Results';
import VerifyVote from './pages/VerifyVote';
import GrantRights from './pages/GrantRights';
import BlockchainMonitor from './pages/BlockchainMonitor';
import DeployElection from './pages/DeployElection';

// Componentes
import Header from './components/common/Header';
import Loading from './components/common/Loading';
import ErrorBoundary from './components/common/ErrorBoundary';

// Importar useAuth aqui para o ProtectedRoute
import { useAuth } from './contexts/AuthContext';
import { useWeb3 } from './contexts/Web3Context';

// Componente de Rota Protegida
const ProtectedRoute = ({ children, requireAuth = true, requireChairperson = false }) => {
  const { isAuthenticated, isChairperson } = useAuth();
  
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (requireChairperson && !isChairperson) {
    return <Navigate to="/voter" replace />;
  }
  
  return children;
};

// Layout principal
const Layout = ({ children }) => {
  const { isLoading } = useWeb3();
  
  if (isLoading) {
    return <Loading fullScreen />;
  }
  
  return (
    <>
      <Header />
      <main style={{ minHeight: 'calc(100vh - 64px)', paddingTop: '20px' }}>
        {children}
      </main>
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Web3Provider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Login />} />
                
                <Route path="/voter" element={
                  <ProtectedRoute requireAuth>
                    <Layout>
                      <VoterDashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/admin" element={
                  <ProtectedRoute requireAuth requireChairperson>
                    <Layout>
                      <AdminDashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/vote" element={
                  <ProtectedRoute requireAuth>
                    <Layout>
                      <Vote />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/results" element={
                  <Layout>
                    <Results />
                  </Layout>
                } />
                
                <Route path="/verify-vote" element={
                  <ProtectedRoute requireAuth>
                    <Layout>
                      <VerifyVote />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/grant-rights" element={
                  <ProtectedRoute requireAuth requireChairperson>
                    <Layout>
                      <GrantRights />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/monitor" element={
                  <ProtectedRoute requireAuth requireChairperson>
                    <Layout>
                      <BlockchainMonitor />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/deploy-election" element={
                  <ProtectedRoute requireAuth requireChairperson>
                    <Layout>
                      <DeployElection />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </AuthProvider>
        </Web3Provider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;