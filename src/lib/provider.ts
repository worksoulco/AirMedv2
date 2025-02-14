import type {
  Provider,
  Patient,
  PatientAlert,
  WellnessMetric,
  Appointment,
  Message,
  ClinicalNote,
  PatientInvite
} from '@/types/provider';

// Load provider data
export function loadProviderData(): Provider | null {
  const stored = localStorage.getItem('providerData');
  return stored ? JSON.parse(stored) : null;
}

// Save provider data
export function saveProviderData(data: Provider) {
  localStorage.setItem('providerData', JSON.stringify(data));
  window.dispatchEvent(new Event('providerUpdate'));
}

// Update patient data
export function updatePatient(patientId: string, updates: Partial<Patient>): Patient {
  const provider = loadProviderData();
  if (!provider) {
    throw new Error('Provider not found');
  }

  const patientIndex = provider.patients.findIndex(p => p.id === patientId);
  if (patientIndex === -1) {
    throw new Error('Patient not found');
  }

  const updatedPatient = { ...provider.patients[patientIndex], ...updates };
  const updatedProvider = {
    ...provider,
    patients: [
      ...provider.patients.slice(0, patientIndex),
      updatedPatient,
      ...provider.patients.slice(patientIndex + 1)
    ]
  };

  saveProviderData(updatedProvider);
  return updatedPatient;
}

// Add clinical note
export function addClinicalNote(patientId: string | 'general', note: Omit<ClinicalNote, 'id'>): ClinicalNote {
  const provider = loadProviderData();
  if (!provider) {
    throw new Error('Provider not found');
  }

  const newNote: ClinicalNote = {
    ...note,
    id: Date.now().toString()
  };

  if (patientId === 'general') {
    // Store general notes separately
    const generalNotes = JSON.parse(localStorage.getItem('generalNotes') || '[]');
    generalNotes.push(newNote);
    localStorage.setItem('generalNotes', JSON.stringify(generalNotes));
  } else {
    const patientIndex = provider.patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) {
      throw new Error('Patient not found');
    }

    const updatedPatient = {
      ...provider.patients[patientIndex],
      notes: [...provider.patients[patientIndex].notes, newNote]
    };

    const updatedProvider = {
      ...provider,
      patients: [
        ...provider.patients.slice(0, patientIndex),
        updatedPatient,
        ...provider.patients.slice(patientIndex + 1)
      ]
    };

    saveProviderData(updatedProvider);
  }

  window.dispatchEvent(new Event('notesUpdate'));
  return newNote;
}

// Create patient invite
export function createPatientInvite(name: string, email: string): PatientInvite {
  const provider = loadProviderData();
  if (!provider) {
    throw new Error('Provider not found');
  }

  // Check if invite already exists
  const existingInvite = provider.pendingInvites.find(
    invite => invite.email === email && invite.status === 'pending'
  );
  if (existingInvite) {
    throw new Error('An invitation has already been sent to this email');
  }

  // Create new invite
  const invite: PatientInvite = {
    id: Date.now().toString(),
    name,
    email,
    code: generateInviteCode(),
    sentDate: new Date().toISOString(),
    status: 'pending',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
  };

  // Update provider data
  const updatedProvider = {
    ...provider,
    pendingInvites: [...provider.pendingInvites, invite]
  };
  saveProviderData(updatedProvider);

  return invite;
}

