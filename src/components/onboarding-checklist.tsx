'use client'

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, ChevronDown, Rocket, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { type User } from "@/lib/types";

type ChecklistStep = {
  id: string;
  text: string;
  isCompleted: (pathname: string, userData: User | null) => boolean;
};

const checklistSections = {
  connection: [
    {
      id: 'visited-settings',
      text: 'Acesse a página de Configurações.',
      isCompleted: (pathname) => pathname.startsWith('/settings'),
    },
    {
      id: 'visited-whatsapp-tab',
      text: 'Abra a aba \'WhatsApp Web\'.',
      isCompleted: (pathname) => pathname === '/settings#whatsapp',
    },
    {
      id: 'connected-whatsapp',
      text: 'Gere o QR Code e conecte seu celular.',
      isCompleted: (pathname, userData) => (userData as any)?.isWhatsappConnected === true,
    },
  ] as ChecklistStep[],
  interface: [
    {
      id: 'visited-dashboard',
      text: 'Dashboard: Sua central de comandos.',
      isCompleted: (pathname) => pathname === '/dashboard',
    },
    {
      id: 'visited-patients',
      text: 'Pacientes: Gerencie seus contatos.',
      isCompleted: (pathname) => pathname === '/patients',
    },
    {
      id: 'visited-templates',
      text: 'Templates: Crie modelos de mensagem.',
      isCompleted: (pathname) => pathname === '/templates',
    },
    {
      id: 'visited-workflows',
      text: 'Fluxos: Automatize o envio de mensagens.',
      isCompleted: (pathname) => pathname === '/workflows',
    },
    {
      id: 'visited-outbox',
      text: 'Caixa de Saída: Acompanhe os envios.',
      isCompleted: (pathname) => pathname === '/outbox',
    },
  ] as ChecklistStep[],
};

interface OnboardingChecklistProps {
  userData: User | null;
  userDocRef: any; // Firebase Doc Ref
  onClose: () => void;
}

export function OnboardingChecklist({ userData, userDocRef, onClose }: OnboardingChecklistProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>((userData as any)?.onboardingProgress || []);
  const pathname = usePathname();
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const currentPath = `${pathname}${hash}`;

  // Sincroniza o estado do Firestore para o estado local quando os dados do usuário mudam
  useEffect(() => {
    const firestoreProgress = (userData as any)?.onboardingProgress || [];
    // Apenas atualiza se for diferente para evitar loops
    if (JSON.stringify(firestoreProgress) !== JSON.stringify(completedSteps)) {
      setCompletedSteps(firestoreProgress);
    }
  }, [userData, completedSteps]);

  // Efeito que verifica a conclusão dos passos na navegação
  useEffect(() => {
    const allSteps = [...checklistSections.connection, ...checklistSections.interface];
    
    allSteps.forEach(step => {
      // Se o passo foi concluído E ainda não está na lista de passos completos
      if (step.isCompleted(currentPath, userData) && !completedSteps.includes(step.id)) {
        
        // Atualiza o estado local IMEDIATAMENTE para a UI responder
        const updatedSteps = [...completedSteps, step.id];
        setCompletedSteps(updatedSteps);
        
        // Envia a atualização para o Firestore em segundo plano
        if (userDocRef) {
          setDocumentNonBlocking(userDocRef, { onboardingProgress: updatedSteps }, { merge: true });
        }
      }
    });
  // Otimização: A dependência de `completedSteps` é necessária para garantir que a verificação `!includes` usa o estado mais recente.
  }, [currentPath, userData, userDocRef, completedSteps]);

  const allSteps = [...checklistSections.connection, ...checklistSections.interface];
  const progress = (completedSteps.length / allSteps.length) * 100;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="secondary" size="icon" className="rounded-full h-14 w-14 shadow-lg" onClick={() => setIsMinimized(false)}>
          <Rocket className="h-7 w-7" />
        </Button>
      </div>
    );
  }

  const StepItem = ({ step }: { step: ChecklistStep }) => {
    const isCompleted = completedSteps.includes(step.id);
    return (
      <li className="flex items-center gap-3 text-sm">
        {isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-300" />}
        <span className={cn(isCompleted && 'line-through text-muted-foreground')}>{step.text}</span>
      </li>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Guia de Início Rápido</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}><ChevronDown className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Complete os passos para começar.</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-xs text-right mt-1 text-muted-foreground">{completedSteps.length} de {allSteps.length} completos</p>
          </div>

          <div>
            <h4 className="font-semibold text-md mb-2">Conexão</h4>
            <ul className="space-y-2">
              {checklistSections.connection.map(step => <StepItem key={step.id} step={step} />)}
            </ul>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold text-md mb-2">Explorando a Interface</h4>
            <ul className="space-y-2">
              {checklistSections.interface.map(step => <StepItem key={step.id} step={step} />)}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
