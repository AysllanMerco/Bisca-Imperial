# Bisca Imperial 🃏

Jogo de Bisca (Bisca de 3 e Bisca de 9) com baralho de 40 cartas, IA tática e
**multiplayer online em tempo real** (WebSocket).

## Arquitetura

Este é um app **full-stack em um único processo Node**:

- `server.ts` — servidor Express que:
  - serve o front-end compilado (`dist/`) em produção;
  - expõe `GET /api/health`;
  - hospeda o WebSocket do multiplayer em **`/ws-bisca`** (salas, matchmaking, regras autoritativas).
- `src/` — front-end React + Vite. A IA roda no cliente, então **não precisa de API key**.

O front conecta no WebSocket usando, nesta ordem:

1. `VITE_WS_URL`, se definido (para quando o front está hospedado separado do servidor);
2. senão, o mesmo domínio da página: `wss://<host>/ws-bisca`.

> ⚠️ **Importante:** hospedar só o front estático (como o Vercel faz por padrão)
> **não** liga o multiplayer — o Vercel serve o `dist`, mas nunca executa o
> `server.ts`. É preciso rodar o processo Node em um host que aceite WebSocket.

## Rodar localmente

```bash
npm install --include=dev
npm run dev          # http://localhost:3000 (Vite em modo dev + WebSocket)
```

Build de produção:

```bash
npm run build        # gera dist/
NODE_ENV=production npm start   # serve dist/ + /ws-bisca
```

## Deploy

### ✅ Padrão do projeto — tudo no Render (um único serviço)

O mesmo processo Node serve o jogo **e** o WebSocket, então o multiplayer
funciona sem nenhuma variável de ambiente e sem depender de outro host.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AysllanMerco/Bisca-Imperial)

1. **Render** → *New* → **Blueprint** → conecte `AysllanMerco/Bisca-Imperial`.
   O Render lê o `render.yaml` já pronto e cria o serviço com build
   `npm install --include=dev && npm run build`, start `npm start`,
   health check em `/api/health` e `NODE_ENV=production`.

   (Alternativa manual: *New* → *Web Service* com essas mesmas configurações.)
2. Confirme que o serviço subiu: `https://<seu-app>.onrender.com/api/health`
   deve responder `{"status":"ok","roomsCount":0}`.
3. Abra `https://<seu-app>.onrender.com` e teste em duas abas/dispositivos:
   **Salão Online** → o matchmaking coloca os dois na mesma sala.

> **Plano gratuito do Render:** o serviço "dorme" após **15 min sem tráfego**
> (incluindo mensagens de WebSocket) e o próximo acesso paga um **cold start de
> ~30–60 s** — é isso que dá a sensação de "o online travou/morreu".
> Para o multiplayer ficar sempre instantâneo, mantenha o serviço acordado:
> aponte um monitor externo (ex.: [cron-job.org](https://cron-job.org) ou
> UptimeRobot) para `https://<seu-app>.onrender.com/api/health` **a cada 10 min**.
> Um serviço sempre ligado consome ~730 h das 750 h gratuitas por mês.
> (Enquanto você está em partida/lobby, o ping de keep-alive do jogo já conta
> como tráfego e evita o sono.)

### Resiliência da conexão online

O cliente foi endurecido para o que o Render faz de verdade (redeploy e
reinício de instância **derrubam todas as conexões**):

- **Reconexão com backoff** (1 s → 2 s → 4 s → 8 s → 15 s), em vez de tentar
  a cada 2 s para sempre;
- **Retomada automática da partida**: ao reconectar, o cliente reenvia
  `room:join` e o servidor religa a mesma cadeira e reenvia o estado — a mesa
  continua de onde parou em vez de congelar. A mesa sobrevive até **5 minutos
  (`ROOM_GRACE_PERIOD_MS`)** após o último socket cair, tanto em partida
  (`PLAYING`) quanto no saguão (`WAITING`); só depois desse prazo ela é
  removida pelo housekeeping.
- **Se a sala não existe mais** (servidor reiniciado/redeploy), o jogador
  recebe a mensagem clara *"Sala não encontrada"* e volta ao Salão, em vez de
  ficar preso numa mesa morta sem resposta aos cliques;
- **Keep-alive `ping`/`pong` a cada 25 s** + **watchdog**: detecta sockets
  "zumbis" (celular trocando de rede) e força a reconexão;
- **Retomada imediata** ao voltar o `online`/foco da aba, sem esperar o backoff;
- **Heartbeat no servidor a cada 30 s** e limpeza de salas abandonadas, para o
  processo não acumular memória em instâncias de longa duração.

### Alternativa — front no Vercel + servidor no Render

Só vale a pena se você quiser manter os assets estáticos no Vercel. Nesse caso
o front precisa saber onde está o WebSocket:

1. Crie o serviço no Render como acima.
2. **Vercel** → *Settings* → *Environment Variables*: adicione
   `VITE_WS_URL = wss://<seu-app>.onrender.com/ws-bisca` e faça **Redeploy**.
   (Sem isso, o front tenta `wss://<dominio-do-vercel>/ws-bisca` e falha.)

## Estrutura

```
server.ts                 # Express + WebSocket (/ws-bisca) + serve dist/
src/App.tsx               # front-end React (conexão WS + reconexão/resync)
src/types/bisca.ts        # tipos compartilhados
src/utils/biscaEngine.ts  # regras do jogo
```
