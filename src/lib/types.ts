import { Timestamp } from "firebase/firestore";

export type User = {
  id: string;
  name: string;
  email: string;
  onboardingCompleted?: boolean;
  whatsappApiToken?: string;
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
  patientName?: string; // Not in Firestore, might be added for UI
  type?: string; // Not in Firestore, might be added for UI
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
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
};

export type WorkflowStep = {
  id: string;
  template: string;
  schedule: {
    quantity: number;
    unit: 'hours' | 'days' | 'weeks' | 'months';
    event: 'before' | 'after';
  }
}

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
