// Dados de demonstração — não representam respostas oficiais confirmadas pela DGADR.
import { Faq } from '../models';

export const faqs: readonly Faq[] = [
  {
    id: 'faq-1',
    question: 'Não consigo aceder ao Filedoc. O que devo verificar?',
    answer:
      'Confirme a ligação à rede institucional, as credenciais utilizadas e se a conta se encontra ativa. Caso o problema persista, registe um pedido de suporte na categoria "Acesso ou permissões".',
    category: 'Acesso e permissões',
    status: 'published',
    sortOrder: 1,
  },
  {
    id: 'faq-2',
    question: 'Como posso recuperar a palavra-passe?',
    answer:
      'Utilize a opção de alteração de palavra-passe disponível na aplicação. Se não conseguir iniciar sessão, contacte o suporte para confirmar a sua identidade.',
    category: 'Acesso e permissões',
    status: 'published',
    sortOrder: 2,
  },
  {
    id: 'faq-3',
    question: 'Um documento foi devolvido. Como devo proceder?',
    answer:
      'Consulte a nota de devolução, corrija os campos indicados e volte a submeter o documento.',
    category: 'Documentos e processos',
    status: 'published',
    sortOrder: 3,
  },
  {
    id: 'faq-4',
    question: 'Como posso localizar um processo antigo?',
    answer:
      'Utilize a pesquisa avançada no catálogo, filtrando por fluxo, tipo de documento ou período.',
    category: 'Documentos e processos',
    status: 'published',
    sortOrder: 4,
  },
  {
    id: 'faq-5',
    question:
      'Um procedimento não está descrito em nenhum guia. Onde posso confirmar o passo a seguir?',
    answer:
      'Esta situação ainda não tem um procedimento institucional confirmado nesta aplicação. Registe um pedido de suporte para que a equipa responsável possa esclarecer o caso.',
    category: 'Documentos e processos',
    status: 'draft',
    sortOrder: 5,
  },
  {
    id: 'faq-6',
    question: 'Quando devo abrir um pedido de suporte?',
    answer:
      'Sempre que não conseguir resolver a situação através dos guias, vídeos ou dicas disponíveis.',
    status: 'published',
    sortOrder: 6,
  },
];
