"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X } from "lucide-react"

type TourStep = {
  selector: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'navigate';
  path?: string;
};

const tourSteps: TourStep[] = [
  {
    selector: '[data-tour-id="settings-nav"]',
    title: 'Passo 1: Configurações',
    content: 'Vamos começar configurando sua conta. Clique aqui para ir para as Configurações.',
    position: 'right',
    action: 'navigate',
    path: '/settings',
  },
  {
    selector: '[data-tour-id="whatsapp-tab"]',
    title: 'Passo 2: Conectar WhatsApp',
    content: 'Agora, vá para a aba de integração com o WhatsApp.',
    position: 'bottom',
    action: 'click',
  },
  {
    selector: '[data-tour-id="connect-whatsapp-button"]',
    title: 'Passo 3: Ativar a Conexão',
    content: 'Clique neste botão para simular a conexão com a API do WhatsApp. No produto real, isso abriria uma nova janela de autenticação.',
    position: 'bottom',
    action: 'click',
  },
  {
    selector: '[data-tour-id="dashboard-nav"]',
    title: 'Passo 4: Dashboard',
    content: 'Ótimo! Agora vamos voltar ao Dashboard para explorar as outras funcionalidades.',
    position: 'right',
    action: 'navigate',
    path: '/dashboard',
  },
  {
    selector: '[data-tour-id="patients-nav"]',
    title: 'Passo 5: Pacientes',
    content: 'Aqui você gerencia todos os seus pacientes. Clique para ver a lista.',
    position: 'right',
    action: 'navigate',
    path: '/patients',
  },
  {
    selector: '[data-tour-id="templates-nav"]',
    title: 'Passo 6: Templates',
    content: 'Nesta seção, você cria e gerencia seus modelos de mensagem.',
    position: 'right',
    action: 'navigate',
    path: '/templates',
  },
    {
    selector: '[data-tour-id="workflows-nav"]',
    title: 'Passo 7: Fluxos',
    content: 'Crie automações para enviar mensagens baseadas em gatilhos, como datas de consulta.',
    position: 'right',
    action: 'navigate',
    path: '/workflows',
  },
  {
    selector: '[data-tour-id="outbox-nav"]',
    title: 'Passo 8: Caixa de Saída',
    content: 'Acompanhe o status de todas as mensagens agendadas e enviadas por aqui.',
    position: 'right',
    action: 'navigate',
    path: '/outbox',
  },
];


export function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isActionDone, setIsActionDone] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const currentStep = tourSteps[stepIndex];

  const updateTargetRect = () => {
    if (currentStep) {
        const element = document.querySelector(currentStep.selector);
        if (element) {
            setTargetRect(element.getBoundingClientRect());
        } else {
            setTargetRect(null); 
        }
    }
  };

  useEffect(() => {
    if (!currentStep) return;
  
    // Define se a ação do passo atual já foi concluída.
    // Para passos de navegação, a ação é considerada "concluída" se já estivermos no caminho certo.
    // Para passos de clique, a ação começa como "não concluída".
    const isNavigationStep = currentStep.action === 'navigate';
    setIsActionDone(isNavigationStep ? pathname === currentStep.path : false);

    const setupStep = () => {
        const element = document.querySelector(currentStep.selector);
        if (element) {
            updateTargetRect();
            
            // Adiciona o listener para a ação necessária
            const actionHandler = () => {
                setIsActionDone(true); // Libera o botão "Próximo"
            };

            if (currentStep.action === 'click') {
                 element.addEventListener('click', actionHandler, { once: true });
                 return () => element.removeEventListener('click', actionHandler);
            }
            if (currentStep.action === 'navigate') {
                const navigationHandler = (e: Event) => {
                    // Previne a navegação padrão para controlar via router
                    e.preventDefault();
                    if (currentStep.path) {
                        router.push(currentStep.path);
                    }
                    actionHandler();
                };
                element.addEventListener('click', navigationHandler, { once: true });
                return () => element.removeEventListener('click', navigationHandler);
            }
        }
    };
    
    // Pequeno atraso para garantir que a página tenha sido renderizada após a navegação
    const timer = setTimeout(setupStep, 100);

    const observer = new MutationObserver(setupStep);
    observer.observe(document.body, { childList: true, subtree: true });
    
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);

    return () => {
        clearTimeout(timer);
        observer.disconnect();
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect);
    };
  }, [stepIndex, pathname, currentStep]);


  const handleNext = () => {
    if (!currentStep) return;
    
    const nextStepIndex = stepIndex + 1;
    if (nextStepIndex >= tourSteps.length) {
        onComplete();
        return;
    }

    const nextStep = tourSteps[nextStepIndex];
    
    // Se o próximo passo for em outra página, navega para lá.
    // A lógica no useEffect vai cuidar de encontrar o elemento na nova página.
    if (nextStep.path && pathname !== nextStep.path) {
        router.push(nextStep.path);
    }

    setStepIndex(nextStepIndex);
  };

  if (!currentStep || !targetRect) {
    return null;
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    clipPath: `path('M0,0H${window.innerWidth}V${window.innerHeight}H0V0 Z M${targetRect.left - 4},${targetRect.top - 4}V${targetRect.bottom + 4}H${targetRect.right + 4}V${targetRect.top - 4}H${targetRect.left - 4} Z')`
  };
  
  const getPopupPosition = () => {
    const popupWidth = 250;
    const popupHeight = 150; // Approximate height
    const offset = 10;
    
    const { innerWidth: vw, innerHeight: vh } = window;
    
    let top = 0, left = 0;

    switch (currentStep.position) {
      case 'right':
        left = targetRect.right + offset;
        top = targetRect.top;
        if (left + popupWidth > vw) {
            left = targetRect.left - popupWidth - offset;
        }
        break;
      case 'left':
        left = targetRect.left - popupWidth - offset;
        top = targetRect.top;
        if (left < 0) {
            left = targetRect.right + offset;
        }
        break;
      case 'bottom':
        top = targetRect.bottom + offset;
        left = targetRect.left;
        if (top + popupHeight > vh) {
            top = targetRect.top - popupHeight - offset;
        }
        break;
      case 'top':
        top = targetRect.top - popupHeight - offset;
        left = targetRect.left;
        if (top < 0) {
            top = targetRect.bottom + offset;
        }
        break;
    }

    // Final boundary checks to clamp position
    if (left < offset) left = offset;
    if (top < offset) top = offset;
    if (left + popupWidth > vw - offset) left = vw - popupWidth - offset;
    if (top + popupHeight > vh - offset) top = vh - popupHeight - offset;
    
    // Specific adjustment for the first step
    if (stepIndex === 0) {
        top -= 15;
    }


    const style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 1001,
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '0.5rem',
        width: `${popupWidth}px`,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: '#333',
        top: `${top}px`,
        left: `${left}px`,
    };
    return style;
  }

  return (
    <>
      <div style={overlayStyle}></div>
      <div style={getPopupPosition()} className="relative">
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-6 w-6"
            onClick={onComplete}
        >
            <X className="h-4 w-4" />
        </Button>
        <h4 className="font-bold mb-2 pr-6">{currentStep.title}</h4>
        <p className="text-sm mb-4">{currentStep.content}</p>
        <Button onClick={handleNext} disabled={!isActionDone} className="w-full">
          {stepIndex === tourSteps.length - 1 ? 'Concluir' : 'Próximo'}
        </Button>
      </div>
    </>
  );
}
