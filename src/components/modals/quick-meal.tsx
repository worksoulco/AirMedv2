import { useState } from 'react';
import { X, Camera, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth';

interface QuickMealModalProps {
  onClose: () => void;
  onSave?: (mealData: MealData) => void;
}

export interface MealData {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes: string;
  photo_url: string;
  thumbnail_url: string;
  date: string;
  time: string;
}

const mealTypes = [
  { value: 'breakfast', label: '🌅 Breakfast' },
  { value: 'lunch', label: '☀️ Lunch' },
  { value: 'dinner', label: '🌙 Dinner' },
  { value: 'snack', label: '🍎 Snack' },
] as const;

export function QuickMealModal({ onClose, onSave }: QuickMealModalProps) {
  const [selectedType, setSelectedType] = useState<MealData['type']>('breakfast');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const user = getCurrentUser();

  const createThumbnail = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Use better quality settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not create thumbnail'));
            }
          },
          'image/jpeg',
          0.8 // Higher quality
        );
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !selectedFile) return;

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      // Create a unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Create thumbnail
      const thumbnail = await createThumbnail(selectedFile);
      const thumbnailPath = `${user.id}/thumb_${fileName}`;

      setUploadProgress(20);

      // Upload original photo
      const { error: uploadError } = await supabase.storage
        .from('food-photos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      setUploadProgress(60);

      // Upload thumbnail
      const { error: thumbError } = await supabase.storage
        .from('food-thumbnails')
        .upload(thumbnailPath, thumbnail, {
          cacheControl: '3600',
          upsert: false
        });

      if (thumbError) throw thumbError;
      setUploadProgress(80);

      // Get public URLs
      const { data: { publicUrl: photoUrl } } = supabase.storage
        .from('food-photos')
        .getPublicUrl(filePath);

      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from('food-thumbnails')
        .getPublicUrl(thumbnailPath);

      setUploadProgress(90);

      // Save meal to database
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          patient_id: user.id,
          type: selectedType,
          date,
          time: new Date().toLocaleTimeString(),
          notes,
          photo_url: photoUrl,
          thumbnail_url: thumbnailUrl
        })
        .select()
        .single();

      if (mealError) throw mealError;

      setUploadProgress(100);
      if (onSave) onSave(meal);
      onClose();
    } catch (err) {
      console.error('Error saving meal:', err);
      setError(err instanceof Error ? err.message : 'Failed to save meal');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 pb-[120px] pt-4">
      <div className="relative mt-16 w-full max-w-md sm:mt-8">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Log Meal</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              {/* Date Selection */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Meal Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                {mealTypes.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedType(value)}
                    className={`rounded-lg border p-4 text-center transition-all hover:border-primary hover:bg-primary/5 ${
                      selectedType === value ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Photo Upload */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="meal-photo"
                />
                <label
                  htmlFor="meal-photo"
                  className={`flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-primary hover:bg-gray-50 ${
                    previewUrl ? 'p-0' : 'p-6'
                  }`}
                >
                  {previewUrl ? (
                    <div className="relative h-full w-full">
                      <img
                        src={previewUrl}
                        alt="Meal preview"
                        className="h-full w-full rounded-lg object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">Click to add a photo of your meal</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Upload Progress */}
              {loading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about your meal..."
                className="h-20 w-full rounded-lg border-gray-200 p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t bg-gray-50 px-4 py-3 sm:px-6">
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || loading}
              className="w-full"
            >
              {loading ? 'Saving...' : 'Save Meal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}