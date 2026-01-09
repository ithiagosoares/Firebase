// src/data/defaultTemplates.ts

// Interface auxiliar apenas para este arquivo
export interface WhatsAppTemplate {
    name: string; // Nome interno (snake_case)
    category: 'UTILITY' | 'MARKETING'; 
    body: string; 
    variables: Record<string, string>; // Mapeamento das variáveis
  }
  
  export const defaultTemplates: WhatsAppTemplate[] = [
    // --- GRUPO 1: GESTÃO DE AGENDA ---
    {
      name: 'lembrete_confirmacao_24h',
      category: 'UTILITY',
      body: 'Olá, {{1}}. Tudo bem? Passando para lembrar da sua consulta amanhã, dia *{{2}}* às *{{3}}*. Podemos confirmar sua presença?',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Data da Consulta',
        '{{3}}': 'Horário da Consulta'
      }
    },
    {
      name: 'aviso_aguardando_1h',
      category: 'UTILITY',
      body: 'Oi, {{1}}. Tudo pronto para te receber aqui na clínica! Seu horário é daqui a pouco, às *{{2}}*. Estamos te esperando!',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Horário da Consulta'
      }
    },
    {
      name: 'reagendamento_clinica',
      category: 'UTILITY',
      body: 'Olá, {{1}}. Devido a um imprevisto na clínica, precisaremos reagendar sua consulta de *{{2}}*. Pedimos desculpas! Qual o melhor horário para remarcarmos?',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Data Original'
      }
    },
    {
      name: 'aviso_no_show',
      category: 'UTILITY',
      body: 'Oi, {{1}}. Sentimos sua falta hoje na consulta das *{{2}}*. Aconteceu algum imprevisto? Vamos reagendar para garantir seu tratamento?',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Horário Agendado'
      }
    },
  
    // --- GRUPO 2: RECORRÊNCIA E RETORNO ---
    {
      name: 'retorno_preventivo_6m',
      category: 'MARKETING',
      body: 'Olá, {{1}}. Já faz 6 meses desde sua última limpeza/check-up. A prevenção é o melhor caminho para um sorriso saudável! Vamos agendar seu retorno?',
      variables: {
        '{{1}}': 'Nome do Paciente'
      }
    },
    {
      name: 'continuidade_tratamento',
      category: 'MARKETING',
      body: 'Olá, {{1}}. Para o sucesso do seu tratamento, é importante realizarmos a próxima etapa. Temos horários livres esta semana. Podemos agendar?',
      variables: {
        '{{1}}': 'Nome do Paciente'
      }
    },
  
    // --- GRUPO 3: PÓS-ATENDIMENTO ---
    {
      name: 'pos_operatorio_cuidados',
      category: 'UTILITY',
      body: 'Oi, {{1}}. Como você está se sentindo após o procedimento? Lembre-se de seguir as orientações e descansar. Qualquer desconforto, nos avise!',
      variables: {
        '{{1}}': 'Nome do Paciente'
      }
    },
    {
      name: 'pesquisa_satisfacao_nps',
      category: 'MARKETING',
      body: 'Oi, {{1}}. Gostaríamos muito de ouvir você! Em uma escala de 0 a 10, o quanto você recomendaria nossa clínica para um amigo? Sua opinião é vital para nós.',
      variables: {
        '{{1}}': 'Nome do Paciente'
      }
    },
  
    // --- GRUPO 4: COMERCIAL ---
    {
      name: 'resgate_orcamento_pendente',
      category: 'MARKETING',
      body: 'Olá, {{1}}. Ficou com alguma dúvida sobre o seu plano de tratamento na {{2}}? Estou à disposição para explicar detalhes ou ver uma condição especial para você. Vamos conversar?',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
    {
      name: 'retomada_orcamento',
      category: 'MARKETING',
      body: 'Olá, {{1}}. Ainda pensando no seu novo sorriso? Ficou alguma dúvida sobre o orçamento da {{2}} ou formas de pagamento? Estou à disposição para ajudar você a decidir. Vamos conversar?',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
    {
      name: 'campanha_sazonal_oferta',
      category: 'MARKETING',
      body: 'Novidade, {{1}}! 📢 Chegou a campanha {{2}} na nossa clínica. Preparamos uma condição especial para você realizar esse tratamento agora. Quer saber mais detalhes?',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Campanha'
      }
    }
  ];