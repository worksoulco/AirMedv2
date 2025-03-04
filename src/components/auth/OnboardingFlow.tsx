import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { updateUserProfile } from '@/lib/auth';

interface OnboardingStep {
  title: string;
  description: string;
  fields: {
    name: string;
    label: string;
    type: string;
    placeholder: string;
    options?: string[];
    required: boolean;
  }[];
}

const steps: OnboardingStep[] = [
  {
    title: "Basic Information",
    description: "Let's start with some basic information about you",
    fields: [
      {
        name: "date_of_birth",
        label: "Date of Birth",
        type: "date",
        placeholder: "Select your date of birth",
        required: true
      },
      {
        name: "gender",
        label: "Gender",
        type: "select",
        placeholder: "Select your gender",
        options: ["Male", "Female", "Other", "Prefer not to say"],
        required: true
      }
    ]
  },
  {
    title: "Health Information",
    description: "This helps us personalize your experience",
    fields: [
      {
        name: "height",
        label: "Height (cm)",
        type: "number",
        placeholder: "Enter your height in centimeters",
        required: true
      },
      {
        name: "weight",
        label: "Weight (kg)",
        type: "number",
        placeholder: "Enter your weight in kilograms",
        required: true
      },
      {
        name: "blood_type",
        label: "Blood Type",
        type: "select",
        placeholder: "Select your blood type",
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
        required: false
      }
    ]
  },
  {
    title: "Emergency Contact",
    description: "Someone we can contact in case of emergency",
    fields: [
      {
        name: "emergency_contact_name",
        label: "Emergency Contact Name",
        type: "text",
        placeholder: "Enter full name",
        required: true
      },
      {
        name: "emergency_contact_phone",
        label: "Emergency Contact Phone",
        type: "tel",
        placeholder: "Enter phone number",
        required: true
      },
      {
        name: "emergency_contact_relationship",
        label: "Relationship",
        type: "text",
        placeholder: "e.g. Spouse, Parent, Sibling",
        required: true
      }
    ]
  },
  {
    title: "Connect with Your Doctor",
    description: "If you have a doctor's code, enter it here",
    fields: [
      {
        name: "doctor_code",
        label: "Doctor's Code",
        type: "text",
        placeholder: "Enter the code provided by your doctor",
        required: false
      }
    ]
  }
];

export function OnboardingFlow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateStep = () => {
    const currentFields = steps[currentStep].fields;
    for (const field of currentFields) {
      if (field.required && !formData[field.name]) {
        setError(`${field.label} is required`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      // Format emergency contact data
      const emergencyContact = {
        name: formData.emergency_contact_name,
        phone: formData.emergency_contact_phone,
        relationship: formData.emergency_contact_relationship
      };

      // Prepare profile data
      const profileData = {
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        height: formData.height,
        weight: formData.weight,
        blood_type: formData.blood_type || null,
        emergency_contact: emergencyContact
      };

      // Update user profile
      await updateUserProfile(profileData);

      // If doctor code was provided, handle it
      if (formData.doctor_code) {
        // TODO: Handle doctor code connection
        console.log('Doctor code:', formData.doctor_code);
      }

      // Navigate to dashboard
      navigate('/');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl">Welcome to AirMed</h1>
          <div className="mt-4 flex justify-center space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === currentStep ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{currentStepData.title}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {currentStepData.description}
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {currentStepData.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    disabled={loading}
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder={field.placeholder}
                    disabled={loading}
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-between space-x-4">
              {currentStep > 0 && (
                <Button
                  type="button"
                  onClick={handleBack}
                  className="flex-1"
                  variant="outline"
                  disabled={loading}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1"
                disabled={loading}
              >
                {currentStep === steps.length - 1 ? (
                  loading ? 'Completing...' : 'Complete'
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
