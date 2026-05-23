/**
 * Main UI Controller
 * 画面遷移やDOM操作、イベント監視を管理
 */

// グローバルインスタンス
const engine = new TypingEngine();
let timerInterval = null;
let timeLeft = 60;

// DOM要素の取得
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    romajiArea: document.getElementById('display-romaji'),
    kanjiArea: document.getElementById('display-kanji'),
    kanaArea: document.getElementById('display-kana'),
    timer: document.getElementById('timer'),
    accuracy: document.getElementById('accuracy'),
    wpm: document.getElementById('wpm'),
    weeklyTitle: document.getElementById('weekly-topic-title')
};

// 1. 初期化：データの読み込み（本来はfetchだが、ローカル実行を考慮して内部にデータを持つ）
const sampleData = [
    { kanji: "Windowsを起動します。", kana: "うぃんどうずをきどうします。", romaji: "uindouzuwokidousimasu" },
    { kanji: "Excelで表を作成します。", kana: "えくせるでひょうをさくせいします。", romaji: "ekuserudehyouwosakuseisimasu" },
    { kanji: "Wordの文書を保存する。", kana: "わーどのぶんしょをほぞんする。", romaji: "wa-donobunsyowohozonsuru" },
    { kanji: "ショートカットキーを活用する。", kana: "しょーとかっときーをかつようする。", romaji: "syo-tokattoki-wokatsuyousuru" },
    { kanji: "メールを送信しました。", kana: "めーるをそうしんしました。", romaji: "me-ruwosousinsimasu" }
];

document.addEventListener('DOMContentLoaded', () => {
    elements.weeklyTitle.innerText = "実務ITリテラシー基礎";
    engine.setQuestions(sampleData);

    document.getElementById('start-button').addEventListener('click', startGame);
});

// 2. ゲーム開始
function startGame() {
    screens.start.classList.add('hidden');
    screens.game.classList.remove('hidden');
    
    engine.reset();
    engine.setQuestions(sampleData);
    updateTypingDisplay();
    
    // キー入力監視開始
    window.addEventListener('keydown', handleInput);
    
    // タイマー開始
    startTimer();
}

// 3. 入力ハンドリング
function handleInput(e) {
    // アルファベット、記号、スペース以外の入力（Shift等）は無視
    if (e.key.length !== 1) return;

    const result = engine.checkInput(e.key);
    
    if (result === "MISS") {
        flashError();
    }

    if (result === "COMPLETED") {
        endGame();
    } else {
        updateTypingDisplay();
        updateStats();
    }
}

// 4. UI更新：タイピング文字のハイライト
function updateTypingDisplay() {
    const q = engine.getCurrentQuestion();
    const idx = engine.charIndex;

    elements.kanjiArea.innerText = q.kanji;
    elements.kanaArea.innerText = q.kana;

    // ローマ字部分を、入力済み・現在・未入力で分割して表示
    const typed = q.romaji.substring(0, idx);
    const current = q.romaji.substring(idx, idx + 1);
    const remain = q.romaji.substring(idx + 1);

    elements.romajiArea.innerHTML = `
        <span class="typed">${typed}</span>
        <span class="current">${current}</span>
        <span>${remain}</span>
    `;
}

// 5. 統計のリアルタイム更新
function updateStats() {
    const stats = engine.calculateStats();
    elements.accuracy.innerText = stats.accuracy;
    elements.wpm.innerText = stats.wpm;
}

// 6. タイマー管理
function startTimer() {
    timeLeft = 60;
    elements.timer.innerText = timeLeft;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        elements.timer.innerText = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// 7. ゲーム終了
function endGame() {
    clearInterval(timerInterval);
    window.removeEventListener('keydown', handleInput);

    const stats = engine.calculateStats();
    
    // リザルト表示
    screens.game.classList.add('hidden');
    screens.result.classList.remove('hidden');

    document.getElementById('final-score').innerText = stats.score;
    document.getElementById('final-wpm').innerText = stats.wpm;
    document.getElementById('final-accuracy').innerText = stats.accuracy;
    document.getElementById('final-miss').innerText = stats.misses;

    // 苦手キーの表示
    const weakKeys = engine.getWeakKeys();
    const weakContainer = document.getElementById('weak-keys');
    weakContainer.innerHTML = weakKeys.length > 0 
        ? weakKeys.map(([key, count]) => `<div class="key-box">${key} (${count}回)</div>`).join('')
        : "なし！素晴らしいです。";
}

// ミス時のエフェクト
function flashError() {
    elements.romajiArea.classList.add('mistake');
    setTimeout(() => {
        elements.romajiArea.classList.remove('mistake');
    }, 100);
}