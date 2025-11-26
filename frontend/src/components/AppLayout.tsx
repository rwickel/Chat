// components/AppLayout.tsx
import * as React from 'react';
import { Outlet } from 'react-router-dom';

const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;