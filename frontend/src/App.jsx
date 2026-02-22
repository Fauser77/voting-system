import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Menu from './components/Menu/Menu';
import AuthorizationForm from './components/Authorization/AuthorizationForm';
import VotingForm from './components/Voting/VotingForm';
import ElectionResultsPage from './components/Results/ElectionResultsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/registro" element={<AuthorizationForm />} />
          <Route path="/votacao" element={<VotingForm />} />
          <Route path="/resultados" element={<ElectionResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;