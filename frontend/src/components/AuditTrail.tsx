import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Download, Eye, Clock, User, Activity } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface AuditEvent {
  id: string;
  timestamp: number;
  user: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'trade' | 'config' | 'system' | 'compliance';
}

const AuditTrail: React.FC = () => {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([
    {
      id: '1',
      timestamp: Date.now() - 3600000,
      user: 'john.doe@alpha-orion.com',
      action: 'LOGIN_SUCCESS',
      resource: 'Authentication',
      details: 'User logged in from web dashboard',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low',
      category: 'auth'
    },
    {
      id: '2',
      timestamp: Date.now() - 1800000,
      user: 'system@alpha-orion.com',
      action: 'STRATEGY_UPDATE',
      resource: 'Spot Arbitrage',
      details: 'Capital velocity adjusted from 75% to 80%',
      ipAddress: '10.0.0.50',
      userAgent: 'Alpha-Orion Backend v2.1.0',
      severity: 'medium',
      category: 'config'
    },
    {
      id: '3',
      timestamp: Date.now() - 900000,
      user: 'jane.smith@alpha-orion.com',
      action: 'TRADE_EXECUTED',
      resource: 'Flash Loan Arbitrage',
      details: 'Executed arbitrage trade: 100 ETH -> USDC -> ETH, profit: $2,450',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      severity: 'high',
      category: 'trade'
    },
    {
      id: '4',
      timestamp: Date.now() - 300000,
      user: 'compliance@alpha-orion.com',
      action: 'REPORT_GENERATED',
      resource: 'FINCEN SAR',
      details: 'Generated Q1 2024 Suspicious Activity Report',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/605.1.15',
      severity: 'medium',
      category: 'compliance'
    },
    {
      id: '5',
      timestamp: Date.now() - 120000,
      user: 'system@alpha-orion.com',
      action: 'ALERT_TRIGGERED',
      resource: 'Risk Management',
      details: 'VaR threshold exceeded: 6.2% > 5.0%',
      ipAddress: '10.0.0.50',
      userAgent: 'Alpha-Orion Risk Engine v1.8.2',
      severity: 'high',
      category: 'system'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'AUDIT_EVENT') {
      const { event } = lastMessage.payload;
      if (event) {
        setAuditEvents(prev => [event, ...prev.slice(0, 999)]); // Keep last 1000 events
      }
    }
  }, [lastMessage]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/30 border-red-700';
      case 'high': return 'text-orange-400 bg-orange-900/30 border-orange-700';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      case 'low': return 'text-blue-400 bg-blue-900/30 border-blue-700';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth': return 'text-blue-400';
      case 'trade': return 'text-green-400';
      case 'config': return 'text-purple-400';
      case 'system': return 'text-orange-400';
      case 'compliance': return 'text-teal-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth': return <User size={14} />;
      case 'trade': return <Activity size={14} />;
      case 'config': return <FileText size={14} />;
      case 'system': return <Clock size={14} />;
      case 'compliance': return <Shield size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const filteredEvents = auditEvents.filter(event => {
    const matchesSearch = searchTerm === '' ||
      event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const exportAuditLog = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Details', 'IP Address', 'Severity', 'Category'],
      ...filteredEvents.map(event => [
        new Date(event.timestamp).toISOString(),
        event.user,
        event.action,
        event.resource,
        event.details,
        event.ipAddress,
        event.severity,
        event.category
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <FileText size={20} />
          Audit Trail
        </h3>
        <button
          onClick={exportAuditLog}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
        >
          <option value="all">All Categories</option>
          <option value="auth">Authentication</option>
          <option value="trade">Trading</option>
          <option value="config">Configuration</option>
          <option value="system">System</option>
          <option value="compliance">Compliance</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
        >
          <option value="all">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Audit Events Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">User</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Action</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Resource</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Severity</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Category</th>
                <th className="px-4 py-3 text-center text-gray-400 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => (
                <tr key={event.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-gray-300">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-medium">
                    {event.user}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <span className="font-mono text-xs bg-gray-700 px-2 py-1 rounded">
                      {event.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {event.resource}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1 ${getCategoryColor(event.category)}`}>
                      {getCategoryIcon(event.category)}
                      <span className="capitalize text-xs">{event.category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="p-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-blue-400">Event Details</h4>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Timestamp</label>
                  <p className="text-gray-200">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">User</label>
                  <p className="text-gray-200 font-medium">{selectedEvent.user}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Action</label>
                  <p className="text-gray-200 font-mono">{selectedEvent.action}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Resource</label>
                  <p className="text-gray-200">{selectedEvent.resource}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Severity</label>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(selectedEvent.severity)}`}>
                    {selectedEvent.severity.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Category</label>
                  <div className={`flex items-center gap-1 ${getCategoryColor(selectedEvent.category)}`}>
                    {getCategoryIcon(selectedEvent.category)}
                    <span className="capitalize">{selectedEvent.category}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Details</label>
                <p className="text-gray-200 bg-gray-800 p-3 rounded border border-gray-700">
                  {selectedEvent.details}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">IP Address</label>
                  <p className="text-gray-200 font-mono">{selectedEvent.ipAddress}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">User Agent</label>
                  <p className="text-gray-200 text-xs truncate" title={selectedEvent.userAgent}>
                    {selectedEvent.userAgent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Activity size={24} className="text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{auditEvents.length}</p>
          <p className="text-sm text-gray-400">Total Events</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {auditEvents.filter(e => e.severity === 'critical').length}
          </p>
          <p className="text-sm text-gray-400">Critical Events</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Clock size={24} className="text-orange-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {auditEvents.filter(e => e.category === 'auth').length}
          </p>
          <p className="text-sm text-gray-400">Auth Events</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Activity size={24} className="text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {auditEvents.filter(e => e.category === 'trade').length}
          </p>
          <p className="text-sm text-gray-400">Trade Events</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Shield size={24} className="text-teal-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {auditEvents.filter(e => e.category === 'compliance').length}
          </p>
          <p className="text-sm text-gray-400">Compliance Events</p>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
