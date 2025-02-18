import { useState, useEffect } from 'react';
import { X, Copy, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProviderCode {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  used_by?: string;
  used_at?: string;
}

interface Props {
  onClose: () => void;
}

export default function InvitePatientModal({ onClose }: Props) {
  const [codes, setCodes] = useState<ProviderCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const loadCodes = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('provider_codes')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCodes(data || []);
      } catch (err) {
        console.error('Error loading codes:', err);
        setError(err instanceof Error ? err.message : 'Failed to load codes');
      } finally {
        setLoading(false);
      }
    };

    loadCodes();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('provider_codes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_codes',
          filter: `provider_id=eq.${user.id}`
        },
        () => loadCodes()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const generateCode = async () => {
    if (!user?.id) return;

    try {
      setGenerating(true);
      setError(null);

      const { error } = await supabase
        .rpc('create_provider_code', {
          expiry_days: 30
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error generating code:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Error copying code:', err);
    }
  };

  const revokeCode = async (codeId: string) => {
    if (!user?.id) return;

    try {
      setError(null);

      const { error } = await supabase
        .from('provider_codes')
        .update({ status: 'revoked' })
        .eq('id', codeId)
        .eq('provider_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error revoking code:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke code');
    }
  };

  const activeCodes = codes.filter(code => code.status === 'active');
  const usedCodes = codes.filter(code => code.status === 'used');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Manage Connection Codes</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-2"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Button
                onClick={generateCode}
                disabled={generating || activeCodes.length >= 10}
                className="w-full"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Generate New Code'
                )}
              </Button>
              {activeCodes.length >= 10 && (
                <p className="mt-2 text-center text-sm text-red-600">
                  Maximum active codes reached (10)
                </p>
              )}
            </div>

            <div className="space-y-6">
              {/* Active Codes */}
              <div>
                <h3 className="mb-3 font-medium">Active Codes</h3>
                {activeCodes.length === 0 ? (
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <p className="text-sm text-gray-500">No active codes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-lg">{code.code}</p>
                            <button
                              onClick={() => copyCode(code.code)}
                              className="rounded-full p-1 hover:bg-gray-100"
                            >
                              {copiedCode === code.code ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Expires {new Date(code.expires_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => revokeCode(code.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Used Codes */}
              {usedCodes.length > 0 && (
                <div>
                  <h3 className="mb-3 font-medium">Used Codes</h3>
                  <div className="space-y-3">
                    {usedCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-mono text-lg text-gray-400">{code.code}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Used {new Date(code.used_at!).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
