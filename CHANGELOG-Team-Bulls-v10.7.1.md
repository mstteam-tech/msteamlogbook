# Changelog — Team Bulls v10.7.1

## Correções

- A rolagem principal agora ocorre em um único contêiner `#app`, com gesto vertical de um dedo no celular.
- Removida a dependência da rolagem do `body`, que podia travar em PWAs/iOS após modais, teclado ou mudança de viewport.
- Scroll do mouse é encaminhado para o conteúdo principal no desktop, inclusive quando o ponteiro está sobre o menu lateral.
- Elementos com rolagem própria, como modais e listas, continuam rolando de forma independente.
- O arraste de ordenação continua restrito ao puxador; os cartões permanecem livres para rolagem vertical.
- Manifesto alterado para `portrait-primary`.
- Tentativa de bloqueio por `Screen Orientation API` em PWA/standalone.
- Barreira visual bloqueia o uso em paisagem quando o navegador não permite travar fisicamente a orientação.
- Service Worker e arquivos estáticos avançados para cache v10.7.1.

## Dados

Nenhuma coleção, regra Firebase, treino, dieta, sessão, foto ou check-in foi migrado ou apagado.
