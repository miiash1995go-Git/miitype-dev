/**
 * ============================================================
 * ぱそトレ！ Typing Logic System (v19.7.2)
 * THE ULTIMATE MASTER INTEGRATED EDITION
 * ------------------------------------------------------------
 * [Laptop Optimization Update]
 * 1. Scaling removal, replaced by compact layout components.
 * 2. Logic preserved: Focus Mode, Scroll, Wait, Repeat-Exclusion.
 * 3. 27,000-char-class robust logic & detailed Rank system.
 * ============================================================
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
    'っ':['ttu'], 'ー':['-'], '-':['-'], ' ':[' '],
    '、': [',','、'], '。': ['.','。'],
    '！': ['!','！'], '？': ['?','？'],
    '0':['0'], '1':['1'], '2':['2'], '3':['3'], '4':['4'], '5':['5'], '6':['6'], '7':['7'], '8':['8'], '9':['9'],
    '０':['0'], '１':['1'], '２':['2'], '３':['3'], '４':['4'], '５':['5'], '６':['6'], '７':['7'], '８':['8'], '９':['9'],
    'ぁ':['xa','la'], 'ぃ':['xi','li'], 'ぅ':['xu','lu'], 'ぇ':['xe','le'], 'ぉ':['xo','lo']
};

class TypingApp {
    constructor() {
        this.manifest = null;
        this.currentQuestions = [];
        this.currentCategoryId = 'roman_pure';
        this.state = "START"; 
        
        this.soundEnabled = localStorage.getItem('pasotore_sound') === 'true';
        this.keyboardColorEnabled = localStorage.getItem('pasotore_kb_color') !== 'false';
        this.bestScores = JSON.parse(localStorage.getItem('pasotore_best')) || {};
        
        // ローマ字基礎（初期値）は軽量設定
        this.targetLimit = 200;
        this.timeLimitMs = 180000;
        this.inactivityLimit = 120000;
        
        this.startTime = null;
        this.lastInputTime = null;
        this.totalTypedCount = 0; 
        this.totalMissedCount = 0; 
        this.missMap = {};
        
        this.lastQuestionIndex = -1;
        this.isTransitioning = false;
        this.isTestMode = false;      // 5分間テストモード判定フラグ
        this.testTimerId = null;      // タイマー管理用
        this.testCharactersTyped = 0; 
        
        // --- テンキー出題管理用 ---
        this.tenkeyData = null;           // JSONから読み込んだ全カテゴリ
        this.tenkeyCategoryIndex = 0;    
        this.tenkeyQuestionInCatCount = 0; 
        this.lastTenkeyText = "";        // 安全性確保：あらかじめ変数の箱を用意しておく

        // 【修正】コンパクト化に伴い、基準数値を微調整
        this.LEFT_PADDING = 40; // 50から40へ
        this.CENTER_X = 400;   // 430から400へ（コンテナ幅が800pxになるため）

        this.init();

        // ブラウザバック（bfcache）時の状態不整合を強制リセット
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                this.state = "START";
                document.body.classList.remove('focus-mode');
                this.isTransitioning = false;
                const startBtn = document.getElementById('start-btn');
                if (startBtn) startBtn.classList.remove('is-disabled');
            }
        });
    }

    async init() {
        try {
            // 物理的お掃除の徹底：キャッシュやリダイレクト時の暗転残留を強制排除
            document.body.classList.remove('focus-mode');
            
            this.renderKeyboard();
            this.updateSettingsBtnDisplay();
            this.setupEventListeners();
            const res = await fetch('./data/category_manifest.json');
            this.manifest = await res.json();
            this.updateBestScoreDisplay();

            // 既存のボタンを自動選択するロジック（v20.8.06）
            const params = new URLSearchParams(window.location.search);
            const targetCat = params.get('cat');
            if (targetCat) {
                const targetBtn = document.querySelector(`.btn-category[data-cat="${targetCat}"]`);
                if (targetBtn) { targetBtn.click(); }
            }
        } catch (e) {
            console.error("Critical Initialization Failure:", e); 
        }
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    async loadQuestions(categoryId) {
        if (!this.manifest) return false;
        const category = this.manifest.categories.find(c => c.id === categoryId);
        if (!category) return false;
        try {
            let loadedData = [];
if (category.file === "all") {
                // 総合判定から、特殊構造の「ローマ字基礎」および「テンキー」「5分間テスト」を除外
                const fetchTasks = this.manifest.categories
                    .filter(c => c.file !== "all" && c.id !== "roman_pure" && c.id !== "roman_complex" && c.id !== "test_5min" && c.id !== "tenkey")
                    .map(c => fetch(`./data/typing/${c.file}`).then(r => r.json()));
                const results = await Promise.all(fetchTasks);
                loadedData = results.flatMap(d => d.questions);
            } else {
                const res = await fetch(`./data/typing/${category.file}`);
                if (!res.ok) throw new Error("File not found");
                const data = await res.json();
                
                // テンキーの場合は構造が異なるため tenkeyData に保持
                if (categoryId === 'tenkey') {
                    this.tenkeyData = data.categories;
                    loadedData = data.categories[0].items; // 初期候補として最初のカテゴリを入れる
                    this.tenkeyCategoryIndex = 0;
                    this.tenkeyQuestionInCatCount = 0;
                } else {
                    loadedData = data.questions;
                }
            }
            this.currentQuestions = loadedData;
            return loadedData && loadedData.length > 0;
        } catch (e) { 
            console.error("Data Fetch Error:", e);
            return false; 
        }
    }

handleResize() {
        const app = document.getElementById('app');
        if (!app) return;

        // 読みものページ（portal-page）では、この関数自体を終了（何もしない）
        if (document.body.classList.contains('portal-page')) {
            app.style.position = "static"; // 絶対配置を確実に解除
            app.style.margin = "0 auto";
            app.style.transform = "none";
            return;
        }

        // タイピング練習画面（game-body）のみ絶対配置を適用
        if (window.innerWidth <= 1024) {
            app.style.position = "";
            app.style.left = "";
            app.style.top = "";
            app.style.transform = "";
            app.style.margin = "0 auto";
            return;
        }

        app.style.position = "absolute";
        app.style.left = "50%"; 
        app.style.top = "0"; 
        app.style.transform = `translateX(-50%)`;
        app.style.transformOrigin = "top center";
    }

    setupEventListeners() {
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategoryId = btn.dataset.cat;

                // カテゴリ別の制限設定
                if (this.currentCategoryId === 'tenkey') {
                    this.targetLimit = 200; // テンキーは200文字
                    this.timeLimitMs = 180000;
                } else if (this.currentCategoryId === 'roman_pure' || this.currentCategoryId === 'roman_complex') {
                    this.targetLimit = 200;
                    this.timeLimitMs = 180000;
                } else {
                    this.targetLimit = 320;
                    this.timeLimitMs = 240000;
                }

                this.renderKeyboard(); // カテゴリ変更に合わせてキーボード再描画
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
                // 5分間テストの場合は即座にリダイレクト
                if (this.currentCategoryId === 'test_5min') {
                    window.location.href = 'test.html';
                    return;
                }

                // aタグには .disabled がないため、CSSクラスでクリックを封じる
                startBtn.classList.add('is-disabled');
                this.state = "START"; 
                this.isTransitioning = false; 

                this.isTestMode = false;
                const success = await this.loadQuestions(this.currentCategoryId);
if (success) { 
                    // [追加] Googleに開始を報告
                    if (typeof gtag === 'function') {
                        gtag('event', 'typing_start', { 'category_id': this.currentCategoryId });
                    }
                    this.prepareReady(); 
                }
                startBtn.classList.remove('is-disabled');
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

    updateBestScoreDisplay() {
        const best = this.bestScores[this.currentCategoryId] || 0;
        const el = document.getElementById('best-score-display');
        if(el) {
            // カテゴリに応じて表示単位を切り分け
            var unitText = "スコア"; 
            if (this.currentCategoryId === 'test_5min') {
                unitText = "文字";
            }
            
            // 数値と単位に個別のタグを割り当てて視認性を向上
            el.innerHTML = 
                '<span class="best-label">自己ベスト</span>' +
                '<span class="best-value">' + best + '</span>' +
                '<span class="best-unit">' + unitText + '</span>';
        }
    }

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
        this.lastTenkeyText = "";        // 2周目・3周目のプレイ時に重複回避を確実にリセットする
        this.isTransitioning = false;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.nextQuestion();
        this.updateLoop();

        // プレイ画面右上の情報表示（オーバーレイ）の制御
        const overlay = document.getElementById('test-info-overlay');
        if (this.isTestMode) {
            if (overlay) overlay.classList.remove('hidden');
            this.testCharactersTyped = 0;
            this.startTestTimer();
        } else {
            if (overlay) overlay.classList.add('hidden');
        }
    }

    nextQuestion() {
        // 1. 終了判定（テストモード以外）
        if (!this.isTestMode) {
            const elapsed = performance.now() - this.startTime;
            if (this.totalTypedCount >= this.targetLimit || (this.startTime && elapsed > this.timeLimitMs)) { 
                this.endGame(); 
                return; 
            }
        }

        // 2. テンキー専用の順次出題ロジック
        if (this.currentCategoryId === 'tenkey' && this.tenkeyData) {
            const currentCat = this.tenkeyData[this.tenkeyCategoryIndex];
            
            // カテゴリ内のアイテムからランダムに1問選択（直前と同じ問題は避ける）
            let selectedItem;
            do {
                selectedItem = currentCat.items[Math.floor(Math.random() * currentCat.items.length)];
            } while (currentCat.items.length > 1 && selectedItem.value === this.lastTenkeyText);
            
            this.lastTenkeyText = selectedItem.value;
            const text = selectedItem.value;

            // 文字分割と初期化
            this.kanaList = this.splitKana(text);
            this.typedFullRomaji = ""; 
            this.currentRomajiStr = "";
            
            // 表示の更新（かなエリアにはカテゴリ名を表示）
            const kanjiEl = document.getElementById('display-kanji');
            const kanaEl = document.getElementById('display-kana');
            if (kanjiEl) kanjiEl.innerText = text;
            if (kanaEl) kanaEl.innerText = currentCat.name; 

            // カウント進捗とカテゴリ切り替え判定（2問ごとに次へ）
            this.tenkeyQuestionInCatCount++;
            if (this.tenkeyQuestionInCatCount >= 2) {
                this.tenkeyQuestionInCatCount = 0;
                this.tenkeyCategoryIndex++;
                if (this.tenkeyCategoryIndex >= this.tenkeyData.length) {
                    this.tenkeyCategoryIndex = 0; // 全カテゴリ終わったら最初に戻る
                }
            }
            this.prepareNextChar();

        } else {
            // 3. 通常のタイピングロジック
            if (!this.currentQuestions || this.currentQuestions.length === 0) return;
            let nextIdx;
            const totalQ = this.currentQuestions.length;
            if (totalQ > 1) {
                do { nextIdx = Math.floor(Math.random() * totalQ); } while (nextIdx === this.lastQuestionIndex);
            } else { nextIdx = 0; }
            this.lastQuestionIndex = nextIdx;
            const nextQ = this.currentQuestions[nextIdx];
            this.kanaList = this.splitKana(nextQ.kana);
            this.typedFullRomaji = ""; this.currentRomajiStr = "";
            const kanjiEl = document.getElementById('display-kanji');
            const kanaEl = document.getElementById('display-kana');
            if (kanjiEl) kanjiEl.innerText = nextQ.kanji;
            if (kanaEl) kanaEl.innerText = nextQ.kana;
            this.prepareNextChar();
        }
    }

    splitKana(kana) {
        let list = [];
        for (let i = 0; i < kana.length; i++) {
            let s2 = kana.substring(i, i+2);
            if (ROMAJI_TABLE[s2]) { list.push(s2); i++; }
            else { list.push(kana[i]); }
        }
        return list;
    }

    prepareNextChar() {
        if (this.kanaList.length === 0) {
            if (this.isTestMode) {
                // 文を完了した時点で、表示されている「漢字（日本語）」の文字数を加算
                const kanji = document.getElementById('display-kanji').innerText;
                this.testCharactersTyped += kanji.length;
            }
            this.refreshDisplay();
            this.isTransitioning = true;
            this.highlightKey(null);
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
        this.currentRomajiStr = ""; this.refreshDisplay();
    }

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

        const typedSpan = el.querySelector('.typed');
        const typedWidth = typedSpan ? typedSpan.offsetWidth : 0;
        
        // 【修正】コンパクト化に合わせてスクロールの閾値を調整
        const threshold = this.CENTER_X - this.LEFT_PADDING; 

        let translateX;
        if (typedWidth < threshold) { translateX = this.LEFT_PADDING; } 
        else { translateX = this.LEFT_PADDING - (typedWidth - threshold); }
        
        el.style.transform = `translateX(${translateX}px)`;
        if (!this.isTransitioning) { this.highlightKey(nextChar); }
    }

    updateGuidePosition(x) {
        const container = document.getElementById('typing-container');
        if (container) { container.style.setProperty('--guide-x', `${x}px`); }
    }

    handleKeyDown(e) {
        if (this.state !== "PLAYING" || this.isTransitioning) return;
        this.lastInputTime = performance.now();
        const key = e.key.toLowerCase();

        // 1. 現在の文字（モーラ）の選択肢と照合
        let matches = this.pendingRomajiOptions.filter(o => o.startsWith(this.currentRomajiStr + key));

        if (matches.length > 0) {
            // 正解入力
            this.currentRomajiStr += key;
            this.typedFullRomaji += key;
            this.totalTypedCount++;
            this.pendingRomajiOptions = matches;
            if(this.soundEnabled) this.playSound(600, 0.05);

            // 文字が「完全に完了」したか判定
            // 「n」が正解でも、まだ「nn」という長い選択肢が残っている場合は遷移を待機する（重要）
            const hasLongerOption = this.pendingRomajiOptions.some(o => o.length > this.currentRomajiStr.length);
            
            if (this.pendingRomajiOptions.includes(this.currentRomajiStr) && !hasLongerOption) {
                this.prepareNextChar();
            } else {
                this.refreshDisplay();
            }
        } else {
            // 現在の文字には不適合。
            // しかし、現在の入力ですでに文字が成立している（例：ん＝n）場合、
            // そのキーが「次の文字」の開始として正解なら、自動遷移して処理する
            if (this.pendingRomajiOptions.includes(this.currentRomajiStr)) {
                this.prepareNextChar();
                // 遷移後の新しい文字に対して、同じキーを再度評価する（再帰処理）
                this.handleKeyDown(e);
                return;
            } else {
                // 本当のミス入力
                this.totalMissedCount++;
                this.logMiss(this.guideRemainRomaji[0]);
                if(this.soundEnabled) this.playSound(200, 0.1);
                const container = document.getElementById('typing-container');
                if (container) {
                    container.classList.add('damage-effect');
                    setTimeout(() => container.classList.remove('damage-effect'), 50);
                }
            }
        }
        this.updateStats();
    }

    highlightKey(char) {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('highlight'));
        if (!char) return;
        let id = char.toLowerCase();
        
        // 通常キーボード用マッピング
        if (id === ' ') id = 'space';
        if (id === '\\') id = 'backslash';

        // テンキー用マッピング（記号とIDを一致させる）
        if (id === '/') id = 'divide';
        if (id === '*') id = 'multiply';
        if (id === '-') id = 'minus';
        if (id === '+') id = 'plus';
        if (id === '.') id = 'decimal';
        if (id === 'ent') id = 'enter';

        const el = document.getElementById(`k-${id}`);
        if (el) el.classList.add('highlight');
    }

    logMiss(char) {
        if (!char) return;
        // テンキーモード時は記号をそのまま表示、通常時は日本語の慣習（長音）に合わせる
        let c = char.toUpperCase();
        if (this.currentCategoryId !== 'tenkey' && char === '-') c = 'ー';
        this.missMap[c] = (this.missMap[c] || 0) + 1;
    }

    updateLoop() {
        if (this.state !== "PLAYING") return;
        if (performance.now() - this.lastInputTime > this.inactivityLimit) { this.endGame("abort"); return; }
        requestAnimationFrame(() => this.updateLoop());
    }

    updateStats() {
        if (!this.startTime) return;
        const sec = (performance.now() - this.startTime) / 1000;
        const cpm = Math.floor(this.totalTypedCount / (sec / 60)) || 0;
        const accNum = (this.totalTypedCount > 0) ? (((this.totalTypedCount - this.totalMissedCount) / this.totalTypedCount) * 100).toFixed(1) : "0.0";
        const wpmEl = document.getElementById('wpm');
        if (wpmEl) wpmEl.innerText = cpm;
    }

/* --- main.js：採点アルゴリズムとランクテーブルの刷新 --- */

    endGame(reason = "") {
        this.isTransitioning = false;
        if (this.testTimerId) clearInterval(this.testTimerId);
        
        // 【最優先】まず暗転を解除し、スクロールをトップに戻して「見える」状態を確保する
        document.body.classList.remove('focus-mode');
        window.scrollTo(0, 0);

        this.state = "RESULT";
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
                resRank.style.fontSize = "3.8rem";
                resRank.classList.add('is-aborted'); 
                resRank.classList.remove('sparkle');
            }
            if(resScore) resScore.innerText = "0";
            document.getElementById('res-time').innerText = "---";
            document.getElementById('res-wpm').innerText = "0";
            document.getElementById('res-acc').innerText = "0.0";
            document.getElementById('res-miss').innerText = "0";
            document.getElementById('res-total').innerText = "0";
        } else {
            if(resultTitle) resultTitle.innerText = "練習結果";
            if(resRank) resRank.classList.remove('is-aborted'); // ★追加：中止クラスを消す
            const sec = (performance.now() - this.startTime) / 1000;
            const cpm = Math.floor(this.totalTypedCount / (sec / 60)) || 0;
            const accNumRaw = (this.totalTypedCount > 0) ? ((this.totalTypedCount - this.totalMissedCount) / this.totalTypedCount) * 100 : 0;
            
            // 【究極修正】採点アルゴリズム：3乗から2乗へ（マイルド化）
            const score = Math.floor(cpm * (Math.max(0, accNumRaw)/100)**2);
            const rank = this.getRank(score);
            
            if (resScore) resScore.innerText = score; 

            // テストモード時はリザルト画面の情報を書き換える
            if (this.isTestMode) {
                const testRank = this.getTestRank(this.testCharactersTyped);
                document.getElementById('result-title').innerText = "5分間タイピングテスト結果";
                
                // スコア欄に入力文字数を表示し、ラベルを変更
                resScore.innerText = this.testCharactersTyped;
                const scoreLabel = document.querySelector('.res-grid-row:nth-child(1) .res-label');
                if (scoreLabel) scoreLabel.innerText = "入力文字数";

                // ランク表示の更新
                if (resRank) {
                    resRank.innerText = testRank;
                    resRank.style.fontSize = testRank.length > 2 ? "5rem" : "7rem";
                }

                // コメントを表示
                const commentEl = document.querySelector('.rank-display-area p');
                if (commentEl) commentEl.innerText = this.getTestComment(testRank);

                // テストに不要な項目（CPM等の統計）を一時的に隠す
                document.querySelectorAll('.res-grid-row:nth-child(2), .res-grid-row:nth-child(3)').forEach(el => el.style.display = 'none');
            } else {
                // 通常モードなら表示を戻す
                const scoreLabel = document.querySelector('.res-grid-row:nth-child(1) .res-label');
                if (scoreLabel) scoreLabel.innerText = "スコア";
                document.querySelectorAll('.res-grid-row:nth-child(2), .res-grid-row:nth-child(3)').forEach(el => el.style.display = 'flex');
            }

// [最新版：GA4詳細分析ロジック] 
            // カテゴリIDから日本語のカテゴリ名を取得（例：windows -> Windows操作）
            const categoryName = this.manifest ? this.manifest.categories.find(c => c.id === this.currentCategoryId)?.name : this.currentCategoryId;

if (typeof gtag === 'function') {
                // [最終完全版] 全スタッツをGA4へ送信
                gtag('event', 'typing_complete', {
                    'timestamp': new Date().getTime(),
                    'score': score,                   /* スコア */
                    'rank': rank,                     /* 判定ランク (A, S, Legend等) */
                    'category_name': categoryName,    /* カテゴリ名 */
                    'cpm': cpm,                       /* 打鍵速度 */
                    'accuracy': parseFloat(accNumRaw.toFixed(1)), /* 正確率 */
                    'miss_count': this.totalMissedCount, /* ミス数 */
                    'time_spent_sec': Math.floor(sec), /* かかった時間（秒） */
                    'total_keys': this.totalTypedCount + this.totalMissedCount
                });
            }

            if (resRank) { 
                resRank.innerText = rank; 
                resRank.style.color = "var(--accent)"; 
                // 文字数に応じてフォントサイズを自動調整（LやMに対応）
                resRank.style.fontSize = rank.length > 2 ? "5.5rem" : "8rem";
            }
            
            document.getElementById('res-time').innerText = this.formatTime(performance.now() - this.startTime);
            document.getElementById('res-wpm').innerText = cpm;
            document.getElementById('res-acc').innerText = accNumRaw.toFixed(1);
            document.getElementById('res-miss').innerText = this.totalMissedCount;
            document.getElementById('res-total').innerText = this.totalTypedCount + this.totalMissedCount;

            if (["Legend", "Master", "SSS", "SS", "S", "A+", "A", "A-"].includes(rank)) resRank.classList.add('sparkle');

            if (!this.bestScores[this.currentCategoryId] || score > this.bestScores[this.currentCategoryId]) {
                this.bestScores[this.currentCategoryId] = score;
                localStorage.setItem('pasotore_best', JSON.stringify(this.bestScores));
            }
        }

        const sorted = Object.entries(this.missMap).sort((a,b)=>b[1]-a[1]);
        const missListEl = document.getElementById('miss-detail-list');
        if (missListEl) {
            missListEl.innerHTML = sorted.length ? sorted.map(([k,v], i) => {
                let topClass = i === 0 ? 'worst1' : i === 1 ? 'worst2' : i === 2 ? 'worst3' : '';
                return `<div class="miss-item ${topClass}"><span class="miss-key">${k}</span><span class="miss-count">${v}回</span></div>`;
            }).join('') : "ミスなし！";
        }
    }

    formatTime(ms) {
        if (isNaN(ms) || ms < 0) return "---";
        const m = Math.floor(ms/60000); const s = Math.floor((ms%60000)/1000); const p = Math.floor((ms%1000)/10);
        return `${m}分${s}秒${p}`;
    }

