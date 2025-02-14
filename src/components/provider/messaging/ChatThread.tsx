import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Image as ImageIcon, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Patient } from '@/types/provider';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  attachments?: {
    type: 'image' | 'document';
    url: string;
    name: string;
  }[];
}

interface ChatThreadProps {
  patient: Patient;
}

export function ChatThread({ patient }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    // Mock messages
    const mockMessages: Message[] = [
      {
        id: '1',
        senderId: patient.id,
        content: "Hi Dr. Chen, I've been experiencing some side effects from the new medication.",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
      },
      {
        id: '2',
        senderId: 'provider',
        content: "I'm sorry to hear that. What kind of side effects are you experiencing?",
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString() // 25 minutes ago
      },
      {
        id: '3',
        senderId: patient.id,
        content: "I've been feeling quite dizzy, especially in the morning. I've also noticed some mild nausea.",
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString() // 20 minutes ago
      },
      {
        id: '4',
        senderId: 'provider',
        content: "Thank you for letting me know. These are known side effects that usually improve after the first week. However, let's monitor your symptoms closely. Could you keep a log of when these symptoms occur and their severity?",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 minutes ago
      }
    ];
    setMessages(mockMessages);
  }, [patient.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: 'provider',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      attachments: attachments.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 'document',
        url: URL.createObjectURL(file),
        name: file.name
      }))
    };

    setMessages([...messages, message]);
    setNewMessage('');
    setAttachments([]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message, index) => {
            const isProvider = message.senderId === 'provider';
            const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

            return (
              <div
                key={message.id}
                className={`flex items-end gap-4 ${isProvider ? 'flex-row-reverse' : ''}`}
              >
                {showAvatar && (
                  <div className="flex-shrink-0">
                    {isProvider ? (
                      <img
                        src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300"
                        alt="Provider"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      patient.photo ? (
                        <img
                          src={patient.photo}
                          alt={patient.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                          {patient.name.charAt(0)}
                        </div>
                      )
                    )}
                  </div>
                )}
                <div className={`max-w-xl ${!showAvatar ? (isProvider ? 'mr-12' : 'ml-12') : ''}`}>
                  <div className={`rounded-2xl px-4 py-2 ${
                    isProvider ? 'bg-primary text-white' : 'bg-white'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                  {message.attachments?.map((attachment, i) => (
                    <div
                      key={i}
                      className={`mt-2 overflow-hidden rounded-lg border ${
                        isProvider ? 'bg-primary/90 text-white' : 'bg-white'
                      }`}
                    >
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt="Attachment"
                          className="max-h-60 w-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center gap-3 p-3">
                          <File className="h-5 w-5" />
                          <span className="text-sm">{attachment.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <p className={`mt-1 text-xs ${
                    isProvider ? 'text-right' : ''
                  } text-gray-500`}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="border-t bg-white p-4">
          <div className="flex gap-4">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative rounded-lg border p-2"
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="h-20 w-20 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 flex-col items-center justify-center gap-2 rounded bg-gray-50">
                    <File className="h-8 w-8 text-gray-400" />
                    <span className="text-xs text-gray-500">{file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -right-2 -top-2 rounded-full bg-gray-900 p-1 text-white hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t bg-white p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-4">
            <div className="relative flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="max-h-32 w-full resize-none rounded-lg border-gray-200 py-3 pl-4 pr-12 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="absolute bottom-2 right-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 ${
                    isUploading ? 'animate-pulse' : ''
                  }`}
                >
                  <Paperclip className="h-5 w-5" />
                </label>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && attachments.length === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full p-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Messages are end-to-end encrypted and comply with HIPAA regulations
          </p>
        </div>
      </div>
    </div>
  );
}