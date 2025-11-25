import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Ensure the root element exists in index.html
const container = document.getElementById('root');

// Create a root for React 18's concurrent features
if (!container) {
  throw new Error("Root element not found. Check that <div id='root'></div> exists in index.html");
}

const root = ReactDOM.createRoot(container);

// Render the app with Strict Mode (helps catch issues during development)
root.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);