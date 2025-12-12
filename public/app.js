(() => {
    const tg = window.Telegram?.WebApp;
  
    if (tg) {
      tg.ready();
      tg.expand();
    }
  
    const initData = tg?.initData || "";
  
    const HUMAN = "X";
    const AI = "O";
  
    // ====== "поддавалка": примерно каждая 3–5 игра ======
    const LS_KEY = "tma_ttt_pity_v1";
    function loadPity() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return { sinceWin: 0, nextIn: randInt(3, 5) };
        const v = JSON.parse(raw);
        if (typeof v?.sinceWin !== "number" || typeof v?.nextIn !== "number") {
          return { sinceWin: 0, nextIn: randInt(3, 5) };
        }
        return v;
      } catch {
        return { sinceWin: 0, nextIn: randInt(3, 5) };
      }
    }
    function savePity(v) {
      localStorage.setItem(LS_KEY, JSON.stringify(v));
    }
    function randInt(a, b) { // inclusive
      return Math.floor(Math.random() * (b - a + 1)) + a;
    }
  
    let pity = loadPity();
    let assistMode = false; // включаем на 3-5й игре после последней победы пользователя
  
    // ===== Game state =====
    let board = Array(9).fill(null);
    let isGameOver = false;
    let isHumanTurn = true;
  
    const score = { wins: 0, losses: 0, draws: 0 };
  
    // ===== UI refs =====
    const boardEl = document.getElementById("board");
    const turnBadge = document.getElementById("turnBadge");
    const toast = document.getElementById("toast");
    const winsEl = document.getElementById("wins");
    const lossesEl = document.getElementById("losses");
    const drawsEl = document.getElementById("draws");
  
    const btnNew = document.getElementById("btnNew");
    const btnReset = document.getElementById("btnReset");
  
    const modalWrap = document.getElementById("modalWrap");
    const modalTitle = document.getElementById("modalTitle");
    const modalText = document.getElementById("modalText");
    const codeBox = document.getElementById("codeBox");
    const promoCodeEl = document.getElementById("promoCode");
    const btnCopy = document.getElementById("btnCopy");
    const btnPlayAgain = document.getElementById("btnPlayAgain");
    const btnClose = document.getElementById("btnClose");
  
    const LINES = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6],
    ];
  
    function showToast(msg){
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2400);
    }
  
    function openModal({title, text, promoCode = null}){
      modalTitle.textContent = title;
      modalText.textContent = text;
  
      if (promoCode){
        promoCodeEl.textContent = promoCode;
        codeBox.style.display = "flex";
      } else {
        codeBox.style.display = "none";
      }
  
      modalWrap.classList.add("show");
    }
  
    function closeModal(){
      modalWrap.classList.remove("show");
    }
  
    function winner(b){
      for (const [a,c,d] of LINES){
        if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
      }
      if (b.every(Boolean)) return "draw";
      return null;
    }
  
    function render(){
      boardEl.innerHTML = "";
      for (let i=0;i<9;i++){
        const cell = document.createElement("button");
        cell.className = "cell";
        cell.type = "button";
        cell.disabled = isGameOver || !isHumanTurn || !!board[i];
        cell.addEventListener("click", () => humanMove(i));
  
        if (board[i]){
          const m = document.createElement("div");
          m.className = "mark " + (board[i] === HUMAN ? "x" : "o");
          m.textContent = board[i] === HUMAN ? "✕" : "◯";
          cell.appendChild(m);
        }
        boardEl.appendChild(cell);
      }
  
      if (isGameOver) turnBadge.textContent = "Игра завершена";
      else turnBadge.textContent = isHumanTurn ? "Твой ход: X" : "Ход компьютера…";
  
      winsEl.textContent = score.wins;
      lossesEl.textContent = score.losses;
      drawsEl.textContent = score.draws;
    }
  
    async function sendResult(result){
      try{
        const r = await fetch("/api/result", {
          method:"POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ initData, result })
        });
        const data = await r.json();
        if (!data?.ok) {
          showToast("Не удалось отправить событие в Telegram 😶");
          return { ok:false };
        }
        return data;
      }catch{
        showToast("Сервер недоступен 😶");
        return { ok:false };
      }
    }
  
    function finish(result){
      isGameOver = true;
      render();
  
      if (result === HUMAN){
        score.wins += 1;
  
        // пользователь победил -> сбрасываем счетчик и назначаем новую "победную" игру через 3–5
        pity.sinceWin = 0;
        pity.nextIn = randInt(3, 5);
        savePity(pity);
  
        sendResult("win").then((data) => {
          const code = data?.code || "00000";
          openModal({
            title: "Победа! ✨",
            text: "Лови промокод на скидку. Можешь скопировать в один тап.",
            promoCode: code
          });
          showToast(`Промокод: ${code}`);
        });
  
      } else if (result === AI){
        score.losses += 1;
  
        // проигрыш -> приближаемся к "победной" игре
        pity.sinceWin += 1;
        savePity(pity);
  
        sendResult("lose");
        openModal({
          title: "Проигрыш 😌",
          text: "Реванш? Нажми “Сыграть ещё раз”."
        });
  
      } else {
        score.draws += 1;
  
        // ничью тоже считаем как "без победы"
        pity.sinceWin += 1;
        savePity(pity);
  
        openModal({
          title: "Ничья 🤝",
          text: "Красиво. Давай ещё одну партию?"
        });
      }
  
      render();
    }
  
    function newGame(){
      // включаем assistMode примерно на 3–5 игре после последней победы пользователя
      assistMode = pity.sinceWin >= (pity.nextIn - 1); // например nextIn=4 -> на 4й игре assistMode=true
  
      board = Array(9).fill(null);
      isGameOver = false;
      isHumanTurn = true;
      closeModal();
      render();
    }
  
    function humanMove(i){
      if (isGameOver || !isHumanTurn || board[i]) return;
      board[i] = HUMAN;
      isHumanTurn = false;
      render();
  
      const w = winner(board);
      if (w) return finish(w);
  
      setTimeout(aiMove, 260);
    }
  
    // ===== AI helpers =====
    function emptyCells(b){
      return b.map((v,i)=>v?null:i).filter(v=>v!==null);
    }
  
    function isWinningMove(b, player, idx){
      const copy = b.slice();
      copy[idx] = player;
      return winner(copy) === player;
    }
  
    function bestMoveMinimax(b, player){
      const empties = emptyCells(b);
      if (empties.length === 0) return null;
  
      let bestScore = -Infinity;
      let best = [];
      for (const i of empties){
        const copy = b.slice();
        copy[i] = player;
        const score = minimax(copy, false);
        if (score > bestScore){
          bestScore = score;
          best = [i];
        } else if (score === bestScore){
          best.push(i);
        }
      }
      return best[Math.floor(Math.random() * best.length)];
    }
  
    function minimax(b, isMax){
      const w = winner(b);
      if (w === AI) return 10;
      if (w === HUMAN) return -10;
      if (w === "draw") return 0;
  
      const empties = emptyCells(b);
  
      if (isMax){
        let best = -Infinity;
        for (const i of empties){
          const copy = b.slice();
          copy[i] = AI;
          best = Math.max(best, minimax(copy, false));
        }
        return best;
      } else {
        let best = Infinity;
        for (const i of empties){
          const copy = b.slice();
          copy[i] = HUMAN;
          best = Math.min(best, minimax(copy, true));
        }
        return best;
      }
    }
  
    // "дружелюбный" ход: чаще ошибается, особенно на "победной" игре
    function friendlyMove(b){
      const empties = emptyCells(b);
      if (empties.length === 0) return null;
  
      // 1) Если AI может выиграть прямо сейчас, чаще НЕ добиваем (чтобы дать шанс пользователю)
      const aiWinners = empties.filter(i => isWinningMove(b, AI, i));
      if (aiWinners.length) {
        // 20% все-таки добьём (чтобы не было 100% поддавков)
        if (Math.random() < 0.20) return aiWinners[Math.floor(Math.random()*aiWinners.length)];
        // иначе сыграем "не победный" ход
      }
  
      // 2) Если у человека есть победа следующим ходом, блокируем только иногда
      const humanThreats = empties.filter(i => isWinningMove(b, HUMAN, i));
      if (humanThreats.length) {
        // 40% блокируем, 60% "проморгаем"
        if (Math.random() < 0.40) return humanThreats[Math.floor(Math.random()*humanThreats.length)];
        // иначе продолжаем выбирать "слабый" ход
      }
  
      // 3) В остальных случаях: берём не самый лучший ход из топа,
      // чтобы игра выглядела естественно, но чаще шла к победе игрока
      const scored = empties.map(i => {
        const copy = b.slice();
        copy[i] = AI;
        return { i, s: minimax(copy, false) };
      }).sort((a,b)=>b.s - a.s);
  
      const top = scored.slice(0, Math.min(4, scored.length)); // топ-4
      // смещаем выбор НЕ в самый лучший:
      // 15% лучший, 35% 2й, 35% 3й, 15% 4й (если есть)
      const r = Math.random();
      let pickIndex = 0;
      if (r < 0.15) pickIndex = 0;
      else if (r < 0.50) pickIndex = Math.min(1, top.length-1);
      else if (r < 0.85) pickIndex = Math.min(2, top.length-1);
      else pickIndex = Math.min(3, top.length-1);
  
      return top[pickIndex].i;
    }
  
    function aiMove(){
      if (isGameOver) return;
  
      // режим поддавка активен только на "победной" игре
      const move = assistMode ? friendlyMove(board) : bestMoveMinimax(board, AI);
      if (move != null) board[move] = AI;
  
      const w = winner(board);
      if (w) {
        render();
        return finish(w);
      }
  
      isHumanTurn = true;
      render();
    }
  
    // ===== Events =====
    btnNew.addEventListener("click", newGame);
    btnReset.addEventListener("click", () => {
      score.wins = score.losses = score.draws = 0;
      pity = { sinceWin: 0, nextIn: randInt(3, 5) };
      savePity(pity);
      newGame();
    });
  
    btnPlayAgain.addEventListener("click", newGame);
    btnClose.addEventListener("click", closeModal);
    modalWrap.addEventListener("click", (e) => { if (e.target === modalWrap) closeModal(); });
  
    btnCopy?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText((promoCodeEl.textContent || "").trim());
        showToast("Скопировано ✨");
      } catch {
        showToast("Не удалось скопировать");
      }
    });
  
    // Init
    render();
  })();
  