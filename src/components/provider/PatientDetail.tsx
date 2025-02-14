import { useState } from 'react';
import {
  User,
  FileText,
  MessageSquare,
  Activity,
  Plus,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Patient, ClinicalNote } from '@/types/provider';
import { updatePatient, addClinicalNote } from '@/lib/provider';
import { PatientProtocols } from './PatientProtocols';

interface PatientDetailProps {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
}

export function PatientDetail({ patient, onUpdatePatient }: PatientDetailProps) {
  // Ensure patient has protocols array
  const patientWithProtocols = {
    ...patient,
    protocols: patient.protocols || []
  };

  const [showNewNote, setShowNewNote] = useState(false);
  const [newNote, setNewNote] = useState({
    type: 'visit' as ClinicalNote['type'],
    content: '',
    private: false
  });
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);

  const toggleSection = (section: string) => {
    setExpandedSections(current =>
      current.includes(section)
        ? current.filter(s => s !== section)
        : [...current, section]
    );
  };

  const handleAddNote = () => {
    if (!newNote.content.trim()) return;
    
    const user = getCurrentUser();
    const note = addClinicalNote(patient.id, {
      date: new Date().toISOString(),
      type: newNote.type,
      content: newNote.content.trim(),
      provider: user?.userData.name || '', // Use provider's full name without title
      private: newNote.private
    });

    setNewNote({
      type: 'visit',
      content: '',
      private: false
    });
    setShowNewNote(false);
  };

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      {/* Patient Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {patient.photo ? (
            <img
              src={patient.photo}
              alt={patient.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <User className="h-8 w-8 text-gray-600" />
            </div>
          )}
          <div>
            <h1 className="font-serif text-3xl">{patient.name}</h1>
            <p className="text-lg text-gray-600">
              {new Date(patient.dateOfBirth).toLocaleDateString()} • {patient.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Message
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Patient Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Overview Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <button
              onClick={() => toggleSection('overview')}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold">Patient Overview</h2>
              </div>
              {expandedSections.includes('overview') ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.includes('overview') && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Conditions</h3>
                  <div className="mt-2 space-y-2">
                    {patient.conditions.map((condition, index) => (
                      <div
                        key={index}
                        className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                      >
                        {condition}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Active Medications</h3>
                  <div className="mt-2 space-y-2">
                    {patient.medications
                      .filter(med => med.status === 'active')
                      .map((medication) => (
                        <div
                          key={medication.id}
                          className="rounded-lg bg-gray-50 px-3 py-2 text-sm"
                        >
                          <div className="font-medium text-gray-700">{medication.name}</div>
                          <div className="text-gray-500">
                            {medication.dosage} • {medication.frequency}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Protocol Section */}
          <PatientProtocols
            patient={patientWithProtocols}
            onUpdatePatient={onUpdatePatient}
          />

          {/* Clinical Notes Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold">Clinical Notes</h2>
              </div>
              <Button
                onClick={() => setShowNewNote(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Note
              </Button>
            </div>

            {showNewNote && (
              <div className="mb-6 space-y-4 rounded-lg border p-4">
                <select
                  value={newNote.type}
                  onChange={(e) => setNewNote({ ...newNote, type: e.target.value as ClinicalNote['type'] })}
                  className="w-full rounded-lg border-gray-200 text-sm"
                >
                  <option value="visit">Visit Note</option>
                  <option value="lab">Lab Note</option>
                  <option value="prescription">Prescription Note</option>
                  <option value="other">Other</option>
                </select>

                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Enter clinical note..."
                  className="h-32 w-full rounded-lg border-gray-200 text-sm"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={newNote.private}
                      onChange={(e) => setNewNote({ ...newNote, private: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Private note (not visible to patient)
                  </label>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewNote(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddNote}>
                      Save Note
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {patient.notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {note.type.charAt(0).toUpperCase() + note.type.slice(1)}
                      </span>
                      {note.private && (
                        <span className="ml-2 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                          Private
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(note.date).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{note.content}</p>
                  <p className="mt-2 text-sm text-gray-500">By: {note.provider}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-6">
          {/* Lab Results */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold">Recent Labs</h2>
              </div>
            </div>

            {patient.recentLabs ? (
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{patient.recentLabs.type}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(patient.recentLabs.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    patient.recentLabs.status === 'normal'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {patient.recentLabs.status.charAt(0).toUpperCase() + patient.recentLabs.status.slice(1)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-500">No recent lab results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}