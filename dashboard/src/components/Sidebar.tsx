import React from 'react';
import { Zap, LockOpen, Lock, Command, Monitor, Sliders, Settings } from 'lucide-react';

// Sidebar navigation items
const sidebarItems = [
  { id: 'command', label: 'Command Post', icon: Command },
  { id: 'monitor', label: 'Monitor', icon: Monitor },
  { id: 'optimize', label: 'Optimize', icon: Sliders },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activeItem: string;
  setActiveItem: (id: string) => void;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem, isLocked, setIsLocked }) => {
  if (isLocked) {
    return (
      <aside className="w-64 border-r border-white/10 bg-[#080c14] flex flex-col py-6 shrink-0">
        {/* Logo */}
        <div className="flex items-center justify-center mb-10 px-4">
          <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.6)] shrink-0">
            <Zap size={20} className="text-white" />
          </div>
          <span className="ml-3 text-xs font-black text-white tracking-widest">ALPHA-ORION</span>
        </div>

        <div className="flex-1" />

        {/* Unlock Button */}
        <div className="px-3">
          <button 
            onClick={() => setIsLocked(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-all"
            title="Unlock"
          >
            <LockOpen size={18} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Unlock</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r border-white/10 bg-[#080c14] flex flex-col py-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-center mb-10 px-4">
        <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.6)] shrink-0">
          <Zap size={20} className="text-white" />
        </div>
        <span className="ml-3 text-xs font-black text-white tracking-widest">ALPHA-ORION</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
              activeItem === item.id 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon size={18} className={activeItem === item.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'} />
            <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
            {activeItem === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>
        ))}
      </nav>

      {/* Lock Button */}
      <div className="px-3 mt-auto">
        <button 
          onClick={() => setIsLocked(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-amber-400 transition-all"
        >
          <Lock size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Lock</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;