import React, { useState, useReducer } from 'react';
import { controlApi } from '../services/controlApi';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Layers, 
  Activity, 
  ArrowLeftRight,
  LayoutGrid,
  Zap,
  Network,
  X,
  Save,
  CheckCircle2,
  Activity as ActivityIcon,
  PlusCircle
} from 'lucide-react';

// --- Interfaces ---
interface BaseRow {
  id: number;
  active: boolean;
}

interface Strategy extends BaseRow {
  name: string;
  pattern: string;
  profit: number; // Contribution to alpha ($)
}

interface Dex extends BaseRow {
  name: string;
  pattern: string;
  profit: number; // Profit Contribution ($)
}

interface Pair extends BaseRow {
  pair: string;
  profitPercent: number; // Profit % in alpha
}

interface FlashLoanProvider extends BaseRow {
  name: string;
  profitPercent: number;
}

interface Blockchain extends BaseRow {
  name: string;
  profitPercent: number;
}

interface MatrixState {
  strategies: Strategy[];
  dexs: Dex[];
  pairs: Pair[];
  providers: FlashLoanProvider[];
  blockchains: Blockchain[];
}

type MatrixTableKey = keyof MatrixState;

type MatrixAction =
  | { type: 'TOGGLE_ACTIVE'; payload: { table: MatrixTableKey; id: number } }
  | { type: 'DELETE_ITEM'; payload: { table: MatrixTableKey; id: number } }
  | { type: 'ADD_ITEM'; payload: { table: MatrixTableKey; item: any } }
  | { type: 'UPDATE_ITEM'; payload: { table: MatrixTableKey; item: any } };

// --- Mock Data ---
const INITIAL_STRATEGIES: Strategy[] = [
  { id: 1, name: 'Spot Arbitrage', pattern: 'Triangular', profit: 12500, active: true },
  { id: 2, name: 'Gamma Scalping', pattern: 'Delta Neutral', profit: 8400, active: false },
  { id: 3, name: 'Perp Funding', pattern: 'Basis Trade', profit: 4200, active: true },
];

const INITIAL_DEXS: Dex[] = [
  { id: 1, name: 'Uniswap V3', pattern: 'CLMM', profit: 15200, active: true },
  { id: 2, name: 'Curve', pattern: 'StableSwap', profit: 9100, active: true },
  { id: 3, name: 'Balancer', pattern: 'Weighted Pool', profit: 3400, active: false },
];

const INITIAL_PAIRS: Pair[] = [
  { id: 1, pair: 'WETH/USDC', profitPercent: 45.2, active: true },
  { id: 2, pair: 'WBTC/DAI', profitPercent: 28.5, active: true },
  { id: 3, pair: 'MATIC/ETH', profitPercent: 12.1, active: false },
];

const INITIAL_PROVIDERS: FlashLoanProvider[] = [
  { id: 1, name: 'Aave V3', profitPercent: 65.7, active: true },
  { id: 2, name: 'Balancer', profitPercent: 22.1, active: true },
  { id: 3, name: 'dYdX', profitPercent: 12.2, active: false },
];

const INITIAL_BLOCKCHAINS: Blockchain[] = [
  { id: 1, name: 'Ethereum', profitPercent: 55.0, active: true },
  { id: 2, name: 'Polygon', profitPercent: 30.5, active: true },
  { id: 3, name: 'Arbitrum', profitPercent: 14.5, active: true },
];

const initialState: MatrixState = {
  strategies: INITIAL_STRATEGIES,
  dexs: INITIAL_DEXS,
  pairs: INITIAL_PAIRS,
  providers: INITIAL_PROVIDERS,
  blockchains: INITIAL_BLOCKCHAINS,
};

