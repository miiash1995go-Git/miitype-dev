/**
 * ============================================================
 * ぱそトレ！ Typing Logic System (v19.2.1)
 * THE ULTIMATE MASTER INTEGRATED EDITION
 * ------------------------------------------------------------
 * [Core Specifications]
 * 1. JIS Standard Staggered Layout (with \ and Shift IDs)
 * 2. Finger-based Pastel Color Coding (Toggleable)
 * 3. Half-Center Scrolling (Precision Calculation)
 * 4. TYA/THI/TYE Romaji Priority Logic
 * 5. Pro-Focus Mode (Background Dimming)
 * 6. 4-Minute Time Limit & 2-Minute Inactivity Guard
 * 7. Comprehensive Rank System (SSS to E-)
 * ------------------------------------------------------------
 * Update: 2026/06/09 - Added Focus Mode & Ad-Sync
 * ============================================================
 */

/**
 * ROMAJI_TABLE: 
 * 標準的な入力に加え、実務で頻出する特殊な外来語（ティ、チェ、ディ）に対応。
 * 「ちゃ・ちゅ・ちょ」は「tya・tyu・tyo」を第一候補とし、打ちやすさを追求。
 */
const ROMAJI_TABLE = {
    'あ':['a'], 'い':['i'], 'う':['u'], 'え':['e'], 'お':['o'],
    'か':['ka'], 'き':['ki'], 'く':['ku'], 'け':['ke'], 'こ':['ko'],
    'さ':['sa'], 'し':['shi','si'], 'す':['su'], 'せ':['se'], 'そ':['so'],
    'た':['ta'], 'ち':['ti','chi'], 'つ':['tsu','tu'], 'て':['te'], 'と':['to'],
    'な':['na'], 'に':['ni'], 'ぬ':['nu'], 'ね':['ne'], 'の':['no'],
    'は':['ha'], 'ひ':['hi'], 'ふ':['fu','hu'], 'へ':['he'], 'ほ':['ho'],
    'ま':['ma'], 'み':['mi'], 'む':['mu'], 'め':['me'], 'も':['mo'],
    'や':['ya'], 'ゆ':['yu'], 'よ':['yo'],
    'ら':['ra'], 'り':['ri'], 'る':['ru'], 'れ':['re'], 'ろ':['ro'],
    'わ':['wa'], 'を':['wo'], 'ん':['nn','n','xn'],
    'が':['ga'], 'ぎ':['gi'], 'ぐ':['gu'], 'げ':['ge'], 'ご':['go'],
    'ざ':['za'], 'じ':['ji','zi'], 'ず':['zu'], 'ぜ':['ze'], 'ぞ':['zo'],
    'だ':['da'], 'ぢ':['di'], 'づ':['du'], 'で':['de'], 'ど':['do'],
    'ば':['ba'], 'び':['bi'], 'ぶ':['bu'], 'べ':['be'], 'ぼ':['bo'],
    'ぱ':['pa'], 'ぴ':['pi'], 'ぷ':['pu'], 'ぺ':['pe'], 'ぽ':['po'],
    'きゃ':['kya'], 'きゅ':['kyu'], 'きょ':['kyo'],
    'しゃ':['sha','sya'], 'しゅ':['shu','syu'], 'しょ':['sho','syo'],
    'ちゃ':['tya','cha'], 'ちゅ':['tyu','chu'], 'ちょ':['tyo','cho'],
    'にゃ':['nya'], 'にゅ':['nyu'], 'にょ':['nyo'],
    'ひゃ':['hya'], 'ひゅ':['hyu'], 'ひょ':['hyo'],
    'みゃ':['mya'], 'みゅ':['myu'], 'みょ':['myo'],
    'りゃ':['rya'], 'りゅ':['ryu'], 'りょ':['ryo'],
    'ぎゃ':['gya'], 'ぎゅ':['gyu'], 'ぎょ':['gyo'],
    'じゃ':['ja','zya'], 'じゅ':['ju','zyu'], 'じょ':['jo','zyo'], 'じぇ':['je','zye'],
    'しぇ':['she','sye'], 'ちぇ':['tye','che'],
    'びゃ':['bya'], 'びゅ':['byu'], 'びょ':['byo'],
    'ぴゃ':['pya'], 'ぴゅ':['pyu'], 'ぴょ':['pyo'],
    'ふぁ':['fa'], 'ふぃ':['fi'], 'ふぇ':['fe'], 'ふぉ':['fo'],
    'うぃ':['wi'], 'うぇ':['we'], 'うぉ':['wo'],
    'てぃ':['thi'], 'でぃ':['dhi'],
    'っ':['xtu','ltu'], 'ー':['-'], '-':['-'], ' ':[' '],
    'ぁ':['xa','la'], 'ぃ':['xi','li'], 'ぅ':['xu','lu'], 'ぇ':['xe','le'], 'ぉ':['xo','lo']
};

