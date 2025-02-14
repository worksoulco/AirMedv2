import { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface Question {
  id: string;
  text: string;
  type: 'scale' | 'options';
  options?: string[];
}

const questions: Question[] = [
  {
    id: 'mood',
    text: 'How are you feeling today?',
    type: 'options',
    options: ['😊 Great', '🙂 Good', '😐 Okay', '😕 Not great'],
  },
  {
    id: 'sleep',
    text: 'How well did you sleep?',
    type: 'scale',
  },
  {
    id: 'stress',
    text: 'What\'s your stress level?',
    type: 'scale',
  },
  {
    id: 'energy',
    text: 'How\'s your energy level?',
    type: 'scale',
  },
];

interface DailyCheckInModalProps {
  onClose: () => void;
  onComplete?: (data: any) => void;
  initialData?: {
    mood?: string;
    sleep?: number;
    stress?: number;
    energy?: number;
  };
}

export function DailyCheckInModal({ onClose, onComplete, initialData }: DailyCheckInModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>(() => {
    if (initialData) {
      const initial: Record<string, number | string> = {};
      if (initialData.mood) {
        // Convert emoji back to full option text
        const moodOption = questions[0].options?.find(opt => opt.startsWith(initialData.mood));
        if (moodOption) initial.mood = moodOption;
      }
      if (initialData.sleep) initial.sleep = initialData.sleep;
      if (initialData.stress) initial.stress = initialData.stress;
      if (initialData.energy) initial.energy = initialData.energy;
      return initial;
    }
    return {};
  });

  const handleAnswer = (value: number | string) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: value };
    setAnswers(newAnswers);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Extract emoji from mood answer
      const moodEmoji = (newAnswers.mood as string).split(' ')[0];
      
      // Format the data for the check-in
      const checkInData = {
        date: new Date().toISOString().split('T')[0],
        mood: moodEmoji,
        sleep: newAnswers.sleep as number,
        stress: newAnswers.stress as number,
        energy: newAnswers.energy as number,
      };
      
      onComplete?.(checkInData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pb-[72px]">
      <div className="relative mt-16 w-full max-w-lg sm:mt-8">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="border-b px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {initialData ? 'Edit Check-in' : 'Daily Check-in'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-sm text-gray-500">
                <span>Question {currentQuestion + 1} of {questions.length}</span>
                <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            <div className="min-h-[200px] space-y-6">
              <h3 className="text-lg font-medium text-gray-900">{questions[currentQuestion].text}</h3>

              {questions[currentQuestion].type === 'scale' ? (
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleAnswer(value)}
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-medium transition-all hover:border-primary hover:bg-primary/5 ${
                        answers[questions[currentQuestion].id] === value
                          ? 'border-primary bg-primary/5'
                          : ''
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {questions[currentQuestion].options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                        answers[questions[currentQuestion].id] === option
                          ? 'border-primary bg-primary/5'
                          : ''
                      }`}
                    >
                      {option}
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="rounded-b-2xl border-t bg-gray-50 px-4 py-3 sm:px-6">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => currentQuestion > 0 && setCurrentQuestion(currentQuestion - 1)}
                disabled={currentQuestion === 0}
              >
                Back
              </Button>
              <Button
                onClick={() => currentQuestion < questions.length - 1 && setCurrentQuestion(currentQuestion + 1)}
                disabled={currentQuestion === questions.length - 1 || !answers[questions[currentQuestion].id]}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}