import React, { useState, useEffect } from 'react';
import { Shield, FileText, AlertTriangle, CheckCircle, XCircle, Download, Calendar, Users, DollarSign } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface ComplianceMetric {
  id: string;
  category: 'KYC' | 'AML' | 'Trading' | 'Reporting' | 'Audit';
  status: 'compliant' | 'warning' | 'breach' | 'pending';
  title: string;
  description: string;
  lastChecked: number;
  nextDue: number;
  responsible: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface RegulatoryReport {
  id: string;
  type: 'FINCEN' | 'OCC' | 'SEC' | 'CFTC' | 'FATF';
  period: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedDate?: number;
  dueDate: number;
  fileUrl?: string;
}

const ComplianceDashboard: React.FC = () => {
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetric[]>([
    {
      id: 'kyc_refresh',
      category: 'KYC',
      status: 'compliant',
      title: 'Customer KYC Refresh',
      description: 'Annual KYC verification for all active customers',
      lastChecked: Date.now() - 86400000 * 30,
      nextDue: Date.now() + 86400000 * 335,
      responsible: 'Compliance Team',
      severity: 'high'
    },
    {
      id: 'aml_monitoring',
      category: 'AML',
      status: 'warning',
      title: 'AML Transaction Monitoring',
      description: 'Suspicious transaction patterns detected',
      lastChecked: Date.now() - 3600000,
      nextDue: Date.now() + 86400000,
      responsible: 'AML Officer',
      severity: 'high'
    },
    {
      id: 'trading_limits',
      category: 'Trading',
      status: 'compliant',
      title: 'Position Limit Compliance',
      description: 'Daily position limits within regulatory thresholds',
      lastChecked: Date.now() - 86400000,
      nextDue: Date.now() + 86400000 * 7,
      responsible: 'Risk Management',
      severity: 'medium'
    },
    {
      id: 'monthly_reporting',
      category: 'Reporting',
      status: 'pending',
      title: 'Monthly Regulatory Reports',
      description: 'FINCEN SAR filing and OCC position reports',
      lastChecked: Date.now() - 86400000 * 25,
      nextDue: Date.now() + 86400000 * 5,
      responsible: 'Compliance Team',
      severity: 'high'
    }
  ]);

  const [regulatoryReports, setRegulatoryReports] = useState<RegulatoryReport[]>([
    {
      id: 'fincen_sar_2024',
      type: 'FINCEN',
      period: 'Q1 2024',
      status: 'submitted',
      submittedDate: Date.now() - 86400000 * 15,
      dueDate: Date.now() - 86400000 * 10,
      fileUrl: '/reports/fincen-sar-q1-2024.pdf'
    },
    {
      id: 'occ_positions_2024',
      type: 'OCC',
      period: 'March 2024',
      status: 'approved',
      submittedDate: Date.now() - 86400000 * 20,
      dueDate: Date.now() - 86400000 * 15,
      fileUrl: '/reports/occ-positions-mar-2024.pdf'
    },
    {
      id: 'sec_form_pf_2024',
      type: 'SEC',
      period: 'Q1 2024',
      status: 'draft',
      dueDate: Date.now() + 86400000 * 10,
      fileUrl: '/reports/sec-form-pf-q1-2024-draft.pdf'
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'COMPLIANCE_UPDATE') {
      const { metric } = lastMessage.payload;
      if (metric) {
        setComplianceMetrics(prev => prev.map(m =>
          m.id === metric.id ? { ...m, ...metric } : m
        ));
      }
    }
  }, [lastMessage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'approved':
      case 'submitted':
        return 'text-green-400 bg-green-900/30 border-green-700';
      case 'warning':
      case 'draft':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      case 'breach':
      case 'rejected':
        return 'text-red-400 bg-red-900/30 border-red-700';
      case 'pending':
        return 'text-blue-400 bg-blue-900/30 border-blue-700';
      default:
        return 'text-gray-400 bg-gray-900/30 border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'approved':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'warning':
      case 'draft':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'breach':
      case 'rejected':
        return <XCircle size={16} className="text-red-400" />;
      case 'pending':
      case 'submitted':
        return <FileText size={16} className="text-blue-400" />;
      default:
        return <Shield size={16} className="text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const filteredMetrics = selectedCategory === 'all'
    ? complianceMetrics
    : complianceMetrics.filter(m => m.category === selectedCategory);

  const complianceScore = Math.round(
    (complianceMetrics.filter(m => m.status === 'compliant').length / complianceMetrics.length) * 100
  );

  const overdueItems = complianceMetrics.filter(m => m.nextDue < Date.now() && m.status !== 'compliant');

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Shield size={20} />
          Compliance Dashboard
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Compliance Score</p>
            <p className={`text-xl font-bold ${
              complianceScore >= 90 ? 'text-green-400' :
              complianceScore >= 75 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {complianceScore}%
            </p>
          </div>
          {overdueItems.length > 0 && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-red-400">{overdueItems.length} Overdue</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-400">Filter by Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="KYC">KYC</option>
            <option value="AML">AML</option>
            <option value="Trading">Trading</option>
            <option value="Reporting">Reporting</option>
            <option value="Audit">Audit</option>
          </select>
        </div>
      </div>

      {/* Compliance Metrics */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Compliance Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMetrics.map(metric => (
            <div key={metric.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <span className="text-xs font-medium text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {metric.category}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${getSeverityColor(metric.severity)} bg-current/20`}>
                  {metric.severity.toUpperCase()}
                </span>
              </div>

              <h5 className="font-semibold text-gray-200 mb-2">{metric.title}</h5>
              <p className="text-sm text-gray-400 mb-3">{metric.description}</p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Checked:</span>
                  <span className="text-gray-300">{new Date(metric.lastChecked).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Next Due:</span>
                  <span className={`font-medium ${
                    metric.nextDue < Date.now() ? 'text-red-400' :
                    metric.nextDue < Date.now() + 86400000 * 7 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {new Date(metric.nextDue).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Responsible:</span>
                  <span className="text-gray-300">{metric.responsible}</span>
                </div>
              </div>

              <div className={`mt-3 px-3 py-2 rounded text-center text-sm font-medium ${getStatusColor(metric.status)}`}>
                {metric.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regulatory Reports */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <FileText size={16} />
          Regulatory Reports
        </h4>
        <div className="space-y-3">
          {regulatoryReports.map(report => (
            <div key={report.id} className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${getStatusColor(report.status)}`}>
                  {getStatusIcon(report.status)}
                </div>
                <div>
                  <h5 className="font-semibold text-gray-200">{report.type} - {report.period}</h5>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                    <span>Due: {new Date(report.dueDate).toLocaleDateString()}</span>
                    {report.submittedDate && (
                      <span>Submitted: {new Date(report.submittedDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status.toUpperCase()}
                </span>
                {report.fileUrl && (
                  <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                    <Download size={14} className="text-gray-300" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Users size={24} className="text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{complianceMetrics.filter(m => m.status === 'compliant').length}</p>
          <p className="text-sm text-gray-400">Compliant Items</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <AlertTriangle size={24} className="text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{complianceMetrics.filter(m => m.status === 'warning').length}</p>
          <p className="text-sm text-gray-400">Warnings</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <XCircle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{complianceMetrics.filter(m => m.status === 'breach').length}</p>
          <p className="text-sm text-gray-400">Breaches</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Calendar size={24} className="text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{regulatoryReports.filter(r => r.status === 'submitted' || r.status === 'approved').length}</p>
          <p className="text-sm text-gray-400">Reports Filed</p>
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
