import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  FileText,
  AlertCircle,
  XCircle,
} from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const normalized = (status || 'Assigned').toLowerCase().replace(/\s+/g, '-');

  const getIcon = () => {
    switch (normalized) {
      case 'approved':
        return <CheckCircle2 size={13} />;
      case 'submitted':
        return <FileCheck size={13} />;
      case 'under-review':
        return <Clock size={13} />;
      case 'needs-correction':
        return <AlertTriangle size={13} />;
      case 'in-progress':
        return <Clock size={13} />;
      case 'overdue':
        return <AlertCircle size={13} />;
      case 'rejected':
        return <XCircle size={13} />;
      case 'assigned':
      default:
        return <FileText size={13} />;
    }
  };

  return (
    <span className={`status-badge ${normalized}`}>
      {getIcon()}
      <span>{status || 'Assigned'}</span>
    </span>
  );
};

export const PriorityBadge = ({ priority = 'Medium' }) => {
  const norm = priority.toLowerCase();
  return (
    <span className={`priority-badge ${norm}`}>
      <span className="dot" style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: norm === 'high' ? '#DC2626' : norm === 'medium' ? '#D97706' : '#64748B',
        display: 'inline-block',
      }} />
      <span>{priority}</span>
    </span>
  );
};
