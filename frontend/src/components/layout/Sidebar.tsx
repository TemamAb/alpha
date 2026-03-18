
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Zap, BrainCircuit, BarChart3, Bot, Terminal, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/services', icon: Server, label: 'Services' },
  { to: '/opportunities', icon: Zap, label: 'Opportunities' },
  { to: '/strategies', icon: BrainCircuit, label: 'Strategies' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/terminal', icon: Terminal, label: 'Terminal' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar: React.FC = () => {
  const NavItem = ({ to, icon: Icon, label }: typeof navItems[0]) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        }`
      }
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  );

  return (
    <aside className="flex flex-col w-16 md:w-64 bg-gray-800 text-white p-4 space-y-4 transition-all duration-300">
      <div className="flex items-center justify-center md:justify-start px-2 py-4">
        <Bot className="w-8 h-8 text-blue-500" />
        <h1 className="hidden md:block ml-3 text-xl font-bold">Alpha-Orion</h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="hidden md:block text-center text-xs text-gray-500 p-4">
        <p>&copy; 2024 Alpha-Orion</p>
        <p>Arbitrage Platform</p>
      </div>
    </aside>
  );
};

export default Sidebar;
