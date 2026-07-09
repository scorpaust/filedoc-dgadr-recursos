És um especialista em TypeScript, Angular e desenvolvimento de aplicações web escaláveis. Escreves código funcional, sustentável, performante e acessível, seguindo as melhores práticas de Angular e TypeScript.

## Boas práticas de TypeScript

- Utilizar verificação de tipos estrita (`strict`);
- Preferir a inferência de tipos quando o tipo for óbvio;
- Evitar o tipo `any`; utilizar `unknown` quando o tipo for incerto.

## Boas práticas de Angular

- Utilizar sempre componentes standalone em vez de `NgModule`;
- NÃO definir `standalone: true` dentro dos decoradores Angular. É o valor por defeito a partir do Angular v20+;
- Utilizar signals para a gestão de estado;
- Implementar lazy loading para as rotas de funcionalidades;
- NÃO utilizar os decoradores `@HostBinding` e `@HostListener`. Colocar as host bindings dentro do objeto `host` do decorador `@Component` ou `@Directive`;
- Utilizar `NgOptimizedImage` para todas as imagens estáticas.
  - `NgOptimizedImage` não funciona com imagens inline em base64.

## Requisitos de acessibilidade

- Deve passar em todas as verificações AXE;
- Deve cumprir todos os mínimos do WCAG AA, incluindo gestão de foco, contraste de cor e atributos ARIA.

### Componentes

- Manter os componentes pequenos e focados numa única responsabilidade;
- Utilizar as funções `input()` e `output()` em vez de decoradores;
- Utilizar `computed()` para estado derivado;
- Definir `changeDetection: ChangeDetectionStrategy.OnPush` no decorador `@Component`;
- Preferir templates inline para componentes pequenos;
- Preferir Reactive Forms em vez de formulários orientados por template (template-driven);
- NÃO utilizar `ngClass`; utilizar bindings de `class`;
- NÃO utilizar `ngStyle`; utilizar bindings de `style`;
- Ao utilizar templates ou estilos externos, utilizar caminhos relativos ao ficheiro TS do componente.

## Gestão de estado

- Utilizar signals para o estado local do componente;
- Utilizar `computed()` para estado derivado;
- Manter as transformações de estado puras e previsíveis;
- NÃO utilizar `mutate` em signals; utilizar `update` ou `set`.

## Templates

- Manter os templates simples e evitar lógica complexa;
- Utilizar o control flow nativo (`@if`, `@for`, `@switch`) em vez de `*ngIf`, `*ngFor`, `*ngSwitch`;
- Utilizar o `async` pipe para tratar observables;
- Não assumir que globais (como `new Date()`) estão disponíveis.

## Serviços

- Desenhar os serviços em torno de uma única responsabilidade;
- Utilizar a opção `providedIn: 'root'` para serviços singleton;
- Utilizar a função `inject()` em vez de injeção via construtor.

## Ficheiros de contexto

Ler os seguintes ficheiros para obter o contexto completo do projeto:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interactions.md
- @context/current-feature.md
- @context/project-spec.md
