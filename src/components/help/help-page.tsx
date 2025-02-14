import { useState } from 'react';
import { Search, Book, MessageCircle, Phone, Mail, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I track my daily wellness?",
    answer: "You can track your daily wellness through check-ins on the home page. Click the '+' button at the bottom of the screen and select 'Daily Check-in' to log your mood, sleep quality, stress level, and energy level.",
    category: "Tracking"
  },
  {
    question: "How do I log my meals?",
    answer: "To log a meal, go to the Food Journal page and click the 'Log Meal' button. You can add photos, notes, and select the meal type (breakfast, lunch, dinner, or snack).",
    category: "Food Journal"
  },
  {
    question: "How do I view my lab results?",
    answer: "Your lab results can be found in the Labs section. You can upload new lab results by clicking the 'Add Results' button and either uploading a PDF or manually entering the values.",
    category: "Labs"
  },
  {
    question: "How do I message my healthcare provider?",
    answer: "You can message your healthcare provider through the Messages section. Simply select your provider and type your message. You can also attach files if needed.",
    category: "Communication"
  },
  {
    question: "How do I track my habits and goals?",
    answer: "Use the Habits section to create and track daily habits. Click the '+' button to add a new habit or goal, then track your progress daily by marking items as complete.",
    category: "Tracking"
  },
  {
    question: "How secure is my health data?",
    answer: "Your health data is protected with end-to-end encryption and complies with HIPAA regulations. We use industry-standard security measures to ensure your information remains private and secure.",
    category: "Security"
  }
];

const supportContacts = [
  {
    type: "Phone",
    value: "(555) 123-4567",
    icon: Phone,
    hours: "Mon-Fri, 9am-5pm EST"
  },
  {
    type: "Email",
    value: "support@airmed.com",
    icon: Mail,
    hours: "24/7 response within 1 business day"
  },
  {
    type: "Chat",
    value: "Live Chat",
    icon: MessageCircle,
    hours: "Mon-Fri, 9am-5pm EST"
  }
];

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = ['all', ...new Set(faqs.map(faq => faq.category))];

  // Filter FAQs based on search and category
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl">Help Center</h1>
          <p className="text-lg text-gray-600">
            Find answers to common questions and get support
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-gray-200 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-12 space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Book className="h-5 w-5" />
            Frequently Asked Questions
          </h2>

          {filteredFaqs.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
              <h3 className="mt-2 font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search terms or browse all categories
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border bg-white">
              {filteredFaqs.map((faq) => (
                <div key={faq.question} className="p-4">
                  <button
                    onClick={() => setExpandedQuestion(
                      expandedQuestion === faq.question ? null : faq.question
                    )}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <h3 className="font-medium text-gray-900">{faq.question}</h3>
                    {expandedQuestion === faq.question ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  {expandedQuestion === faq.question && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{faq.answer}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          {faq.category}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Contact */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <MessageCircle className="h-5 w-5" />
            Contact Support
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {supportContacts.map((contact) => (
              <div
                key={contact.type}
                className="rounded-lg border bg-white p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <contact.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-gray-900">{contact.type}</h3>
                </div>
                <p className="text-sm font-medium text-gray-900">{contact.value}</p>
                <p className="mt-1 text-xs text-gray-500">{contact.hours}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}