/* --- main.js：getRankメソッドを以下に差し替え（ユーザー指定基準） --- */

    /**
     * getRank: カテゴリに応じて「ものさし」を切り替える
     */
    getRank(s) {
        // 200文字制限の軽量モード（テンキー・ローマ字基礎）は専用の閾値を使用
        if (this.currentCategoryId === 'tenkey' || this.currentCategoryId === 'roman_pure' || this.currentCategoryId === 'roman_complex') {
            return this.getShortModeRank(s);
        }

        // 通常モード（320文字制限）の基準
        if(s >= 500) return "Legend";
        if(s >= 400) return "Master";
        if(s >= 350) return "SSS"; 
        if(s >= 325) return "SS"; 
        if(s >= 300) return "S";
        if(s >= 260) return "A+";
        if(s >= 230) return "A"; 
        if(s >= 200) return "A-";
        if(s >= 185) return "B+"; 
        if(s >= 170) return "B"; 
        if(s >= 160) return "B-";
        if(s >= 140) return "C+"; 
        if(s >= 120) return "C"; 
        if(s >= 100) return "C-";
        if(s >= 85)  return "D+"; 
        if(s >= 65)  return "D"; 
        if(s >= 51)  return "D-";
        if(s >= 30)  return "E+"; 
        if(s >= 10)  return "E"; 
        return "E-";
    }

    /**
     * getShortModeRank: テンキー・ローマ字基礎専用（通常モードの約75%のスコアで同等評価）
     */
    getShortModeRank(s) {
        if(s >= 375) return "Legend";
        if(s >= 300) return "Master";
        if(s >= 260) return "SSS";
        if(s >= 240) return "SS";
        if(s >= 220) return "S";      // テンキーで220点なら通常300点相当の腕前
        if(s >= 195) return "A+";
        if(s >= 170) return "A";
        if(s >= 150) return "A-";     // テンキーでの合格目安
        if(s >= 135) return "B+";
        if(s >= 125) return "B";
        if(s >= 115) return "B-";
        if(s >= 105) return "C+";
        if(s >= 90)  return "C";
        if(s >= 75)  return "C-";
        if(s >= 60)  return "D+";
        if(s >= 45)  return "D";
        if(s >= 35)  return "D-";
        if(s >= 20)  return "E+";
        if(s >= 7)   return "E";
        return "E-";
    }
    renderKeyboard() {
        const container = document.getElementById('keyboard-container');
        if(!container) return;
        container.innerHTML = "";

        if (this.currentCategoryId === 'tenkey') {
            // テンキー配列のレンダリング
            container.classList.add('tenkey-mode');
            // 配色規則：ri=紫, rm=緑, rr=黄, rp=赤, rt=親指(濃緑)
            const tkKeys = [
                ["", "empty", "tk-empty", ""], 
                ["/", "divide", "", "f-rm"], 
                ["*", "multiply", "", "f-rr"], 
                ["-", "minus", "", "f-rr"],
                ["7", "7", "", "f-ri"], 
                ["8", "8", "", "f-rm"], 
                ["9", "9", "", "f-rr"], 
                ["+", "plus", "tk-tall", "f-rp"],
                ["4", "4", "", "f-ri"], 
                ["5", "5", "", "f-rm"], 
                ["6", "6", "", "f-rr"],
                ["1", "1", "", "f-ri"], 
                ["2", "2", "", "f-rm"], 
                ["3", "3", "", "f-rr"], 
                ["Ent", "enter", "tk-tall", "f-rp"],
                ["0", "0", "tk-wide", "f-rt"], 
                [".", "decimal", "", "f-rr"]
            ];
            
            tkKeys.forEach(([label, id, extraClass, fingerClass]) => {
                const kEl = document.createElement('div');
                kEl.className = `key tk-key ${extraClass}`;
                if (this.keyboardColorEnabled && fingerClass) kEl.classList.add(fingerClass);
                kEl.innerText = label;
                kEl.id = `k-${id}`;
                container.appendChild(kEl);
            });
        } else {
            // 通常QWERTY配列のレンダリング
            container.classList.remove('tenkey-mode');
            const layout = [["1","2","3","4","5","6","7","8","9","0","-","^"],["Q","W","E","R","T","Y","U","I","O","P","@"],["A","S","D","F","G","H","J","K","L",";",":","]"],["Shift","Z","X","C","V","B","N","M",",",".","/","\\","Shift"],["Space"]];
            const fingerMap = {"1":"lp","Q":"lp","A":"lp","Z":"lp","Shift":"lp","2":"lr","W":"lr","S":"lr","X":"lr","3":"lm","E":"lm","D":"lm","C":"lm","4":"li","5":"li","R":"li","T":"li","F":"li","G":"li","V":"li","B":"li","6":"ri","7":"ri","Y":"ri","U":"ri","H":"ri","J":"ri","N":"ri","M":"ri","8":"rm","I":"rm","K":"rm",",":"rm","9":"rr","O":"rr","L":"rr",".":"rr","0":"rp","-":"rp","^":"rp","P":"rp","@":"rp",";":"rp",":":"rp","]":"rp","/":"rp","\\":"rp"};
            
            layout.forEach((row, i) => {
                const rowEl = document.createElement('div'); rowEl.className = `keyboard-row row-${i}`;
                row.forEach((key, j) => {
                    const kEl = document.createElement('div'); kEl.className = 'key';
                    if(key === "Space") kEl.classList.add('space');
                    if(key === "Shift") kEl.classList.add('wide-shift');
                    if (this.keyboardColorEnabled && fingerMap[key]) kEl.classList.add(`f-${fingerMap[key]}`);
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
    }

    startTestTimer() {
        let timeLeft = 300; // 5分間
        this.updateTestUI(timeLeft);
        this.testTimerId = setInterval(() => {
            timeLeft--;
            this.updateTestUI(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(this.testTimerId);
                this.endGame();
            }
        }, 1000);
    }

    updateTestUI(sec) {
        const min = Math.floor(sec / 60);
        const s = sec % 60;
        const timerEl = document.getElementById('test-timer');
        const charEl = document.getElementById('test-char-count');
        
        if (timerEl) {
            timerEl.innerText = `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            timerEl.classList.remove('timer-warning', 'timer-danger');
            if (sec < 30) timerEl.classList.add('timer-danger');
            else if (sec < 60) timerEl.classList.add('timer-warning');
        }
        if (charEl) charEl.innerText = this.testCharactersTyped;
    }

    getTestRank(s) {
        if(s >= 1400) return "Legend";
        if(s >= 1200) return "Master";
        if(s >= 1100) return "S+";
        if(s >= 1000) return "S";
        if(s >= 950)  return "A+";
        if(s >= 900)  return "A";
        if(s >= 850)  return "A-";
        if(s >= 800)  return "B+";
        if(s >= 750)  return "B"; // 基準値
        if(s >= 700)  return "B-";
        if(s >= 650)  return "C+";
        if(s >= 600)  return "C";
        if(s >= 550)  return "C-";
        if(s >= 450)  return "D+";
        if(s >= 350)  return "D";
        if(s >= 250)  return "D-";
        return "E";
    }

    getTestComment(rank) {
        const comments = {
            "Legend": "驚異的な速度です！もはや教えることは何もありません。プロとして自信を持ってください！",
            "Master": "卓越した技術をお持ちです。どのような実務でも圧倒的なスピードで完遂できるレベルです。",
            "S+": "素晴らしい！実務の壁を悠々と超えています。正確性を維持できれば最強の相棒です。",
            "S": "実務トップクラスの速度です。あなたのタイピング力は就職・転職で大きな武器になります。",
            "A+": "非常にスムーズな打鍵です。即戦力として周囲から頼られる実力が十分に備わっています。",
            "A": "合格ラインです！実務で困ることはありません。さらに上を目指して楽しみましょう。",
            "A-": "安定感がありますね。正確な入力を続ければ、速度はさらに自然と伸びていきます。",
            "B+": "一般的な事務職で十分通用する速度です。この調子で自信を持って仕事に取り組みましょう！",
            "B": "実務の基本レベルです！ここから一歩ずつ、さらに「できる」を増やしていきましょう。",
            "B-": "基礎がしっかりと身についています。焦らずリズムを大切にすることで、さらに良くなります。",
            "C+": "前向きに頑張っていますね。まずは正確率100%を目指すことで、結果的に速度も上がります。",
            "C": "着実に成長しています！毎日の5分間の積み重ねが、未来のあなたの自信を作ります。",
            "C-": "ホームポジションを意識できていますね。焦らず、自分に優しいペースで進みましょう。",
            "D+": "最初の一歩をクリアしました！「できた」を大切に。繰り返し練習を楽しみましょう。",
            "D": "まずはキーの場所を指に覚えさせましょう。ゆっくりで大丈夫。一歩一歩が大切です。",
            "D-": "挑戦したことが素晴らしいです！まずは短い言葉から、正確に打つ喜びを感じてください。",
            "E": "大丈夫、ここから始まります。まずはローマ字の基本から、ゆっくり一緒に歩みましょう！"
        };
        return comments[rank] || "お疲れ様でした！次回の挑戦も応援しています。";
    }
} // ← 【重要】消えていたこの「クラスを閉じるカッコ」が全ての不具合の原因でした

/* ============================================================
   共通機能：ナビゲーション・パンくず統治システム (v20.7.26.Fixed_Final)
   ============================================================ */
(function() {
    var app = new TypingApp();

    function initNavigation() {
        console.log("【ぱそトレ！】ナビゲーション・パンくずを起動します。");

        // 1. 現在のURLからページ名を特定
        var url = window.location.href.toLowerCase();
        var page = url.substring(url.lastIndexOf('/') + 1).split('?')[0].split('#')[0];
        if (page === "" || page.indexOf('.') === -1) { page = "index.html"; }

        // 2. カテゴリ判定マッピング
        // 現場コラム(column)のキーワードに 'glossary' を追加し、用語集もコラム配下として統治する。
        var mapping = {
            'career':  ['mos', 'reskill', 'typing-speed', 'career', 'interview', 'cv'],
            'ai':      ['chatgpt', 'ai', 'tools'],
            'column':  ['column', 'glossary'],
            'windows': ['windows', 'pc-selection', 'folder'],
            'word':    ['word'],
            'excel':   ['excel'],
            'typing':  ['typing', 'play', 'basics']
        };

        var names = {
            'windows': 'Windows',
            'word':    'Word',
            'excel':   'Excel',
            'ai':      '生成AI',
            'typing':  'タイピング',
            'career':  '就職・転職',
            'column':  '現場コラム'
        };

        // 3. 現在のカテゴリキーを特定（Sitemap.xmlからの抽出を優先）
        var currentCat = "";

        // Sitemapから現在のページのカテゴリを取得する非同期処理
        async function syncBreadcrumbWithSitemap() {
            try {
                const res = await fetch('./sitemap.xml');
                if (!res.ok) throw new Error();
                const rawText = await res.text();
                
                // 現在のファイル名を取得
                const currentPageFile = page; 

                // Sitemap内の現在のファイルに対応するブロックを抽出
                const escapedPage = currentPageFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp('<url>[\\s\\S]*?<loc>.*?' + escapedPage + '</loc>[\\s\\S]*?<!--\\s*\\[INDEX\\]\\s*.*?\\|\\s*(.*?)\\s*-->[\\s\\S]*?</url>');
                const match = rawText.match(regex);

                if (match && match[1]) {
                    currentCat = match[1].trim();
                    console.log("【ぱそトレ！聖域通信】Sitemapよりカテゴリを確定しました: " + currentCat);
                } else {
                    // Fallback: Sitemapにない場合は従来のキーワード判定
                    for (var key in mapping) {
                        var keywords = mapping[key];
                        for (var i = 0; i < keywords.length; i++) {
                            if (page.indexOf(keywords[i]) !== -1) {
                                currentCat = key;
                                break;
                            }
                        }
                        if (currentCat) break;
                    }
                }
                
                // 確定したカテゴリでUIを更新
                applyCategoryUI();

            } catch (e) {
                console.error("【ぱそトレ！】Sitemap同期失敗。キーワード判定へ移行します。");
            }
        }

        // UI更新処理を分離
        function applyCategoryUI() {
            // 4. ヘッダーナビの現在地を点灯（Active化）
            var links = document.querySelectorAll('.nav-item, .mobile-nav-item');
            for (var l = 0; l < links.length; l = l + 1) {
                var item = links[l];
                var href = (item.getAttribute('href') || "").toLowerCase();
                var isHomeLink = (href === 'index.html' || href === './' || href === '.');
                item.classList.remove('active');
                
                // 1. 指定カテゴリがある場合はそのナビを点灯
                if (currentCat !== "" && currentCat !== "none" && href.indexOf(currentCat) !== -1) {
                    item.classList.add('active');
                } 
                // 2. カテゴリが "none" の場合、またはトップページの場合は「ホーム」を点灯
                else if ((currentCat === "none" || page === 'index.html') && isHomeLink) {
                    item.classList.add('active');
                }
            }

            // 5. 動的パンくずの生成
            var bBox = document.getElementById('dynamic-breadcrumb');
            if (bBox && page !== 'index.html') {
                var bHtml = '<a href="index.html">ホーム</a>';
                if (currentCat !== "" && names[currentCat]) {
                    bHtml += '<span class="breadcrumb-separator">＞</span>';
                    // 修正：ハブページ自体にいる場合はリンクにしない
                    if (page === 'hub-' + currentCat + '.html') {
                        bHtml += '<span>' + names[currentCat] + '</span>';
                    } else {
                        bHtml += '<a href="hub-' + currentCat + '.html">' + names[currentCat] + '</a>';
                        bHtml += '<span class="breadcrumb-separator">＞</span>';
                    }
                }
                bBox.innerHTML = bHtml;
            }
        }

        // 実行
        syncBreadcrumbWithSitemap();

        // 6. スマホメニュー
        var mBtn = document.getElementById('mobile-menu-btn');
        var mOver = document.getElementById('mobile-menu-overlay');
        var mClose = document.getElementById('menu-close-btn');
        if (mBtn && mOver) {
            mBtn.onclick = function(e) { e.preventDefault(); mOver.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
            if (mClose) mClose.onclick = function() { mOver.classList.remove('is-open'); document.body.style.overflow = ''; };
            mOver.onclick = function(e) { if(e.target === mOver) { mOver.classList.remove('is-open'); document.body.style.overflow = ''; } };
        }

        // 7. コラムフィルタ（拡張：リモートトリガー対応版）
        var tags = document.querySelectorAll('.hub-tag');
        var arts = document.querySelectorAll('.hub-article-item[data-category]');
        var remoteBtns = document.querySelectorAll('[data-remote-filter]');

        if (tags.length > 0) {
            // 共通のフィルタ実行関数
            var applyFilter = function(filterValue) {
                // 1. 下部タグボタンの表示を切り替え
                tags.forEach(function(t) {
                    if (t.getAttribute('data-filter') === filterValue) {
                        t.classList.add('active');
                    } else {
                        t.classList.remove('active');
                    }
                });

                // 2. 記事の表示/非表示を切り替え
                arts.forEach(function(a) {
                    if (filterValue === 'all' || a.getAttribute('data-category') === filterValue) {
                        a.style.display = 'block';
                    } else {
                        a.style.display = 'none';
                    }
                });
            };

            // 下部のタグボタン自体のクリックイベント
            tags.forEach(function(btn) {
                btn.onclick = function() {
                    var f = btn.getAttribute('data-filter');
                    applyFilter(f);
                };
            });

            // テーマ別大きなボタン（リモートトリガー）のクリックイベント
            remoteBtns.forEach(function(rBtn) {
                rBtn.onclick = function() {
                    var f = rBtn.getAttribute('data-remote-filter');
                    // 絞り込み実行
                    applyFilter(f);
                    // 記事一覧エリアの開始点までスムーズスクロール
                    var target = document.getElementById('column-article-grid');
                    if (target) {
                        // 1024px統治下での視認性を考慮し、少し手前で止める
                        var offset = target.getBoundingClientRect().top + window.pageYOffset - 180;
                        window.scrollTo({
                            top: offset,
                            behavior: 'smooth'
                        });
                    }
                };
            });
        }

        // 8. News 最新2件の自動転記ロジック（v20.8.11：日付・白抜き対応）
        var announceBox = document.getElementById('new-article-announce');
        var newsItems = document.querySelectorAll('.news-scroll-container .news-item');
        
        if (announceBox && newsItems.length > 0) {
            var htmlContent = '';
            // 最大2件分ループ
            for (var i = 0; i < Math.min(newsItems.length, 2); i++) {
                var item = newsItems[i];
                var dateStr = item.querySelector('.news-date').textContent;
                var newsLink = item.querySelector('.news-text');
                
                if (newsLink) {
                    var linkHref = newsLink.getAttribute('href') || '#';
                    var linkText = newsLink.textContent.replace('｜', '').trim();
                    
                    // 1行目はNEWバッジ、2行目は位置合わせ用の透明スペーサーを出力
                    var badgePart = (i === 0) 
                        ? '<span class="new-badge-label">NEW</span>' 
                        : '<span class="new-badge-spacer"></span>';

                    htmlContent += '<div class="announce-row">' +
                                   '<a href="' + linkHref + '">' +
                                   badgePart +
                                   '<span class="announce-date">' + dateStr + '</span>' +
                                   '<span>' + linkText + '</span>' +
                                   '</a>' +
                                   '</div>';
                }
            }
            announceBox.innerHTML = htmlContent;
            announceBox.classList.remove('hidden');
        }


        // 9. 画像拡大モーダル
        var zOver = document.createElement('div');
        zOver.className = 'image-zoom-overlay';
        zOver.innerHTML = '<img class="image-zoom-content" src="" alt="拡大画像">';
        document.body.appendChild(zOver);
        document.querySelectorAll('.article-image img').forEach(function(img) {
            img.onclick = function() {
                zOver.querySelector('img').src = this.src;
                zOver.classList.add('is-active');
                document.body.style.overflow = 'hidden';
            };
        });
        zOver.onclick = function() { zOver.classList.remove('is-active'); document.body.style.overflow = ''; };

        /* ============================================================
           10. アルティメット索引生成エンジン (v20.8.12.Complete_Fix)
           ------------------------------------------------------------
           物理整合性：名前空間(n:)を物理的に無視し、DOMツリーから直接抽出
           ============================================================ */
        async function initSitemapIndex() {
        const section = document.getElementById('dynamic-sitemap-index');
        if (!section) return;

        const listBody = document.getElementById('column-article-grid');
        const initialCat = section.dataset.initial || 'all';
        const categoryMap = {'typing':'タイピング','windows':'Windows','word':'Word','excel':'Excel','ai':'生成AI','career':'就職・転職','column':'現場コラム'};

        try {
            // Sitemapを単なるテキストファイルとして読み込む
            const res = await fetch('./sitemap.xml');
            if (!res.ok) throw new Error("Sitemap Load Failed");
            const rawText = await res.text();

            const articleData = [];
            // <url> 〜 </url> のブロックを物理的に切り出す
            const urlBlocks = rawText.match(/<url>([\s\S]*?)<\/url>/g);

            if (urlBlocks) {
                urlBlocks.forEach(block => {
                    const loc = block.match(/<loc>(.*?)<\/loc>/)?.[1] || "";
                    // 【物理修復】コメント <!-- [INDEX] タイトル | カテゴリ --> を正規表現で抽出
                    const meta = block.match(/<!--\s*\[INDEX\]\s*(.*?)\s*\|\s*(.*?)\s*-->/);

                    // 記事リストから除外する「システム・運営・ナビ用ページ」の判定
                    const urlFilename = loc.split('/').pop() || "index.html";
                    const isSystemPage = (
                        urlFilename === "index.html" || 
                        urlFilename === "play.html" || 
                        urlFilename === "test.html" || 
                        urlFilename === "about.html" || 
                        urlFilename === "contact.html" || 
                        urlFilename === "privacy.html" || 
                        urlFilename.startsWith("hub-") || 
                        urlFilename === ""
                    );

                    if (loc && meta && !isSystemPage) {
                        articleData.push({
                            url: loc.split('/').pop(), // ファイル名を取得
                            title: meta[1].trim(),
                            category: meta[2].trim()
                        });
                    }
                });
            }

            function render(filter) {
                if (!listBody) return;
                listBody.innerHTML = "";
                listBody.scrollTop = 0;

                const filtered = articleData.filter(a => filter === 'all' || a.category === filter);
                
                if (filtered.length === 0) {
                    listBody.innerHTML = '<div style="padding:40px; color:#94a3b8; text-align:center; font-weight:800;">該当する記事がありません</div>';
                    return;
                }

                listBody.innerHTML = filtered.map(a => 
                    '<a href="' + a.url + '" class="hub-index-row">' +
                    '<div class="hub-index-meta"><span class="news-tag tag-' + a.category + '">' + (categoryMap[a.category] || a.category) + '</span></div>' +
                    '<div class="hub-index-info"><h4>' + a.title + '</h4></div>' +
                    '</a>'
                ).join('');
            }

            section.onclick = function(e) {
                const btn = e.target.closest('.hub-index-tab');
                if (!btn) return;
                e.preventDefault();
                section.querySelectorAll('.hub-index-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                render(btn.getAttribute('data-filter'));
            };

            render(initialCat);

        } catch (err) { console.error("Index System Error:", err); }
    }
        initSitemapIndex();
    } // initNavigation の閉じカッコ

    // --- 統合起動シーケンス ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        initNavigation();
    }
})(); // IIFE の閉じカッコ

/* --- ページトップ制御 --- */
window.onscroll = function() {
    var bBtn = document.getElementById('back-to-top');
    if (bBtn) {
        if (window.pageYOffset > 300) { bBtn.classList.add('visible'); }
        else { bBtn.classList.remove('visible'); }
    }
};
document.addEventListener('click', function(e) {
    if (e.target.closest('#back-to-top')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});