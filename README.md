# Telegram Mini App: Крестики-нолики (Tic-Tac-Toe)

Demo: https://tma-tictactoe-bertyrocket.amvera.io/
Demo Telegram: https://t.me/testertosterplay_bot
Repo: https://github.com//Bddh13/Tic-tac-toe-tes/

Небольшая игра «Крестики-нолики» в формате Telegram Mini App: игрок играет против компьютера.  
При победе показывается рандомный 5-значный промокод и отправляется сообщение в Telegram-бот.  
При проигрыше отправляется сообщение «Проигрыш» и предлагается сыграть ещё раз.

## Функциональность
- ✅ Крестики-нолики 3×3: игрок vs компьютер
- ✅ Адаптивный UI (mobile-first), мягкий “female-friendly” визуальный стиль 25–40
- ✅ Победа: промокод (5 цифр) + Telegram сообщение `Победа! Промокод выдан: [код]`
- ✅ Проигрыш: Telegram сообщение `Проигрыш` + CTA «Сыграть ещё раз»
- ✅ Настроенная вероятность: пользователь выигрывает примерно раз в 3–5 игр (режим “friendly AI”)

## Технологии
- Frontend: vanilla HTML/CSS/JS
- Backend: Node.js + Express
- Hosting: Amvera (Node app + static)

## Структура проекта
tma-tictactoe/
public/
index.html
app.js
styles.css
server.js
package.json
amvera.yml

## Локальный запуск
Требования: Node.js 18+

```bash
npm install
BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN" LOG_CHAT_ID="OPTIONAL_CHAT_ID" npm start

После запуска:

UI: http://localhost:3000
Healthcheck: http://localhost:3000/health

Переменные окружения

BOT_TOKEN
TELEGRAM_API_ID
TELEGRAM_API_HASH
