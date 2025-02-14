import { useState } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import type { Protocol, ProtocolTask } from '@/types/provider';
import { getCurrentUser } from '@/lib/auth';

interface NewProtocolModalProps {
  onClose: () => void;
  onSave: (protocol: Protocol) => void;
}

export function NewProtocolModal({ onClose, onSave }: NewProtocolModalProps) {
  const user = getCurrentUser();
  const [protocol, setProtocol] = useState<Omit<Protocol, 'id'>>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    type: 'treatment',
    status: 'active',
    provider: user?.userData.name || '', // Use provider's full name without assuming title
    tasks: [],
    notes: ''
  });

  const [newTask, setNewTask] = useState<Partial<ProtocolTask>>({
    title: '',
    description: '',
    frequency: 'daily'
  });

  const addTask = () => {
    if (!newTask.title) return;

    const task: ProtocolTask = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description || '',
      frequency: newTask.frequency || 'daily',
      status: 'pending'
    };

    setProtocol(prev => ({
      ...prev,
      tasks: [...prev.tasks, task]
    }));

    setNewTask({
      title: '',
      description: '',
      frequency: 'daily'
    });
  };

  const removeTask = (taskId: string) => {
    setProtocol(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId)
    }));
  };

  const handleSubmit = () => {
    if (!protocol.title) return;

    onSave({
      ...protocol,
      id: Date.now().toString()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create New Protocol</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Protocol Title
              </label>
              <input
                type="text"
                value={protocol.title}
                onChange={(e) => setProtocol(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter protocol title"
                className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={protocol.description}
                onChange={(e) => setProtocol(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the protocol..."
                className="h-24 w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  value={protocol.startDate}
                  onChange={(e) => setProtocol(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={protocol.endDate || ''}
                  onChange={(e) => setProtocol(prev => ({ ...prev, endDate: e.target.value || undefined }))}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Protocol Type
              </label>
              <select
                value={protocol.type}
                onChange={(e) => setProtocol(prev => ({ ...prev, type: e.target.value as Protocol['type'] }))}
                className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="treatment">Treatment</option>
                <option value="recovery">Recovery</option>
                <option value="maintenance">Maintenance</option>
                <option value="preventive">Preventive</option>
              </select>
            </div>
          </div>

          {/* Tasks */}
          <div>
            <h3 className="mb-4 font-medium text-gray-900">Protocol Tasks</h3>
            
            <div className="mb-4 space-y-4 rounded-lg border p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Task Description (Optional)
                </label>
                <input
                  type="text"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the task"
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Frequency
                </label>
                <select
                  value={newTask.frequency}
                  onChange={(e) => setNewTask(prev => ({ ...prev, frequency: e.target.value as ProtocolTask['frequency'] }))}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="as_needed">As Needed</option>
                </select>
              </div>

              <Button
                onClick={addTask}
                disabled={!newTask.title}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>

            {protocol.tasks.length > 0 ? (
              <div className="space-y-2">
                {protocol.tasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Frequency: {task.frequency.replace('_', ' ')}
                      </p>
                    </div>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-gray-500">No tasks added yet</p>
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Additional Notes (Optional)
            </label>
            <textarea
              value={protocol.notes}
              onChange={(e) => setProtocol(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
              className="h-24 w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!protocol.title || protocol.tasks.length === 0}
          >
            Create Protocol
          </Button>
        </div>
      </div>
    </div>
  );
}