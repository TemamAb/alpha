
import React from 'react';
import { useLocation } from 'react-router-dom';

const getTitleFromPath = (path: string): string => {
  if (path === '/') return 'Dashboard';
  const title = path.replace('/', '').charAt(0).toUpperCase() + path.slice(2);
  return title;
};

const Header: React.FC = () => {
  const location = useLocation();
  const title = getTitleFromPath(location.pathname);

  return (
    <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center border-b border-gray-700">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-400">
            <span>AV</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
