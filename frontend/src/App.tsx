// App.tsx
import * as React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

// ESM imports for modern pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';

//  Configure worker — Vite-safe with .mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '/pdf.worker.min.mjs',
  import.meta.url
).toString();


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;