class TypingApp {
    /**
     * constructor: プロジェクトの初期パラメータを定義。
     * 1文字の欠落も許さない堅牢な状態管理を行う。
     */
    constructor() {
        this.manifest = null;
        this.currentQuestions = [];
        this.currentCategoryId = 'it_terms';
        this.state = "START"; 
        
        // ユーザー設定の永続化
        this.soundEnabled = localStorage.getItem('pasotore_sound') === 'true';
        this.keyboardColorEnabled = localStorage.getItem('pasotore_kb_color') !== 'false';
        this.bestScores = JSON.parse(localStorage.getItem('pasotore_best')) || {};
        
        // 制限値の設定（240秒＝4分、120秒＝2分放置）
        this.targetLimit = 320;
        this.timeLimitMs = 240000;
        this.inactivityLimit = 120000;
        
        // 統計データ用
        this.startTime = null;
        this.lastInputTime = null;
        this.totalTypedCount = 0; 
        this.totalMissedCount = 0; 
        this.missMap = {};
        
        this.lastQuestionIndex = -1;
        this.isTransitioning = false;

        // レイアウト計算用定数
        this.LEFT_PADDING = 50;
        this.CENTER_X = 430; 

        this.init();
    }

    /**
     * init: アプリケーションの起動。
     * キーボードの描画、イベント登録、マニフェストの取得を一括で行う。
     */
    async init() {
        try {
            this.renderKeyboard();
            this.updateSettingsBtnDisplay();
            this.setupEventListeners();
            const res = await fetch('./data/category_manifest.json');
            this.manifest = await res.json();
            this.updateBestScoreDisplay();
        } catch (e) { 
            console.error("Critical Initialization Failure:", e); 
        }
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * loadQuestions: カテゴリに応じたJSONデータの取得。
     * 「総合判定」の場合は全データをマージして読み込む。
     */
    async loadQuestions(categoryId) {
        if (!this.manifest) return false;
        const category = this.manifest.categories.find(c => c.id === categoryId);
        if (!category) return false;
        try {
            let loadedData = [];
            if (category.file === "all") {
                const fetchTasks = this.manifest.categories
                    .filter(c => c.file !== "all")
                    .map(c => fetch(`./data/typing/${c.file}`).then(r => r.json()));
                const results = await Promise.all(fetchTasks);
                loadedData = results.flatMap(d => d.questions);
            } else {
                const res = await fetch(`./data/typing/${category.file}`);
                if (!res.ok) throw new Error("File not found");
                const data = await res.json();
                loadedData = data.questions;
            }
            this.currentQuestions = loadedData;
            return loadedData && loadedData.length > 0;
        } catch (e) { 
            console.error("Data Fetch Error:", e);
            return false; 
        }
    }

    /**
     * handleResize: レスポンシブスケーリング制御。
     * 1024px以下の場合はスケーリングを停止し、ポータルレイアウトを維持。
     */
    handleResize() {
        const app = document.getElementById('app');
        if (!app) return;
        if (document.body.classList.contains('portal-page') || window.innerWidth <= 1024) {
            app.style.position = "relative";
            app.style.left = "auto";
            app.style.top = "auto";
            app.style.transform = "none";
            app.style.margin = "0 auto";
            return;
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        const scale = Math.min(width / 1000, height / 800, 1);
        app.style.position = "absolute";
        app.style.left = "50%"; 
        app.style.top = "10px"; 
        app.style.transform = `translateX(-50%) scale(${scale})`;
        app.style.transformOrigin = "top center";
    }

    /**
     * setupEventListeners: キー入力、マウスイベントの監視。
     * 状態に応じた挙動の切り分け（READY/PLAYING等）を行う。
     */
    setupEventListeners() {
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategoryId = btn.dataset.cat;
                this.updateBestScoreDisplay();
            });
        });

        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                localStorage.setItem('pasotore_sound', this.soundEnabled);
                this.updateSettingsBtnDisplay();
            });
        }

        const colorBtn = document.getElementById('color-toggle');
        if (colorBtn) {
            colorBtn.addEventListener('click', () => {
                this.keyboardColorEnabled = !this.keyboardColorEnabled;
                localStorage.setItem('pasotore_kb_color', this.keyboardColorEnabled);
                this.updateSettingsBtnDisplay();
                this.renderKeyboard();
            });
        }

        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                startBtn.disabled = true;
                const success = await this.loadQuestions(this.currentCategoryId);
                if (success) { this.prepareReady(); }
                startBtn.disabled = false;
            });
        }

        window.addEventListener('keydown', (e) => {
            const isSpace = (e.key === " " || e.key === "Spacebar");
            const isEsc = (e.key === "Escape" || e.key === "Esc");
            if (isSpace && (this.state === "READY" || this.state === "PLAYING")) e.preventDefault();
            if (isEsc && this.state !== "START") this.endGame("abort");
            if (this.state === "READY" && isSpace) this.startCountdown();
            if (this.state === "PLAYING" && e.key.length === 1) this.handleKeyDown(e);
        });
    }

    /**
     * updateSettingsBtnDisplay: 設定ボタンの見た目を更新。
     * アクティブ状態に応じたクラスの着脱を行う。
     */
    updateSettingsBtnDisplay() {
        const sBtn = document.getElementById('sound-toggle');
        if(sBtn) {
            sBtn.innerText = `タイプ音: ${this.soundEnabled ? 'ON' : 'OFF'}`;
            sBtn.classList.toggle('active', this.soundEnabled);
        }
        const cBtn = document.getElementById('color-toggle');
        if(cBtn) {
            cBtn.innerText = `ガイド色: ${this.keyboardColorEnabled ? 'ON' : 'OFF'}`;
            cBtn.classList.toggle('active', this.keyboardColorEnabled);
        }
    }

    /**
     * updateBestScoreDisplay: 各カテゴリごとの自己ベストを画面表示。
     * ローカルストレージと連動。
     */
    updateBestScoreDisplay() {
        const best = this.bestScores[this.currentCategoryId] || 0;
        const el = document.getElementById('best-score-display');
        if(el) {
            el.innerHTML = `<span class="best-label">自己ベスト</span><span class="best-value">${best}</span>`;
        }
    }

    /**
     * prepareReady: カウントダウン前の待機状態。
     * 【集中モード】を発動し、背景を落とす。
     */
    prepareReady() {
        this.state = "READY";
        document.body.classList.add('focus-mode');
        
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        const container = document.getElementById('typing-container');
        if (container) {
            container.innerHTML = `
                <div class="ready-container">
                    <div class="ready-text">スペースキーを押して開始</div>
                    <div class="esc-guide-card">中断して終了するには [Esc] キー</div>
                </div>`;
        }
        this.highlightKey(' ');
        this.updateGuidePosition(this.LEFT_PADDING); 
    }

    /**
     * startCountdown: 3.2.1の開始演出。
     */
    startCountdown() {
        this.state = "COUNTDOWN";
        let count = 3;
        const area = document.getElementById('typing-container');
        if (area) area.innerHTML = `<div class="countdown-overlay">${count}</div>`;
        
        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                if (area) area.innerHTML = `<div class="countdown-overlay">${count}</div>`;
                if(this.soundEnabled) this.playSound(800, 0.1);
            } else {
                clearInterval(timer);
                this.startGame();
            }
        }, 1000);
    }

    /**
     * startGame: タイピングのメインループ開始。
     * 統計データとオーディオコンテキストを初期化。
     */
    startGame() {
        const container = document.getElementById('typing-container');
        if (container) {
            container.innerHTML = `
                <div class="text-wrapper-left">
                    <div id="display-kanji"></div>
                    <div id="display-kana"></div>
                    <div class="romaji-scroll-window">
                        <div id="display-romaji" class="romaji-content"></div>
                    </div>
                </div>`;
        }
        this.state = "PLAYING";
        this.startTime = performance.now();
        this.lastInputTime = this.startTime;
        this.totalTypedCount = 0;
        this.totalMissedCount = 0;
        this.missMap = {};
        this.lastQuestionIndex = -1;
        this.isTransitioning = false;
        
        // モダンブラウザ対応のAudioCtx
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        requestAnimationFrame(() => {
            this.nextQuestion();
            this.updateLoop();
        });
    }

    /**
     * nextQuestion: 次の問題を抽出。
     * 同じ問題が2回連続で選ばれない排他ロジックを搭載。
     * 4分制限、320打鍵制限の判定もここで行う。
     */
    nextQuestion() {
        const elapsed = performance.now() - this.startTime;
        if (this.totalTypedCount >= this.targetLimit || (this.startTime && elapsed > this.timeLimitMs)) { 
            this.endGame(); 
            return; 
        }

        if (!this.currentQuestions || this.currentQuestions.length === 0) return;

        let nextIdx;
        const totalQ = this.currentQuestions.length;
        if (totalQ > 1) {
            do {
                nextIdx = Math.floor(Math.random() * totalQ);
            } while (nextIdx === this.lastQuestionIndex);
        } else {
            nextIdx = 0;
        }

        this.lastQuestionIndex = nextIdx;
        const nextQ = this.currentQuestions[nextIdx];
        
        this.kanaList = this.splitKana(nextQ.kana);
        this.typedFullRomaji = ""; 
        this.currentRomajiStr = "";
        
        const kanjiEl = document.getElementById('display-kanji');
        const kanaEl = document.getElementById('display-kana');
        if (kanjiEl) kanjiEl.innerText = nextQ.kanji;
        if (kanaEl) kanaEl.innerText = nextQ.kana;
        
        this.prepareNextChar();
    }

    /**
     * splitKana: かな文字列を1文字または2文字（きゃ、等）に分解。
     */
    splitKana(kana) {
        let list = [];
        for (let i = 0; i < kana.length; i++) {
            let s2 = kana.substring(i, i+2);
            if (ROMAJI_TABLE[s2]) { list.push(s2); i++; }
            else { list.push(kana[i]); }
        }
        return list;
    }

    /**
     * prepareNextChar: 次に入力すべき文字のローマ字候補をセット。
     * ん(n/nn)やっ(xtu/ltu/重複)の特殊処理を含む。
     */
    prepareNextChar() {
        if (this.kanaList.length === 0) {
            this.refreshDisplay();
            this.isTransitioning = true;
            this.highlightKey(null);
            // 0.5秒のウェイトを設けてリズムを整える
            setTimeout(() => {
                this.isTransitioning = false;
                this.nextQuestion();
            }, 500); 
            return;
        }
        let char = this.kanaList.shift();
        if (char === 'ん' && this.kanaList.length > 0) {
            let nextF = (ROMAJI_TABLE[this.kanaList[0]] || [this.kanaList[0]]).map(o => o[0]);
            this.pendingRomajiOptions = (nextF.every(f => !['a','i','u','e','o','y','n'].includes(f))) ? ['n','nn','xn'] : ['nn','xn'];
        } else if (char === 'っ' && this.kanaList.length > 0) {
            let nextR = ROMAJI_TABLE[this.kanaList[0]] || [this.kanaList[0]];
            let firsts = nextR.map(r => r[0]);
            this.pendingRomajiOptions = [...new Set([...firsts, 'xtu', 'ltu'])];
        } else {
            this.pendingRomajiOptions = [...(ROMAJI_TABLE[char] || [char])];
        }
        this.currentRomajiStr = ""; 
        this.refreshDisplay();
    }

    /**
     * refreshDisplay: 画面表示の更新。
     * ハーフ・センター・スクロール：打鍵が進むと左にスライドし、視点を中央に固定。
     */
    refreshDisplay() {
        if (this.state !== "PLAYING") return;
        const el = document.getElementById('display-romaji');
        if (!el) return;

        let best = this.pendingRomajiOptions.find(o => o.startsWith(this.currentRomajiStr)) || this.pendingRomajiOptions[0];
        let future = "";
        let tempKana = [...this.kanaList];
        while(tempKana.length > 0) {
            let k = tempKana.shift();
            if (k === 'っ' && tempKana.length > 0) {
                let nk = tempKana[0];
                let nr = ROMAJI_TABLE[nk] ? ROMAJI_TABLE[nk][0] : nk;
                future += nr[0];
            } else { future += (ROMAJI_TABLE[k] ? ROMAJI_TABLE[k][0] : k); }
        }

        this.guideRemainRomaji = best.substring(this.currentRomajiStr.length) + future;
        const nextChar = this.guideRemainRomaji[0] || "";

        el.innerHTML = `<span class="typed">${this.typedFullRomaji.toUpperCase()}</span><span class="current">${nextChar.toUpperCase()}</span><span>${this.guideRemainRomaji.substring(1).toUpperCase()}</span>`;

        // Precision Scroll Calculation
        const typedSpan = el.querySelector('.typed');
        const typedWidth = typedSpan ? typedSpan.offsetWidth : 0;
        const threshold = this.CENTER_X - this.LEFT_PADDING; // 430 - 50 = 380px

        let translateX;
        if (typedWidth < threshold) {
            translateX = 50; 
        } else {
            translateX = 50 - (typedWidth - threshold); 
        }

        el.style.transform = `translateX(${translateX}px)`;
        if (!this.isTransitioning) {
            this.highlightKey(nextChar);
        }
    }

    /**
     * updateGuidePosition: ガイドライン座標の更新。
     */
    updateGuidePosition(x) {
        const container = document.getElementById('typing-container');
        if (container) {
            container.style.setProperty('--guide-x', `${x}px`);
        }
    }

    /**
     * handleKeyDown: キー押下時の主処理。
     * 正誤判定、統計更新、ダメージ演出を実行。
     */
    handleKeyDown(e) {
        if (this.state !== "PLAYING" || this.isTransitioning) return;
        this.lastInputTime = performance.now();
        const key = e.key.toLowerCase();
        let matches = this.pendingRomajiOptions.filter(o => o.startsWith(this.currentRomajiStr + key));
        
        if (matches.length > 0) {
            this.currentRomajiStr += key; 
            this.typedFullRomaji += key;
            this.totalTypedCount++;
            this.pendingRomajiOptions = matches;
            if(this.soundEnabled) this.playSound(600, 0.05);
            if (this.pendingRomajiOptions.includes(this.currentRomajiStr)) this.prepareNextChar();
            else this.refreshDisplay();
        } else {
            this.totalMissedCount++;
            this.logMiss(this.guideRemainRomaji[0]);
            if(this.soundEnabled) this.playSound(200, 0.1);
            const container = document.getElementById('typing-container');
            if (container) {
                container.classList.add('damage-effect');
                setTimeout(() => container.classList.remove('damage-effect'), 50);
            }
        }
        this.updateStats();
    }

    /**
     * highlightKey: キーボード上の特定キーを点灯。
     * \, Shift, Space 等の特殊ID解決を行う。
     */
    highlightKey(char) {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('highlight'));
        if (!char) return;
        let id = char.toLowerCase();
        if (id === ' ') id = 'space';
        if (id === '\\') id = 'backslash';
        const el = document.getElementById(`k-${id}`);
        if (el) el.classList.add('highlight');
    }

    /**
     * logMiss: ミスしたキーを記録し、リザルトの分析用マップへ保存。
     */
    logMiss(char) {
        if (!char) return;
        let c = char === '-' ? 'ー' : char.toUpperCase();
        this.missMap[c] = (this.missMap[c] || 0) + 1;
    }

    /**
     * updateLoop: 状態監視ループ。
     * 放置中止の判定をリアルタイムで行う。
     */
    updateLoop() {
        if (this.state !== "PLAYING") return;
        if (performance.now() - this.lastInputTime > this.inactivityLimit) { 
            this.endGame("abort"); 
            return; 
        }
        requestAnimationFrame(() => this.updateLoop());
    }

    /**
     * updateStats: リアルタイムスコア更新。
     */
    updateStats() {
        if (!this.startTime) return;
        const sec = (performance.now() - this.startTime) / 1000;
        const cpm = Math.floor(this.totalTypedCount / (sec / 60)) || 0;
        const accNum = Math.floor(((this.totalTypedCount - this.totalMissedCount) / this.totalTypedCount) * 100);
        const wpmEl = document.getElementById('wpm');
        const accEl = document.getElementById('accuracy');
        if (wpmEl) wpmEl.innerText = cpm;
        if (accEl) accEl.innerText = Math.max(0, accNum);
    }

    /**
     * endGame: リザルト画面への移行。
     * 中断時は「評価不可」を、完遂時は詳細ランクを算出・表示。
     */
    endGame(reason = "") {
        this.state = "RESULT";
        document.body.classList.remove('focus-mode');

        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
        
        const resScore = document.getElementById('res-score');
        const resRank = document.getElementById('result-rank');
        const resultTitle = document.getElementById('result-title');

        if(reason === "abort") {
            if(resultTitle) resultTitle.innerText = "練習中止";
            if(resRank) {
                resRank.innerText = "評価不可";
                resRank.style.color = "#95a5a6";
                resRank.style.fontSize = "4.5rem";
                resRank.classList.remove('sparkle');
            }
            // 中断時はスタッツをクリア
            if(resScore) resScore.innerText = "0";
            document.getElementById('res-time').innerText = "---";
            document.getElementById('res-wpm').innerText = "0";
            document.getElementById('res-acc').innerText = "0";
            document.getElementById('res-miss').innerText = "0";
            document.getElementById('res-total').innerText = "0";
        } else {
            if(resultTitle) resultTitle.innerText = "練習結果";
            const sec = (performance.now() - this.startTime) / 1000;
            const cpm = Math.floor(this.totalTypedCount / (sec / 60)) || 0;
            const accNum = Math.floor(((this.totalTypedCount - this.totalMissedCount) / this.totalTypedCount) * 100);
            const score = Math.floor(cpm * (Math.max(0, accNum)/100)**3);
            const rank = this.getRank(score);
            
            if (resScore) resScore.innerText = score; 
            if (resRank) { 
                resRank.innerText = rank; 
                resRank.style.color = "var(--accent)"; 
                resRank.style.fontSize = "4.5rem"; 
            }
            
            document.getElementById('res-time').innerText = this.formatTime(performance.now() - this.startTime);
            document.getElementById('res-wpm').innerText = cpm;
            document.getElementById('res-acc').innerText = Math.max(0, accNum);
            document.getElementById('res-miss').innerText = this.totalMissedCount;
            document.getElementById('res-total').innerText = this.totalTypedCount + this.totalMissedCount;

            if (["SSS", "SS", "S", "A+", "A", "A-"].includes(rank)) resRank.classList.add('sparkle');

            if (!this.bestScores[this.currentCategoryId] || score > this.bestScores[this.currentCategoryId]) {
                this.bestScores[this.currentCategoryId] = score;
                localStorage.setItem('pasotore_best', JSON.stringify(this.bestScores));
            }
        }

        const sorted = Object.entries(this.missMap).sort((a,b)=>b[1]-a[1]);
        const missListEl = document.getElementById('miss-detail-list');
        if (missListEl) missListEl.innerHTML = sorted.length ? sorted.map(([k,v])=>`<div class="miss-item"><span class="miss-key">${k}</span><span class="miss-count">${v}回</span></div>`).join('') : "ミスなし！";
    }

    /**
     * formatTime: ミリ秒を 分:秒.ミリ秒 形式に変換。
     */
    formatTime(ms) {
        if (isNaN(ms) || ms < 0) return "---";
        const m = Math.floor(ms/60000); const s = Math.floor((ms%60000)/1000); const p = Math.floor((ms%1000)/10);
        return `${m}分${s}秒${p}`;
    }

    /**
     * getRank: スコアに基づく詳細なランク評価（22,965文字版の完全復刻）。
     */
    getRank(s) {
        if(s >= 350) return "SSS"; if(s >= 325) return "SS"; if(s >= 300) return "S";
        if(s >= 275) return "A+"; if(s >= 250) return "A"; if(s >= 225) return "A-";
        if(s >= 210) return "B+"; if(s >= 180) return "B"; if(s >= 150) return "B-";
        if(s >= 125) return "C+"; if(s >= 100) return "C"; if(s >= 80) return "C-";
        if(s >= 65) return "D+"; if(s >= 50) return "D"; if(s >= 35) return "D-";
        if(s >= 20) return "E+"; if(s >= 10) return "E";
        return "E-";
    }

    /**
     * renderKeyboard: JIS黄金比配列のレンダリング。
     * 指の色分け（パステルカラー）とIDの正規化。
     */
    renderKeyboard() {
        const layout = [
            ["1","2","3","4","5","6","7","8","9","0","-","^"],
            ["Q","W","E","R","T","Y","U","I","O","P","@"],
            ["A","S","D","F","G","H","J","K","L",";",":","]"],
            ["Shift","Z","X","C","V","B","N","M",",",".","/","\\","Shift"],
            ["Space"]
        ];

        const fingerMap = {
            "1":"lp", "Q":"lp", "A":"lp", "Z":"lp", "Shift":"lp",
            "2":"lr", "W":"lr", "S":"lr", "X":"lr",
            "3":"lm", "E":"lm", "D":"lm", "C":"lm",
            "4":"li", "5":"li", "R":"li", "T":"li", "F":"li", "G":"li", "V":"li", "B":"li",
            "6":"ri", "7":"ri", "Y":"ri", "U":"ri", "H":"ri", "J":"ri", "N":"ri", "M":"ri",
            "8":"rm", "I":"rm", "K":"rm", ",":"rm",
            "9":"rr", "O":"rr", "L":"rr", ".":"rr",
            "0":"rp", "-":"rp", "^":"rp", "P":"rp", "@":"rp", ";":"rp", ":":"rp", "]":"rp", "/":"rp", "\\":"rp"
        };

        const container = document.getElementById('keyboard-container');
        if(!container) return;
        container.innerHTML = "";
        
        layout.forEach((row, i) => {
            const rowEl = document.createElement('div'); 
            rowEl.className = `keyboard-row row-${i}`;
            row.forEach((key, j) => {
                const kEl = document.createElement('div'); 
                kEl.className = 'key';
                if(key === "Space") kEl.classList.add('space');
                if(key === "Shift") kEl.classList.add('wide-shift');
                
                // ガイド色ONの場合のみ指クラスを付与
                if (this.keyboardColorEnabled && fingerMap[key]) {
                    kEl.classList.add(`f-${fingerMap[key]}`);
                }

                kEl.innerText = key;
                let id = key.toLowerCase();
                if (key === "Space") id = "space";
                if (key === "\\") id = "backslash";
                if (key === "Shift") id = (j === 0) ? "shift-l" : "shift-r";
                
                kEl.id = `k-${id}`;
                rowEl.appendChild(kEl);
            });
            container.appendChild(rowEl);
        });
    }

    /**
     * playSound: WebAudioによる動的タイプ音生成。
     */
    playSound(f, d) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator(); 
        const gain = this.audioCtx.createGain();
        osc.connect(gain); 
        gain.connect(this.audioCtx.destination);
        osc.frequency.value = f; 
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + d);
        osc.start(); 
        osc.stop(this.audioCtx.currentTime + d);
    }
}

/**
 * ぱそトレ！システム起動
 */
const app = new TypingApp();