// --- Reducer ---
const matrixReducer = (state: MatrixState, action: MatrixAction): MatrixState => {
  switch (action.type) {
    case 'TOGGLE_ACTIVE': {
      const { table, id } = action.payload;
      return {
        ...state,
        [table]: state[table].map((item: BaseRow) =>
          item.id === id ? { ...item, active: !item.active } : item
        ),
      };
    }
    case 'DELETE_ITEM': {
      const { table, id } = action.payload;
      return {
        ...state,
        [table]: state[table].filter((item: BaseRow) => item.id !== id),
      };
    }
    case 'ADD_ITEM': {
      const { table, item } = action.payload;
      return {
        ...state,
        [table]: [...state[table], item],
      };
    }
    case 'UPDATE_ITEM': {
      const { table, item: updatedItem } = action.payload;
      return {
        ...state,
        [table]: state[table].map((item: BaseRow) =>
          item.id === updatedItem.id ? updatedItem : item
        ),
      };
    }
    default:
      return state;
  }
};

// --- Reusable Table Component ---
interface MatrixTableProps<T extends BaseRow> {
  title: string;
  icon: React.ReactNode;
  data: T[];
  columns: { header: string; key: keyof T | 'no' | 'actions'; width?: string }[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onAdd: () => void;
  renderCell: (item: T, key: string) => React.ReactNode;
  renderSum: (key: string, data: T[]) => React.ReactNode;
}

const MatrixTable = <T extends BaseRow>({ 
  title, 
  icon, 
  data, 
  columns, 
  onToggle, 
  onDelete, 
  onEdit,
  onAdd,
  renderCell,
  renderSum
}: MatrixTableProps<T>) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-black/40 rounded border border-gray-700 overflow-hidden mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3 text-blue-400 font-bold">
          {icon}
          <h3>{title}</h3>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={(e) => { e.stopPropagation(); onAdd(); }} className="text-gray-400 hover:text-green-400 transition-colors"><PlusCircle size={18} /></button>
          <button className="text-gray-400 hover:text-white">
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs font-bold">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`p-3 ${col.width || ''}`}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isCollapsed ? (
              // Collapsed Summary Row
              <tr className="bg-gray-900/50 font-bold text-blue-300">
                {columns.map((col, idx) => (
                  <td key={idx} className="p-3">
                    {renderSum(col.key as string, data)}
                  </td>
                ))}
              </tr>
            ) : (
              // Expanded Data Rows
              data.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-800/30 transition-colors group">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="p-3">
                      {col.key === 'no' ? (
                        <span className="text-gray-500 font-mono">{index + 1}</span>
                      ) : col.key === 'actions' ? (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); onEdit(item.id); }} className="text-blue-400 hover:text-blue-300">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-red-400 hover:text-red-300">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : col.key === 'active' ? (
                        <button onClick={(e) => { e.stopPropagation(); onToggle(item.id); }} className="focus:outline-none">
                          {item.active ? (
                            <ToggleRight size={24} className="text-green-500" />
                          ) : (
                            <ToggleLeft size={24} className="text-gray-600" />
                          )}
                        </button>
                      ) : (
                        renderCell(item, col.key as string)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main Component ---
const StrategyMatrix: React.FC = () => {
  const [state, dispatch] = useReducer(matrixReducer, initialState);
  const [editItem, setEditItem] = useState<any>(null);
  const [editType, setEditType] = useState<MatrixTableKey | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Generic Handlers
  const handleDelete = (table: MatrixTableKey, id: number) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      dispatch({ type: 'DELETE_ITEM', payload: { table, id } });
    }
  };
  
  const handleEditOpen = (id: number, type: MatrixTableKey) => {
    const item = state[type].find(i => i.id === id);
    if (item) {
      setEditItem({ ...item });
      setEditType(type);
      setIsAdding(false);
    }
  };

  const handleAddNewOpen = (type: MatrixTableKey) => {
    const newId = Date.now(); // Temporary ID for new items
    let newItem: any;

    switch (type) {
      case 'strategies':
        newItem = { id: newId, name: '', pattern: '', profit: 0, active: true };
        break;
      case 'dex':
        newItem = { id: newId, name: '', pattern: '', profit: 0, active: true };
        break;
      case 'pair':
        newItem = { id: newId, pair: '', profitPercent: 0, active: true };
        break;
      case 'provider':
        newItem = { id: newId, name: '', profitPercent: 0, active: true };
        break;
      case 'blockchain':
        newItem = { id: newId, name: '', profitPercent: 0, active: true };
        break;
      default:
        return;
    }
    setEditItem(newItem);
    setEditType(type);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!editItem || !editType) return;

    if (isAdding) {
      dispatch({ type: 'ADD_ITEM', payload: { table: editType, item: editItem } });
    } else {
      dispatch({ type: 'UPDATE_ITEM', payload: { table: editType, item: editItem } });
    }
    setEditItem(null);
    setIsAdding(false);
    setEditType('');
  };

  const handleGlobalSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const payload = state;
    try {
      await controlApi.saveMatrixConfiguration(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save matrix configuration:", error);
      alert("Error: Could not save configuration to the backend.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-grow bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
          <LayoutGrid size={24} className="text-blue-500" />
          Alpha-Orion Matrix Configuration
        </h2>
        <button
          onClick={handleGlobalSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
            isSaving ? 'bg-gray-600 cursor-not-allowed' : saveSuccess ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
          }`}
        >
          {isSaving ? (<><ActivityIcon size={16} className="animate-spin" /> Saving...</>) 
          : saveSuccess ? (<><CheckCircle2 size={16} /> Saved!</>) 
          : (<><Save size={16} /> Save Configuration</>)}
        </button>
      </div>

      {/* A. Arbitrage Strategies Matrix */}
      <MatrixTable<Strategy>
        title="Arbitrage Strategies Matrix"
        icon={<Layers size={18} />}
        data={state.strategies}
        columns={[
          { header: 'No', key: 'no', width: 'w-12' },
          { header: 'Strategy Name', key: 'name' },
          { header: 'Strategy Pattern', key: 'pattern' },
          { header: 'Rank (Profit)', key: 'profit' },
          { header: 'Status', key: 'active', width: 'w-20' },
          { header: 'Actions', key: 'actions', width: 'w-20' }
        ]}
        onToggle={(id) => dispatch({ type: 'TOGGLE_ACTIVE', payload: { table: 'strategies', id } })}
        onDelete={(id) => handleDelete('strategies', id)}
        onEdit={(id) => handleEditOpen(id, 'strategies')}
        onAdd={() => handleAddNewOpen('strategies')}
        renderCell={(item, key) => key === 'profit' ? `$${item.profit.toLocaleString()}` : (item as any)[key]}
        renderSum={(key, data) => {
          if (key === 'no') return `Total: ${data.length}`;
          if (key === 'profit') return `$${data.reduce((sum, item) => sum + item.profit, 0).toLocaleString()}`;
          return '';
        }}
      />

      {/* B. DEX Matrix */}
      <MatrixTable<Dex>
        title="Alpha-Orion DEX Matrix"
        icon={<Activity size={18} />}
        data={state.dexs}
        columns={[
          { header: 'No', key: 'no', width: 'w-12' },
          { header: 'DEX Name', key: 'name' },
          { header: 'DEX Pattern', key: 'pattern' },
          { header: 'Profit Contribution', key: 'profit' },
          { header: 'Status', key: 'active', width: 'w-20' },
          { header: 'Actions', key: 'actions', width: 'w-20' }
        ]}
        onToggle={(id) => dispatch({ type: 'TOGGLE_ACTIVE', payload: { table: 'dexs', id } })}
        onDelete={(id) => handleDelete('dexs', id)}
        onEdit={(id) => handleEditOpen(id, 'dexs')}
        onAdd={() => handleAddNewOpen('dexs')}
        renderCell={(item, key) => key === 'profit' ? `$${item.profit.toLocaleString()}` : (item as any)[key]}
        renderSum={(key, data) => {
          if (key === 'no') return `Total: ${data.length}`;
          if (key === 'profit') return `$${data.reduce((sum, item) => sum + item.profit, 0).toLocaleString()}`;
          return '';
        }}
      />

      {/* C. Trading Pairs Matrix */}
      <MatrixTable<Pair>
        title="Trading Pairs Matrix"
        icon={<ArrowLeftRight size={18} />}
        data={state.pairs}
        columns={[
          { header: 'No', key: 'no', width: 'w-12' },
          { header: 'Trading Pair', key: 'pair' },
          { header: 'Profit % in Alpha', key: 'profitPercent' },
          { header: 'Status', key: 'active', width: 'w-20' },
          { header: 'Actions', key: 'actions', width: 'w-20' }
        ]}
        onToggle={(id) => dispatch({ type: 'TOGGLE_ACTIVE', payload: { table: 'pairs', id } })}
        onDelete={(id) => handleDelete('pairs', id)}
        onEdit={(id) => handleEditOpen(id, 'pairs')}
        onAdd={() => handleAddNewOpen('pairs')}
        renderCell={(item, key) => key === 'profitPercent' ? `${item.profitPercent}%` : (item as any)[key]}
        renderSum={(key, data) => {
          if (key === 'no') return `Total: ${data.length}`;
          if (key === 'profitPercent') return `${data.reduce((sum, item) => sum + item.profitPercent, 0).toFixed(1)}%`;
          return '';
        }}
      />

      {/* D. Flash Loan Providers Matrix */}
      <MatrixTable<FlashLoanProvider>
        title="Flash Loan Providers Matrix"
        icon={<Zap size={18} />}
        data={state.providers}
        columns={[
          { header: 'No', key: 'no', width: 'w-12' },
          { header: 'Provider Name', key: 'name' },
          { header: 'Profit Contribution %', key: 'profitPercent' },
          { header: 'Status', key: 'active', width: 'w-20' },
          { header: 'Actions', key: 'actions', width: 'w-20' }
        ]}
        onToggle={(id) => dispatch({ type: 'TOGGLE_ACTIVE', payload: { table: 'providers', id } })}
        onDelete={(id) => handleDelete('providers', id)}
        onEdit={(id) => handleEditOpen(id, 'providers')}
        onAdd={() => handleAddNewOpen('providers')}
        renderCell={(item, key) => key === 'profitPercent' ? `${item.profitPercent}%` : (item as any)[key]}
        renderSum={(key, data) => {
          if (key === 'no') return `Total: ${data.length}`;
          if (key === 'profitPercent') return `${data.reduce((sum, item) => sum + item.profitPercent, 0).toFixed(1)}%`;
          return '';
        }}
      />

      {/* E. Blockchain Matrix */}
      <MatrixTable<Blockchain>
        title="Blockchain Matrix"
        icon={<Network size={18} />}
        data={state.blockchains}
        columns={[
          { header: 'No', key: 'no', width: 'w-12' },
          { header: 'Blockchain Name', key: 'name' },
          { header: 'Profit Contribution %', key: 'profitPercent' },
          { header: 'Status', key: 'active', width: 'w-20' },
          { header: 'Actions', key: 'actions', width: 'w-20' }
        ]}
        onToggle={(id) => dispatch({ type: 'TOGGLE_ACTIVE', payload: { table: 'blockchains', id } })}
        onDelete={(id) => handleDelete('blockchains', id)}
        onEdit={(id) => handleEditOpen(id, 'blockchains')}
        onAdd={() => handleAddNewOpen('blockchains')}
        renderCell={(item, key) => key === 'profitPercent' ? `${item.profitPercent}%` : (item as any)[key]}
        renderSum={(key, data) => {
          if (key === 'no') return `Total: ${data.length}`;
          if (key === 'profitPercent') return `${data.reduce((sum, item) => sum + item.profitPercent, 0).toFixed(1)}%`;
          return '';
        }}
      />

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-blue-400">{isAdding ? 'Add New Entry' : 'Edit Configuration'}</h3>
              <button onClick={() => { setEditItem(null); setIsAdding(false); setEditType(''); }} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Name / Pair Field */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                  {editItem.pair !== undefined ? 'Trading Pair' : 'Name'}
                </label>
                <input 
                  type="text" 
                  value={editItem.pair !== undefined ? editItem.pair : editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, [editItem.pair !== undefined ? 'pair' : 'name']: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              {/* Pattern Field (if exists) */}
              {editItem.pattern !== undefined && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Pattern / Strategy</label>
                  <input 
                    type="text" 
                    value={editItem.pattern}
                    onChange={(e) => setEditItem({ ...editItem, pattern: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-800">
              <button 
                onClick={() => { setEditItem(null); setIsAdding(false); setEditType(''); }}
                className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
              >
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyMatrix;