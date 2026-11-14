<!-- languages:start -->
<div align="center">

<details>
<summary><b>🌐 Language · Idioma · Langue · Sprache · Язык · 语言 · 言語 · 언어 · भाषा · لغة</b></summary>
<br>

<table>
  <tr>
    <td align="center"><a href="../../README.md">English</a></td>
    <td align="center"><a href="README.ar.md">العربية</a></td>
    <td align="center"><a href="README.bn.md">বাংলা</a></td>
    <td align="center"><a href="README.zh-Hans.md">简体中文</a></td>
    <td align="center"><a href="README.fil.md">Filipino</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.fr.md">Français</a></td>
    <td align="center"><a href="README.de.md">Deutsch</a></td>
    <td align="center"><a href="README.hi.md">हिन्दी</a></td>
    <td align="center"><a href="README.id.md">Bahasa Indonesia</a></td>
    <td align="center"><a href="README.it.md">Italiano</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.ja.md">日本語</a></td>
    <td align="center"><a href="README.ko.md">한국어</a></td>
    <td align="center"><a href="README.fa.md">فارسی</a></td>
    <td align="center"><b>Português (Brasil)</b></td>
    <td align="center"><a href="README.ru.md">Русский</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.es.md">Español</a></td>
    <td align="center"><a href="README.te.md">తెలుగు</a></td>
    <td align="center"><a href="README.th.md">ไทย</a></td>
    <td align="center"><a href="README.tr.md">Türkçe</a></td>
    <td align="center"><a href="README.vi.md">Tiếng Việt</a></td>
  </tr>
</table>

</details>

</div>
<!-- languages:end -->

# YouGlish Downloader

### 🎧 Ouça. Corte. Guarde o momento.

**Encontre qualquer palavra ou expressão na fala real e salve o clipe exato.** O YouGlish Downloader une a busca de pronúncia do YouGlish a um cortador para desktop: pesquise uma expressão no idioma e no sotaque que você escolher, ouça como as pessoas realmente a dizem em contexto e baixe apenas o momento de que você precisa.

- 🎓 **Quem aprende idiomas:** ouça pessoas reais dizendo a expressão em conversas reais, e não só gravações de livro didático.
- 👩‍🏫 **Professores:** crie clipes de exemplo prontos para tocar, adaptados à sua aula.
- 🔎 **Quem procura uma expressão:** descubra onde ela é dita no YouTube, no idioma que você escolher, e guarde só aquele momento.

Baixe apenas conteúdo que você possui ou para o qual tem permissão.

![App YouGlish Downloader: pesquisar uma expressão, cortar o clipe e adicioná-lo à fila de download](../images/app-preview.webp)

Uma versão para desktop do TubeCutter para encontrar manualmente exemplos de fala com o widget oficial do YouGlish. Este projeto tem seu próprio identificador de aplicativo e suas próprias preferências.

## Download

- **Windows:** [Baixe a versão mais recente](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Escolha uma instalação normal ou uma cópia portátil.
- **macOS (Apple silicon):** [Baixe a versão para macOS](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## Configure o acesso ao YouTube

1. Abra o aplicativo e clique em **Account & Settings**.
2. Em **YouGlish playback account**, clique em **1. Sign in to Google ↗** e depois em **2. Connect YouTube ↗**, e escolha seu canal se for solicitado. Feche a janela da conta quando terminar. **Check playback ↗** reproduz um vídeo de exemplo para confirmar que tudo funciona.
3. Em **Subtitle and download authentication**, escolha **App’s YouTube session** para **Download authentication**.

Você está pronto para usar o YouGlish Downloader.

Para usar um navegador no qual você já está conectado, escolha-o em **Download authentication**. No Windows, feche esse navegador antes de pesquisar: navegadores baseados em Chromium bloqueiam o arquivo de cookies enquanto estão em execução, então a sessão própria do aplicativo é a escolha confiável ali. Use apenas a sua conta. Não importe nem compartilhe cookies de outras pessoas.

Você também pode manter **Anonymous**, mas as verificações anti-robô do YouTube são mais rígidas para acesso anônimo, e alguns vídeos vão falhar.

## Uso

Abra `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` depois de compilar, ou execute `npm run desktop` para desenvolvimento.

1. Digite a expressão de busca, o idioma e, se quiser, o sotaque, depois pesquise. O padrão é inglês com todos os sotaques.
2. Navegue e ouça no YouGlish. A legenda do exemplo escolhido preenche File Name e permanece ali enquanto a reprodução continua.
3. Edite File Name para uma expressão das legendas do vídeo. Clique em **Look Up** ou pressione Enter. Editar ou sair do campo não inicia a busca. O botão mostra um indicador até que a correspondência tenha sucesso ou falhe. Esse texto também é o nome do arquivo de saída (o contêiner acrescenta a extensão).
4. As legendas fornecidas têm prioridade. Só as legendas automáticas originais, não traduzidas, são usadas como alternativa. A correspondência ignora maiúsculas e minúsculas, pontuação e o estilo do apóstrofo; abrange cues adjacentes e suprime texto rolante sobreposto.
5. Ao escolher o vídeo, In/Out começam em zero e na duração total. Uma correspondência define In/Out nos limites do segmento de legenda que a contém, sem preenchimento. Várias correspondências exigem escolher uma ocorrência. Sem correspondência, os tempos existentes não mudam. Estes são limites de segmentos de legenda, não alinhamento acústico em nível de palavra.
6. Use as pequenas setas para alterar um dos limites ou a duração em exatamente um segundo. **Reset** restaura o vídeo inteiro e limpa entradas inválidas e erros de validação. Limites inválidos são recusados. Você também pode digitar os horários diretamente, digitar uma Length (a duração do clipe com preenchimento mostrada no campo; Out se ajusta a ela), arrastar a linha do tempo ou usar **Preview selection**.
7. **Preview selection** troca temporariamente a área do widget pelo player do YouTube incorporado para um posicionamento preciso. **Back to YouGlish results** volta à navegação. **Set In** e **Set Out** exigem essa prévia porque o YouGlish não expõe uma posição absoluta documentada.
8. As configurações de download começam recolhidas. A resolução padrão é a mais alta disponível até 1080p. No momento do download, um pedido de 1080p também aceita resoluções de origem menores disponíveis. As outras resoluções escolhidas permanecem exatas.
9. Escolha uma pasta de destino e adicione a seleção à fila de download sequencial herdada. **Precise Cut**, pausar/retomar/cancelar/tentar novamente, incorporação de legendas e exibição no Finder são mantidos.

**Account & Settings** é anônimo por padrão. Os navegadores compatíveis instalados são detectados nos locais de aplicativos usuais do macOS. Ao escolher um, o yt-dlp pode ler o armazenamento local de cookies dele para legendas e downloads; os cookies não são injetados no YouGlish nem salvos nas configurações. O widget usa a própria sessão WebView. As preferências do aplicativo e a identidade da fila são separadas do TubeCutter.

## Idioma

A interface do aplicativo está disponível em inglês e em outros 19 idiomas: árabe, bengali, chinês (simplificado), filipino, francês, alemão, hindi, indonésio, italiano, japonês, coreano, persa, português (Brasil), russo, espanhol, telugu, tailandês, turco e vietnamita. Por padrão segue o idioma do sistema. Para escolher outro, abra **Account & Settings → Language**; a escolha vale imediatamente e é lembrada. Árabe e persa são dispostos da direita para a esquerda.

As traduções ficam em `src/locales/<code>.json`, e o texto em inglês é a chave. Para adicionar ou corrigir uma tradução, veja as [notas de localização](../LOCALIZATION.md).

## Desenvolvimento

As notas de compilação estão apenas em inglês: veja o [README em inglês](../../README.md#development).