// Generate unique invitation code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 8;
  let code = '';
  for (let i = 0; i < codeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Initialize mock data for testing
export function initializeMockData() {
  const provider = loadProviderData();
  if (!provider) {
    const mockProvider: Provider = {
      id: '1',
      name: 'Dr. Sarah Chen',
      title: 'Primary Care Physician',
      specialties: ['Internal Medicine', 'Preventive Care'],
      npi: '1234567890',
      email: 'dr.chen@example.com',
      phone: '(555) 123-4567',
      photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300',
      facility: {
        name: 'HealthCare Medical Center',
        address: '123 Medical Dr, Healthcare City, HC 12345',
        phone: '(555) 987-6543'
      },
      patients: [
        {
          id: '1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          phone: '(555) 234-5678',
          dateOfBirth: '1985-06-15',
          connectionDate: '2023-01-15',
          status: 'active',
          conditions: ['Hypertension', 'Type 2 Diabetes'],
          medications: [
            {
              id: '1',
              name: 'Metformin',
              dosage: '500mg',
              frequency: 'Twice daily',
              startDate: '2023-01-20',
              prescribedBy: 'Dr. Sarah Chen',
              status: 'active'
            }
          ],
          notes: [
            {
              id: '1',
              date: '2024-03-15',
              type: 'visit',
              content: 'Initial consultation. Patient reports good medication adherence.',
              provider: 'Dr. Sarah Chen',
              private: false
            }
          ],
          protocols: [
            {
              id: '1',
              title: 'Diabetes Management Protocol',
              description: 'Comprehensive protocol for managing Type 2 Diabetes including lifestyle modifications, medication adherence, and regular monitoring.',
              startDate: '2024-03-15',
              type: 'treatment',
              status: 'active',
              provider: 'Dr. Sarah Chen',
              tasks: [
                {
                  id: '1',
                  title: 'Blood Sugar Monitoring',
                  description: 'Check blood sugar levels twice daily: before breakfast and 2 hours after dinner',
                  frequency: 'daily',
                  status: 'in_progress'
                },
                {
                  id: '2',
                  title: 'Exercise Routine',
                  description: '30 minutes of moderate exercise (walking, swimming, or cycling)',
                  frequency: 'daily',
                  status: 'pending'
                },
                {
                  id: '3',
                  title: 'Medication Schedule',
                  description: 'Take Metformin 500mg with breakfast and dinner',
                  frequency: 'daily',
                  status: 'in_progress'
                },
                {
                  id: '4',
                  title: 'Diet Tracking',
                  description: 'Log all meals and snacks, focusing on carbohydrate intake',
                  frequency: 'daily',
                  status: 'pending'
                },
                {
                  id: '5',
                  title: 'Weekly Weight Check',
                  description: 'Record weight every Monday morning',
                  frequency: 'weekly',
                  status: 'pending'
                }
              ],
              notes: 'Patient is motivated to improve their diabetes management. Focus on gradual lifestyle changes and consistent monitoring.',
              attachments: [
                {
                  name: 'Diabetes Management Guide.pdf',
                  url: '#',
                  type: 'application/pdf'
                },
                {
                  name: 'Healthy Meal Planning.pdf',
                  url: '#',
                  type: 'application/pdf'
                }
              ]
            },
            {
              id: '2',
              title: 'Blood Pressure Management',
              description: 'Protocol for monitoring and controlling hypertension through lifestyle modifications and medication.',
              startDate: '2024-02-01',
              endDate: '2024-03-01',
              type: 'treatment',
              status: 'completed',
              provider: 'Dr. Sarah Chen',
              tasks: [
                {
                  id: '1',
                  title: 'Blood Pressure Readings',
                  description: 'Take blood pressure readings twice daily',
                  frequency: 'daily',
                  status: 'completed'
                },
                {
                  id: '2',
                  title: 'Sodium Intake Tracking',
                  description: 'Monitor daily sodium intake, aiming for less than 2,000mg',
                  frequency: 'daily',
                  status: 'completed'
                }
              ],
              notes: 'Patient successfully completed the initial blood pressure monitoring protocol. Blood pressure has stabilized within target range.'
            }
          ],
          lastVisit: '2024-02-15',
          nextAppointment: '2024-04-15',
          recentLabs: {
            date: '2024-02-15',
            type: 'Comprehensive Metabolic Panel',
            status: 'abnormal'
          }
        }
      ],
      pendingInvites: []
    };

    saveProviderData(mockProvider);
  } else {
    // Ensure all existing patients have a protocols array
    const updatedProvider = {
      ...provider,
      patients: provider.patients.map(patient => ({
        ...patient,
        protocols: patient.protocols || []
      }))
    };
    saveProviderData(updatedProvider);
  }
}

// Get patient alerts
export function getPatientAlerts(providerId: string): PatientAlert[] {
  const provider = loadProviderData();
  if (!provider) return [];

  const alerts: PatientAlert[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Check each patient for potential alerts
  provider.patients.forEach(patient => {
    // 1. Lab Results Alerts
    if (patient.recentLabs?.status === 'abnormal') {
      alerts.push({
        id: `lab-${patient.id}`,
        patientId: patient.id,
        patientName: patient.name,
        type: 'lab',
        severity: 'high',
        message: `Abnormal lab results: ${patient.recentLabs.type}`,
        date: patient.recentLabs.date
      });
    }

    // 2. Wellness Trend Alerts
    const checkIns = JSON.parse(localStorage.getItem(`checkIns_${patient.id}`) || '[]');
    const recentCheckIns = checkIns.slice(-7); // Last 7 days

    if (recentCheckIns.length > 0) {
      // Check for concerning mood patterns
      const lowMoodDays = recentCheckIns.filter((ci: any) => {
        const moodScores: Record<string, number> = {
          '😊': 5, '🙂': 4, '😐': 3, '😕': 2
        };
        return moodScores[ci.mood] <= 2;
      }).length;

      if (lowMoodDays >= 3) {
        alerts.push({
          id: `mood-${patient.id}`,
          patientId: patient.id,
          patientName: patient.name,
          type: 'wellness',
          severity: 'high',
          message: 'Showing signs of persistent low mood',
          date: today
        });
      }

      // Check for poor sleep patterns
      const poorSleepDays = recentCheckIns.filter((ci: any) => ci.sleep <= 2).length;
      if (poorSleepDays >= 3) {
        alerts.push({
          id: `sleep-${patient.id}`,
          patientId: patient.id,
          patientName: patient.name,
          type: 'wellness',
          severity: 'medium',
          message: 'Reporting consistently poor sleep quality',
          date: today
        });
      }

      // Check for high stress levels
      const highStressDays = recentCheckIns.filter((ci: any) => ci.stress >= 4).length;
      if (highStressDays >= 3) {
        alerts.push({
          id: `stress-${patient.id}`,
          patientId: patient.id,
          patientName: patient.name,
          type: 'wellness',
          severity: 'medium',
          message: 'Experiencing elevated stress levels',
          date: today
        });
      }
    }

    // 3. Protocol Compliance Alerts
    const activeProtocol = patient.protocols?.find(p => p.status === 'active');
    if (activeProtocol) {
      const incompleteTasks = activeProtocol.tasks.filter(task => {
        if (task.frequency === 'daily') {
          // Check if task was completed today
          return !task.completedDate || !task.completedDate.includes(today);
        }
        return task.status === 'pending';
      });

      if (incompleteTasks.length > 0) {
        alerts.push({
          id: `protocol-${patient.id}`,
          patientId: patient.id,
          patientName: patient.name,
          type: 'protocol',
          severity: 'medium',
          message: `${incompleteTasks.length} incomplete protocol tasks`,
          date: today
        });
      }
    }

    // 4. Check-in Consistency Alerts
    const lastCheckIn = checkIns[checkIns.length - 1];
    const daysSinceLastCheckIn = lastCheckIn
      ? Math.floor((new Date().getTime() - new Date(lastCheckIn.date).getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    if (daysSinceLastCheckIn >= 3) {
      alerts.push({
        id: `checkin-${patient.id}`,
        patientId: patient.id,
        patientName: patient.name,
        type: 'wellness',
        severity: daysSinceLastCheckIn >= 5 ? 'high' : 'medium',
        message: `No check-ins for ${daysSinceLastCheckIn} days`,
        date: today
      });
    }
  });

  // Sort alerts by severity and date
  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

// Get patients needing attention
export function getPatientsNeedingAttention(providerId: string): Patient[] {
  const provider = loadProviderData();
  if (!provider) return [];

  return provider.patients.filter(patient => {
    // Check for abnormal labs
    if (patient.recentLabs?.status === 'abnormal') return true;

    // Check for missed check-ins
    const checkIns = JSON.parse(localStorage.getItem(`checkIns_${patient.id}`) || '[]');
    if (checkIns.length === 0) return true;

    // Check for concerning wellness trends
    const recentCheckIns = checkIns.slice(-7);
    if (recentCheckIns.some((ci: any) => ci.stress >= 4 || ci.sleep <= 2)) return true;

    return false;
  });
}

// Calculate population metrics
export function calculatePopulationMetrics(patients: Patient[]): WellnessMetric[] {
  const metrics: WellnessMetric[] = [];
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Track overall metrics
  let totalCheckIns = 0;
  let totalPatients = patients.length;
  let patientsWithCheckIns = 0;
  let totalMoodScore = 0;
  let totalSleepScore = 0;
  let totalStressScore = 0;
  let totalEnergyScore = 0;

  // Track protocol compliance
  let totalProtocolTasks = 0;
  let completedProtocolTasks = 0;

  patients.forEach(patient => {
    // Get check-ins for last 30 days
    const checkIns = JSON.parse(localStorage.getItem(`checkIns_${patient.id}`) || '[]');
    const recentCheckIns = checkIns.filter((ci: any) => 
      new Date(ci.date) >= thirtyDaysAgo
    );

    if (recentCheckIns.length > 0) {
      patientsWithCheckIns++;
      totalCheckIns += recentCheckIns.length;

      // Calculate wellness scores
      recentCheckIns.forEach((ci: any) => {
        // Convert mood emoji to score
        const moodMap: Record<string, number> = {
          '😊': 5, '🙂': 4, '😐': 3, '😕': 2
        };
        totalMoodScore += moodMap[ci.mood] || 3;
        totalSleepScore += ci.sleep || 0;
        totalStressScore += ci.stress || 0;
        totalEnergyScore += ci.energy || 0;
      });
    }

    // Calculate protocol compliance
    const activeProtocol = patient.protocols?.find(p => p.status === 'active');
    if (activeProtocol) {
      activeProtocol.tasks.forEach(task => {
        totalProtocolTasks++;
        if (task.status === 'completed') {
          completedProtocolTasks++;
        }
      });
    }
  });

  // Calculate averages
  const avgCheckInsPerPatient = totalCheckIns / patientsWithCheckIns || 0;
  const avgMoodScore = totalMoodScore / totalCheckIns || 0;
  const avgSleepScore = totalSleepScore / totalCheckIns || 0;
  const avgStressScore = totalStressScore / totalCheckIns || 0;
  const avgEnergyScore = totalEnergyScore / totalCheckIns || 0;
  const protocolComplianceRate = (completedProtocolTasks / totalProtocolTasks) * 100 || 0;

  // Add engagement metric
  metrics.push({
    id: 'engagement',
    patientName: 'All Patients',
    metric: 'Patient Engagement',
    value: `${Math.round((patientsWithCheckIns / totalPatients) * 100)}`,
    unit: '%',
    trend: patientsWithCheckIns > totalPatients / 2 ? 'up' : 'down',
    change: `${Math.round(avgCheckInsPerPatient * 100) / 100} check-ins/patient`
  });

  // Add mood metric
  metrics.push({
    id: 'mood',
    patientName: 'All Patients',
    metric: 'Average Mood Score',
    value: avgMoodScore.toFixed(1),
    unit: '/5',
    trend: avgMoodScore >= 3.5 ? 'up' : 'down',
    change: `${Math.round(((avgMoodScore - 3) / 3) * 100)}%`
  });

  // Add sleep quality metric
  metrics.push({
    id: 'sleep',
    patientName: 'All Patients',
    metric: 'Sleep Quality',
    value: avgSleepScore.toFixed(1),
    unit: '/5',
    trend: avgSleepScore >= 3.5 ? 'up' : 'down',
    change: `${Math.round(((avgSleepScore - 3) / 3) * 100)}%`
  });

  // Add stress level metric
  metrics.push({
    id: 'stress',
    patientName: 'All Patients',
    metric: 'Stress Management',
    value: (5 - avgStressScore).toFixed(1), // Invert stress score (lower is better)
    unit: '/5',
    trend: avgStressScore <= 2.5 ? 'up' : 'down',
    change: `${Math.round(((3 - avgStressScore) / 3) * 100)}%`
  });

  // Add protocol compliance metric
  metrics.push({
    id: 'compliance',
    patientName: 'All Patients',
    metric: 'Protocol Compliance',
    value: protocolComplianceRate.toFixed(1),
    unit: '%',
    trend: protocolComplianceRate >= 75 ? 'up' : 'down',
    change: `${completedProtocolTasks}/${totalProtocolTasks} tasks`
  });

  // Calculate risk scores
  patients.forEach(patient => {
    const checkIns = JSON.parse(localStorage.getItem(`checkIns_${patient.id}`) || '[]');
    const recentCheckIns = checkIns.slice(-7); // Last 7 days

    if (recentCheckIns.length > 0) {
      let riskScore = 0;
      
      // Factor 1: Mood trends
      const lowMoodDays = recentCheckIns.filter((ci: any) => {
        const moodMap: Record<string, number> = { '😊': 5, '🙂': 4, '😐': 3, '😕': 2 };
        return moodMap[ci.mood] <= 2;
      }).length;
      riskScore += (lowMoodDays / recentCheckIns.length) * 40; // 40% weight

      // Factor 2: Sleep quality
      const poorSleepDays = recentCheckIns.filter((ci: any) => ci.sleep <= 2).length;
      riskScore += (poorSleepDays / recentCheckIns.length) * 30; // 30% weight

      // Factor 3: Stress levels
      const highStressDays = recentCheckIns.filter((ci: any) => ci.stress >= 4).length;
      riskScore += (highStressDays / recentCheckIns.length) * 30; // 30% weight

      if (riskScore >= 70) { // High risk threshold
        metrics.push({
          id: `risk-${patient.id}`,
          patientName: patient.name,
          metric: 'Risk Score',
          value: riskScore.toFixed(0),
          unit: '%',
          trend: 'down',
          change: 'Needs attention'
        });
      }
    }
  });

  return metrics.sort((a, b) => {
    // Sort by metric type first (risk scores at top)
    if (a.metric === 'Risk Score' && b.metric !== 'Risk Score') return -1;
    if (a.metric !== 'Risk Score' && b.metric === 'Risk Score') return 1;
    
    // Then sort by value
    return parseFloat(b.value) - parseFloat(a.value);
  });
}

// Get today's appointments
export function getTodayAppointments(providerId: string): Appointment[] {
  const today = new Date().toISOString().split('T')[0];
  const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
  return appointments.filter((apt: Appointment) => 
    apt.providerId === providerId && apt.date === today
  ).sort((a: Appointment, b: Appointment) => a.time.localeCompare(b.time));
}

// Get unread messages count
export function getUnreadMessagesCount(providerId: string): number {
  const messages = JSON.parse(localStorage.getItem('messages') || '[]');
  return messages.filter((msg: Message) => 
    msg.receiverId === providerId && !msg.read
  ).length;
}