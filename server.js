const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const BOT_TOKEN = process.env.BOT_TOKEN;      // обязателен
const LOG_CHAT_ID = process.env.LOG_CHAT_ID;  // опционально
const EXPIRES_IN = Number(process.env.INITDATA_EXPIRES_IN || 3600); // сек

if (!BOT_TOKEN) {
  console.error("Missing env BOT_TOKEN");
  process.exit(1);
}

function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

function timingSafeEqualHex(a, b) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function validateInitData(initData, botToken, expiresInSec) {
  const data = parseInitData(initData);
  const hash = data.hash;
  if (!hash) throw new Error("initData: missing hash");

  // check auth_date
  const authDate = Number(data.auth_date || 0);
  if (!authDate) throw new Error("initData: missing auth_date");
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > expiresInSec) throw new Error("initData expired");

  // build data_check_string (all fields except hash, sorted by key)
  const pairs = Object.entries(data)
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // computed_hash = HMAC_SHA256(secret_key, data_check_string)
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(pairs)
    .digest("hex");

  if (!timingSafeEqualHex(computedHash, hash)) {
    throw new Error("initData hash mismatch");
  }

  return data;
}

async function tgSendMessage(chat_id, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ chat_id, text, disable_web_page_preview: true })
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(`Telegram API error: ${JSON.stringify(json)}`);
}

function genPromo5() {
  const n = crypto.randomInt(0, 100000);
  return String(n).padStart(5, "0");
}

app.post("/api/result", async (req, res) => {
  try {
    const { initData, result } = req.body || {};
    if (!initData) return res.status(400).json({ ok:false, error:"initData required" });
    if (result !== "win" && result !== "lose") {
      return res.status(400).json({ ok:false, error:"result must be win|lose" });
    }

    const raw = validateInitData(initData, BOT_TOKEN, EXPIRES_IN);

    // user is JSON in initData
    const user = raw.user ? JSON.parse(raw.user) : null;
    const userId = user?.id;
    if (!userId) return res.status(400).json({ ok:false, error:"user.id missing" });

    let text = "";
    let code = "";

    if (result === "win") {
      code = genPromo5();
      text = `Победа! Промокод выдан: ${code}`;
      await tgSendMessage(userId, text);
    } else {
      text = "Проигрыш";
      await tgSendMessage(userId, text);
    }

    if (LOG_CHAT_ID) {
      const who = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
      const uname = user?.username ? `@${user.username}` : "";
      await tgSendMessage(LOG_CHAT_ID, `${text}\nПользователь: ${who} ${uname} id:${userId}`);
    }

    return res.json({ ok:true, code });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:String(e.message || e) });
  }
});

app.get("/health", (_, res) => res.json({ ok:true }));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
