import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthorizationForm from './components/Authorization/AuthorizationForm';
import VotingForm from './components/Voting/VotingForm';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/authorization" replace />} />
          <Route path="/authorization" element={<AuthorizationForm />} />
          <Route path="/vote" element={<VotingForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;