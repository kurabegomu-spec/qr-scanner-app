import React from 'react';
import ReactDOM from 'react-dom/client';
import './tailwind.css';
import App from './App';  // Import chính xác: './App' (không có .tsx)

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
