import { useState } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { createPatientInvite } from '@/lib/provider';

interface InvitePatientModalProps {
  onClose: () => void;
}

export function InvitePatientModal({ onClose }: InvitePatientModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setError(null);
      if (!name.trim() || !email.trim()) {
        setError('Please fill in all fields');
        return;
      }

      const invite = createPatientInvite(name.trim(), email.trim());
      setInviteCode(invite.code);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invite Patient</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <Mail className="mx-auto h-8 w-8 text-green-600" />
              <h3 className="mt-2 font-medium text-gray-900">Invitation Created</h3>
              <p className="mt-1 text-sm text-gray-500">
                Share this connection code with your patient:
              </p>
              <div className="mt-4">
                <code className="rounded-lg bg-white px-4 py-2 text-lg font-mono font-bold text-primary">
                  {inviteCode}
                </code>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                The code will expire in 7 days
              </p>
            </div>
            <Button
              onClick={onClose}
              className="w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Patient Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter patient's full name"
                className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter patient's email"
                className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Create Invitation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}