import { useState, useEffect } from 'react';
import { FileText, Search, Filter, Plus, Tag, Calendar, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { ClinicalNote } from '@/types/provider';
import { loadProviderData, addClinicalNote } from '@/lib/provider';

type NoteFilter = 'all' | 'visit' | 'lab' | 'prescription' | 'other';

export function NotesPage() {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [showNewNote, setShowNewNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<NoteFilter>('all');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [newNote, setNewNote] = useState({
    type: 'visit' as ClinicalNote['type'],
    content: '',
    private: false,
    tags: [] as string[],
    patientId: '' as string | null,
    patientName: '' as string | null
  });

  const provider = loadProviderData();
  const patients = provider?.patients || [];

  // Filter patients based on search
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.email.toLowerCase().includes(patientSearch.toLowerCase())
  );

  useEffect(() => {
    const loadNotes = () => {
      const provider = loadProviderData();
      if (provider) {
        // Collect all notes from all patients
        const allNotes = provider.patients.reduce((acc, patient) => {
          return [...acc, ...patient.notes.map(note => ({
            ...note,
            patientName: patient.name,
            patientId: patient.id
          }))];
        }, [] as (ClinicalNote & { patientName: string; patientId: string })[]);

        // Sort by date, most recent first
        allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotes(allNotes);
      }
    };

    loadNotes();
    window.addEventListener('providerUpdate', loadNotes);
    return () => window.removeEventListener('providerUpdate', loadNotes);
  }, []);

  const handleAddNote = () => {
    if (!newNote.content.trim()) return;

    const note = addClinicalNote(newNote.patientId || 'general', {
      date: new Date().toISOString(),
      type: newNote.type,
      content: newNote.content.trim(),
      provider: provider?.name || '',
      private: newNote.private,
      tags: newNote.tags
    });

    setNewNote({
      type: 'visit',
      content: '',
      private: false,
      tags: [],
      patientId: null,
      patientName: null
    });
    setShowNewNote(false);
  };

  const selectPatient = (patient: { id: string; name: string }) => {
    setNewNote(prev => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name
    }));
    setPatientSearch('');
    setShowPatientList(false);
  };

  const clearSelectedPatient = () => {
    setNewNote(prev => ({
      ...prev,
      patientId: null,
      patientName: null
    }));
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (note as any).patientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || note.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl">Clinical Notes</h1>
            <p className="text-lg text-gray-600">Manage and organize patient notes</p>
          </div>
          <Button
            onClick={() => setShowNewNote(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Note
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-gray-200 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={selectedFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedFilter('all')}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              All
            </Button>
            <Button
              variant={selectedFilter === 'visit' ? 'default' : 'outline'}
              onClick={() => setSelectedFilter('visit')}
            >
              Visit Notes
            </Button>
            <Button
              variant={selectedFilter === 'lab' ? 'default' : 'outline'}
              onClick={() => setSelectedFilter('lab')}
            >
              Lab Notes
            </Button>
            <Button
              variant={selectedFilter === 'prescription' ? 'default' : 'outline'}
              onClick={() => setSelectedFilter('prescription')}
            >
              Prescriptions
            </Button>
          </div>
        </div>

        {/* New Note Form */}
        {showNewNote && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Clinical Note</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewNote(false)}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Note Type
                  </label>
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
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Associated Patient
                  </label>
                  <div className="relative">
                    {newNote.patientName ? (
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <span className="text-sm">{newNote.patientName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSelectedPatient}
                          className="h-6 px-2 text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e) => {
                            setPatientSearch(e.target.value);
                            setShowPatientList(true);
                          }}
                          onFocus={() => setShowPatientList(true)}
                          placeholder="Search patients..."
                          className="w-full rounded-lg border-gray-200 text-sm"
                        />
                        {showPatientList && (
                          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {filteredPatients.length > 0 ? (
                              filteredPatients.map(patient => (
                                <button
                                  key={patient.id}
                                  onClick={() => selectPatient(patient)}
                                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50"
                                >
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                                    <Users className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{patient.name}</p>
                                    <p className="text-xs text-gray-500">{patient.email}</p>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">
                                No patients found
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Note Content
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Enter your clinical note..."
                  className="h-32 w-full rounded-lg border-gray-200 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Add tags separated by commas"
                  value={newNote.tags.join(', ')}
                  onChange={(e) => setNewNote({
                    ...newNote,
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  className="w-full rounded-lg border-gray-200 text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newNote.private}
                    onChange={(e) => setNewNote({ ...newNote, private: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Private note (not visible to patient)</span>
                </label>

                <Button onClick={handleAddNote}>
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.map((note: any) => (
            <div
              key={note.id}
              className="rounded-xl bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        {note.type.charAt(0).toUpperCase() + note.type.slice(1)}
                      </span>
                      {note.private && (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-600">
                          Private
                        </span>
                      )}
                    </div>
                    {note.patientName && (
                      <p className="mt-1 text-sm text-gray-500">
                        Patient: {note.patientName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {new Date(note.date).toLocaleDateString()}
                </div>
              </div>

              <p className="whitespace-pre-wrap text-gray-700">{note.content}</p>

              {note.tags && note.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {note.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredNotes.length === 0 && (
            <div className="rounded-xl bg-white p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 font-medium text-gray-900">No notes found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? "No notes match your search criteria"
                  : "Start by creating your first clinical note"}
              </p>
              <Button
                onClick={() => setShowNewNote(true)}
                className="mt-4"
              >
                Create Note
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}