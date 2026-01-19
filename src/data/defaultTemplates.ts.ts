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
      name: 'lembrete_consulta_24h',
      category: 'UTILITY',
      body: 'Olá, {{1}}! Passando para lembrar da sua consulta na {{2}}, agendada para amanhã, {{3}} às {{4}}. Podemos confirmar sua presença?',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica',
        '{{3}}': 'Data da Consulta',
        '{{4}}': 'Horário da Consulta'
      }
    },
    {
      name: 'lembrete_imediato_1h',
      category: 'UTILITY',
      body: 'Oi, {{1}}! Tudo pronto para te receber aqui na {{2}} às {{3}}. Estamos te aguardando! Até logo. ⏰',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica',
        '{{3}}': 'Horário da Consulta'
      }
    },
    {
      name: 'lembrete_padrao_24h',
      category: 'UTILITY',
      body: 'Olá, {{1}}! Passando para lembrar da sua consulta na {{2}} amanhã, dia {{3}}, às {{4}}. Te aguardamos lá!',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica',
        '{{3}}': 'Data da Consulta',
        '{{4}}': 'Horário da Consulta'
      }
    },
    {
      name: 'convite_retorno_preventivo',
      category: 'UTILITY',
      body: 'Olá, {{1}}! Já faz um tempo desde sua última visita à {{2}}. Vamos agendar seu check-up preventivo para manter sua saúde em dia? Responda para ver os horários disponíveis. ✨',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
  
    // --- GRUPO 2: RECORRÊNCIA E RETORNO ---
    {
      name: 'continuidade_tratamento',
      category: 'MARKETING',
      body: 'Oi, {{1}}. Para o sucesso do seu tratamento na {{2}}, precisamos realizar a próxima etapa. Vamos deixar agendado? Aguardo seu retorno!',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
    {
      name: 'convite_retorno_preventivo_6_meses',
      category: 'MARKETING',
      body: 'Olá, {{1}}! O tempo voa: já faz 6 meses da sua última visita à {{2}}. Vamos agendar sua limpeza preventiva para manter a saúde em dia? Responda para ver horários. ✨',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
  
    // --- GRUPO 3: PÓS-ATENDIMENTO ---
    {
      name: 'continuidade_tratamento',
      category: 'MARKETING',
      body: 'Oi, {{1}}. Para o sucesso do seu tratamento na {{2}}, precisamos realizar a próxima etapa. Vamos deixar agendado? Aguardo seu retorno!',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
    // Manter
    {
      name: 'convite_retorno_preventivo',
      category: 'MARKETING',
      body: 'Olá, {{1}}! Já faz um tempo desde sua última visita. Vamos agendar seu check-up preventivo para manter sua saúde em dia? Responda para ver os horários disponíveis. ✨',
      variables: {
        '{{1}}': 'Nome do Paciente'
      }
    },
    // Manter
    {
      name: 'continuidade_tratamento',
      category: 'MARKETING',
      body: 'Oi, {{1}}. Para o sucesso do seu tratamento na {{2}}, precisamos realizar a próxima etapa. Vamos deixar agendado? Aguardo seu retorno!',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },

    {
      name: 'pesquisa_satisfacao_nps',
      category: 'MARKETING',
      body: 'Olá, {{1}}. Gostaríamos muito de ouvir você! Em uma escala de 0 a 10, o quanto você recomendaria a {{2}} a um amigo? Sua opinião nos ajuda a melhorar. 💬',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
    {
      name: 'cuidados_pos_procedimento',
      category: 'UTILITY',
      body: 'Oi, {{1}}. Esperamos que esteja bem após o procedimento na {{2}}. Lembre-se de seguir as orientações e descansar. Qualquer desconforto ou dúvida, nos chame aqui! 🩺',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
    {
      name: 'instrucao_pos_procedimento',
      category: 'UTILITY',
      body: 'Olá, {{1}}. Como está a recuperação? Lembre-se das orientações que te passamos: repouso e medicação nos horários certos. Qualquer desconforto, nos chame aqui! 💙',
      variables: {
        '{{1}}': 'Nome do Paciente'
      }
    },
    {
      name: 'pesquisa_nps_simples',
      category: 'MARKETING',
      body: 'Oi, {{1}}! Queremos ser cada vez melhores. De 0 a 10, o quanto você recomendaria a {{2}} para um amigo? Sua opinião é muito importante pra nós! 💬',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    },
    {
      name: 'resgate_orcamento_pendente',
      category: 'MARKETING',
      body: 'Olá, {{1}}. Ficou com alguma dúvida sobre o seu plano de tratamento na {{2}}? Estou à disposição para explicar detalhes ou ver uma condição especial para você. Vamos conversar?',
      variables: {
        '{{1}}': 'Nome do Paciente',
        '{{2}}': 'Nome da Clínica'
      }
    }
  ];