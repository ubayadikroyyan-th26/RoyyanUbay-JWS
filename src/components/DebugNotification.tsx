import React, { useState } from 'react';
import { X, Copy } from 'lucide-react';

interface DebugNotificationProps {
  debugInfo: string;
  onClose: () => void;
}

const DebugNotification: React.FC<DebugNotificationProps> = ({ debugInfo, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(debugInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-emerald-900/90 backdrop-blur-md text-white p-4 rounded-lg shadow-lg max-w-sm border border-emerald-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">Debug Info</h3>
        <button onClick={onClose} className="text-emerald-300 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      <pre className="bg-black/50 p-2 rounded text-xs overflow-auto max-h-40 mb-3 whitespace-pre-wrap">
        {debugInfo}
      </pre>
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-md text-sm transition-colors"
      >
        {copied ? (
          <>Copied!</>
        ) : (
          <><Copy size={14} /> Copy to Clipboard</>
        )}
      </button>
    </div>
  );
};

export default DebugNotification;
