# Changelog — Team Bulls v10.7

## Continuidade e segurança de edição

- Rascunhos automáticos dos formulários abertos, sem armazenar senhas ou arquivos.
- Rascunho estrutural periódico do plano no aparelho.
- Pilhas de desfazer e refazer por treinador e aluno.
- Pontos de restauração locais e na coleção `planVersions`.
- Restauração de treinos e dietas mantendo intactos os documentos de sessões, check-ins e fotos.
- Versão atual guardada antes de restaurar outra versão ou aplicar um modelo.

## Modelos reutilizáveis

- Modelos completos de treino e dieta na coleção `planTemplates`.
- Criação de modelo a partir do arquivo aberto do aluno.
- Aplicação aditiva: o modelo recebe novos IDs e não substitui silenciosamente o plano existente.
- Dietas importadas entram desativadas para evitar troca acidental da dieta vigente.

## Convites de aluno

- O código fixo de cadastro deixou de ser aceito.
- Convites aleatórios de uso único, com validade configurável de 1 a 30 dias.
- O Firestore armazena somente o SHA-256 do convite; o código bruto aparece somente na criação.
- Consumo transacional: o perfil do aluno e a inutilização do convite são confirmados juntos.
- Convites podem ser revogados pelo treinador.

## Auditoria, avisos e adesão

- Log imutável de alterações do treinador em `auditLogs`.
- Avisos de atualização do plano e mensagens do treinador em `notifications`.
- Contador de avisos não lidos para o aluno.
- Aviso de check-in vencido/disponível integrado à central.
- Notificações do aparelho opcionais quando o navegador concede permissão e o aplicativo está aberto ou é consultado.
- Painel de adesão dos últimos 28 dias: sessões, dias de treino, marcações de refeições, progressão de carga, check-ins e fotos.

## Sincronização e App Check

- Central de sincronização com rede, modo de acesso, última gravação, espelho local, Service Worker, armazenamento e status do App Check.
- App Check preparado para `ReCaptchaEnterpriseProvider`, com fallback compatível.
- Chave pública isolada em `config_v10_7.js`.
- Nenhuma chave privada deve ser colocada no aplicativo.

## Arquitetura e testes

- Núcleo preservado em `app_v10_7_core.js`.
- Novas funções separadas em:
  - `modules/v107-core.js`
  - `modules/v107-invites.js`
  - `modules/v107-operations.js`
- Validador sem dependências em `testes/validar_v10_7.py`.
- Workflow do GitHub Actions em `.github/workflows/team-bulls-validate.yml`.
- Service Worker `sw_35.js` e manifesto `manifest_22.json`.
