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

### Opção recomendada — servidor no Render (grátis) + front no Vercel

Mantém o site rápido no Vercel e adiciona só o servidor de tempo real.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AysllanMerco/Bisca-Imperial)

1. **Render** → *New* → *Web Service* → conecte `AysllanMerco/Bisca-Imperial`.
   - Build Command: `npm install --include=dev && npm run build`
   - Start Command: `npm start`
   - Environment: `NODE_ENV=production`
   - (Há um `render.yaml` pronto para o fluxo de *Blueprint*.)
2. Confirme o WebSocket respondendo: `https://<seu-app>.onrender.com/api/health`.
3. **Vercel** → *Settings* → *Environment Variables*: adicione
   `VITE_WS_URL = wss://<seu-app>.onrender.com/ws-bisca` e faça **Redeploy**.

### Opção simples — tudo no Render

Um único serviço serve o jogo inteiro; o front usa o próprio domínio e o
multiplayer funciona sem variáveis de ambiente.

> O plano gratuito do Render "dorme" após ~15 min sem acesso (o primeiro
> carregamento demora alguns segundos). Para manter aquecido, aponte um
> monitor externo (ex.: cron-job.org) para `/api/health` a cada 10 min.

## Estrutura

```
server.ts                 # Express + WebSocket (/ws-bisca) + serve dist/
src/App.tsx               # front-end React (conexão WS em ~linha 334)
src/types/bisca.ts        # tipos compartilhados
src/utils/biscaEngine.ts  # regras do jogo
```
