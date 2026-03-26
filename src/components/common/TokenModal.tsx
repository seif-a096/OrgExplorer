import { useState } from 'react';
import { X, Key, ShieldCheck } from 'lucide-react';
import { cacheService } from '../../services/cache';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TokenModal({ isOpen, onClose }: TokenModalProps) {
  const [token, setToken] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (token.trim()) {
      cacheService.setToken(token.trim());
      window.location.reload(); // Reload to re-fetch with token
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-github-dark sharp-border shadow-none w-full max-w-md overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-github-border">
          <div className="flex items-center gap-2 text-white">
            <Key className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Connect GitHub Token</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-github-muted hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-github-text">
            Required to continue browsing or to access private repositories. Your token never leaves your browser.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white uppercase tracking-wider">
              Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full bg-github-canvas sharp-border px-3 py-2 text-white placeholder:text-github-muted focus:outline-none focus:border-[var(--color-aossie-green)] transition-all font-mono"
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-github-muted bg-github-canvas p-3 sharp-border border-dashed">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-aossie-yellow)]" />
            <p className="font-mono">
              We only request read:org and public_repo scopes. Store token in 
              <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-[var(--color-aossie-green)] hover:underline mx-1 font-bold">
                GitHub Settings
              </a>.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-github-border bg-github-dark flex justify-end gap-3 font-mono">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-github-muted uppercase font-bold hover:text-white transition-colors sharp-interactive border-transparent"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!token.trim()}
            className="px-4 py-2 text-sm bg-[var(--color-aossie-green)] hover:bg-[var(--color-aossie-yellow)] text-black sharp-border font-black uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
