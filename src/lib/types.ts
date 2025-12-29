
import { Timestamp } from "firebase/firestore";

export type WithId<T> = T & { id: string };

export type User = {
  id: string;
  name: string;
  email: string;
  onboardingCompleted?: boolean;
  whatsappApiToken?: string;
  plan?: string;
  credits?: {
    remaining: number;
  };
  clinicName?: string;
  address?: string;
  cnpj?: string;
  contactEmail?: string;
  dpoContact?: string;
  allowConsentExport?: boolean;
  retentionPeriod?: number;
}

export type Clinic = {
    id: string;
    isTwilioConnected: boolean;
    twilioSubaccountSid: string;
    wabaId: string; // WhatsApp Business Account ID
    plan?: 'Essencial' | 'Profissional' | 'Premium' | 'Trial'; // O plano de assinatura atual da clínica
    monthlyUsage?: number; // O número de conversas usadas no ciclo de faturamento atual
}

export type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastAppointment?: Timestamp;
  nextAppointment?: Timestamp;
  status: "Ativo" | "Inativo";
  avatarUrl?: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  userId: string;
  dateTime: Timestamp;
  notes: string;
  patientName?: string; 
  type?: string; 
};

export type ConsentLog = {
  id: string;
  patientId: string;
  patientName: string;
  consentGiven: boolean;
  consentAt: string;
  consentMethod: string;
  consentMeta: Record<string, any>;
};

export type OutboxMessage = {
  id: string;
  patient: string;
  patientId: string;
  template: string;
  scheduledAt: string;
  status: "Agendado" | "Enviado" | "Falhou";
  workflow: string;
};

export type Template = {
  // id não é parte do documento no firestore, WithId o adiciona
  title: string;
  body: string;
  variables?: string[];
  attachment?: {
    name: string;
    url: string;
  } | null;
  isDefault?: boolean;
};

// Definindo os dois tipos de agendamento possíveis
export type RelativeSchedule = {
  triggerType: 'relative';
  quantity: number;
  unit: 'hours' | 'days' | 'weeks' | 'months';
  event: 'before' | 'after';
};

export type SpecificSchedule = {
  triggerType: 'specific';
  dateTime: Timestamp;
};

// O Schedule agora pode ser um dos dois tipos
export type Schedule = RelativeSchedule | SpecificSchedule;

export type WorkflowStep = {
  id: string;
  template: string;
  schedule: Schedule;
}

// Tipo parcial para o formulário, para acomodar a montagem incremental
export type PartialWorkflowStep = Omit<Partial<WorkflowStep>, 'schedule'> & {
  schedule?: Partial<Schedule>;
};

export type Workflow = {
  id: string;
  title: string;
  target: string;
  active: boolean;
  steps: WorkflowStep[];
  patients: string[];
};

export type ScheduledMessage = {
  id: string;
  userId: string;
  patientId: string;
  templateId: string;
  workflowId?: string;
  appointmentId?: string;
  scheduledTime: Timestamp;
  status: 'Agendado' | 'Enviado' | 'Falhou' | 'Cancelado';
};
