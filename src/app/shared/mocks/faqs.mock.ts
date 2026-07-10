// Dados de demonstração — não representam respostas oficiais confirmadas pela DGADR.
import { Faq } from '../models';

export const faqs: readonly Faq[] = [
  {
    id: 'faq-1',
    question: 'Não consigo aceder ao Filedoc. O que devo verificar?',
    answer:
      'Confirme a ligação à rede institucional, as credenciais utilizadas e se a conta se encontra ativa. Caso o problema persista, registe um pedido de suporte na categoria "Acesso ou permissões".',
    status: 'published',
  },
  {
    id: 'faq-2',
    question: 'Um documento foi devolvido. Como devo proceder?',
    answer:
      'Consulte a nota de devolução, corrija os campos indicados e volte a submeter o documento.',
    status: 'published',
  },
  {
    id: 'faq-3',
    question: 'Como posso localizar um processo antigo?',
    answer:
      'Utilize a pesquisa avançada no catálogo, filtrando por fluxo, tipo de documento ou período.',
    status: 'published',
  },
  {
    id: 'faq-4',
    question: 'Quando devo abrir um pedido de suporte?',
    answer:
      'Sempre que não conseguir resolver a situação através dos guias, vídeos ou dicas disponíveis.',
    status: 'published',
  },
];
