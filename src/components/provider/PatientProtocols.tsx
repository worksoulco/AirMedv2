import { useState } from 'react';
import { ClipboardList, Plus, ChevronDown, ChevronUp, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Protocol, Patient } from '@/types/provider';
import { updatePatient } from '@/lib/provider';
import { NewProtocolModal } from './NewProtocolModal';

interface PatientProtocolsProps {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
}

export function PatientProtocols({ patient, onUpdatePatient }: PatientProtocolsProps) {
  const [showNewProtocol, setShowNewProtocol] = useState(false);
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(
    patient.protocols.find(p => p.status === 'active')?.id || null
  );

  const activeProtocol = patient.protocols.find(p => p.status === 'active');
  const historicalProtocols = patient.protocols.filter(p => p.status !== 'active');

  const handleAddProtocol = (protocol: Protocol) => {
    // If there's an active protocol, mark it as completed
    const updatedProtocols = patient.protocols.map(p => 
      p.status === 'active' ? { ...p, status: 'completed' } : p
    );

    const updatedPatient = {
      ...patient,
      protocols: [...updatedProtocols, protocol]
    };
    updatePatient(patient.id, updatedPatient);
    onUpdatePatient(updatedPatient);
    setShowNewProtocol(false);
  };

  const toggleProtocol = (protocolId: string) => {
    setExpandedProtocol(expandedProtocol === protocolId ? null : protocolId);
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Treatment Protocols</h2>
            <p className="text-sm text-gray-500">Manage patient's care plans</p>
          </div>
        </div>
        <Button
          onClick={() => setShowNewProtocol(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Protocol
        </Button>
      </div>

      <div className="space-y-6">
        {/* Active Protocol */}
        {activeProtocol ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{activeProtocol.title}</h3>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    Active
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Started {new Date(activeProtocol.startDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {activeProtocol.endDate
                      ? `Ends ${new Date(activeProtocol.endDate).toLocaleDateString()}`
                      : 'Ongoing'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleProtocol(activeProtocol.id)}
                className="rounded-full p-1 hover:bg-blue-100"
              >
                {expandedProtocol === activeProtocol.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            {expandedProtocol === activeProtocol.id && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-600">{activeProtocol.description}</p>
                
                {/* Tasks */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Tasks</h4>
                  {activeProtocol.tasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border border-blue-100 bg-white p-3"
                    >
                      <div className={`mt-0.5 rounded-full p-1 ${
                        task.status === 'completed' ? 'bg-green-100 text-green-600' :
                        task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        {task.description && (
                          <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span className="rounded-full bg-gray-100 px-2 py-1">
                            {task.frequency.replace('_', ' ')}
                          </span>
                          {task.dueDate && (
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {activeProtocol.notes && (
                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">Notes</h4>
                    <p className="text-sm text-gray-600">{activeProtocol.notes}</p>
                  </div>
                )}

                {/* Attachments */}
                {activeProtocol.attachments && activeProtocol.attachments.length > 0 && (
                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">Attachments</h4>
                    <div className="space-y-2">
                      {activeProtocol.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border p-2 text-sm text-blue-600 hover:bg-gray-50"
                        >
                          <ClipboardList className="h-4 w-4" />
                          {attachment.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-2 font-medium text-gray-900">No Active Protocol</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create a new protocol to start managing this patient's care plan
            </p>
          </div>
        )}

        {/* Historical Protocols */}
        {historicalProtocols.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Protocol History</h3>
            {historicalProtocols.map(protocol => (
              <div
                key={protocol.id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{protocol.title}</h4>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        protocol.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {protocol.status.charAt(0).toUpperCase() + protocol.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(protocol.startDate).toLocaleDateString()} - {
                          protocol.endDate
                            ? new Date(protocol.endDate).toLocaleDateString()
                            : 'Ongoing'
                        }
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleProtocol(protocol.id)}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    {expandedProtocol === protocol.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>

                {expandedProtocol === protocol.id && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-gray-600">{protocol.description}</p>
                    
                    {/* Tasks */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Tasks</h4>
                      {protocol.tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
                        >
                          <div className={`mt-0.5 rounded-full p-1 ${
                            task.status === 'completed' ? 'bg-green-100 text-green-600' :
                            task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{task.title}</p>
                            {task.description && (
                              <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Protocol Modal */}
      {showNewProtocol && (
        <NewProtocolModal
          onClose={() => setShowNewProtocol(false)}
          onSave={handleAddProtocol}
        />
      )}
    </div>
  );
}