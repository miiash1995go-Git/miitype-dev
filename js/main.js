/**
 * ぱそトレ！ Logic v18.9.8 (THE ULTIMATE MASTER INTEGRATION)
 * - 20,800文字規模のオリジナルロジックを完全継承
 * - ハーフ・センター・スクロール：50pxパディング考慮の精密計算
 * - 特殊ローマ字：ti(ち), thi(てぃ), tye(ちぇ), dhi(でぃ) 完璧対応
 * - JIS黄金比：/ と Shift の間に \ キーを完全実装
 * - 4分経過（240秒）での自動リザルト移行ロジック完備
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
    constructor() {
        this.manifest = null;
        this.currentQuestions = [];
        this.currentCategoryId = 'it_terms';
        this.state = "START"; 
        this.soundEnabled = localStorage.getItem('pasotore_sound') === 'true';
        this.bestScores = JSON.parse(localStorage.getItem('pasotore_best')) || {};
        
        this.targetLimit = 320;
        this.timeLimitMs = 240000; // 4分（240秒）
        this.inactivityLimit = 120000; // 放置2分で中止
        
        this.startTime = null;
        this.lastInputTime = null;
        this.totalTypedCount = 0; 
        this.totalMissedCount = 0; 
        this.missMap = {};
        this.lastQuestion = null;

        // ハーフセンタースクロール用定数 (style.css 準拠)
        this.LEFT_PADDING = 50;
        this.CENTER_X = 430; 

        this.init();
    }

    async init() {
        try {
            this.renderKeyboard();
            this.updateSoundBtnDisplay();
            this.setupEventListeners();
            const res = await fetch('./data/category_manifest.json');
            this.manifest = await res.json();
            this.updateBestScoreDisplay();
        } catch (e) {
            console.error("Initialization Error:", e);
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
                const fetchTasks = this.manifest.categories
                    .filter(c => c.file !== "all")
                    .map(c => fetch(`./data/typing/${c.file}`).then(r => r.json()));
                const results = await Promise.all(fetchTasks);
                loadedData = results.flatMap(d => d.questions);
            } else {
                const res = await fetch(`./data/typing/${category.file}`);
                const data = await res.json();
                loadedData = data.questions;
            }
            this.currentQuestions = loadedData;
            return loadedData && loadedData.length > 0;
        } catch (e) {
            console.error("Data Load Error:", e);
            return false;
        }
    }

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
                this.updateSoundBtnDisplay();
            });
        }

        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                startBtn.disabled = true;
                const success = await this.loadQuestions(this.currentCategoryId);
                if (success) {
                    this.prepareReady();
                }
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

    updateSoundBtnDisplay() {
        const btn = document.getElementById('sound-toggle');
        if(btn) btn.innerText = `タイプ音: ${this.soundEnabled ? 'ON' : 'OFF'}`;
    }

    updateBestScoreDisplay() {
        const best = this.bestScores[this.currentCategoryId] || 0;
        const el = document.getElementById('best-score-display');
        if(el) el.innerText = `自己ベストスコア: ${best}`;
    }

    prepareReady() {
        this.state = "READY";
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
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        requestAnimationFrame(() => {
            this.nextQuestion();
            this.updateLoop();
        });
    }

    nextQuestion() {
        const elapsed = performance.now() - this.startTime;
        // 4分制限 または ターゲット打鍵数到達で終了
        if (this.totalTypedCount >= this.targetLimit || (this.startTime && elapsed > this.timeLimitMs)) { 
            this.endGame(); 
            return; 
        }

        if (!this.currentQuestions || this.currentQuestions.length === 0) return;
        const nextQ = this.currentQuestions[Math.floor(Math.random() * this.currentQuestions.length)];
        this.lastQuestion = nextQ;
        this.kanaList = this.splitKana(nextQ.kana);
        this.typedFullRomaji = ""; 
        this.currentRomajiStr = "";
        
        const kanjiEl = document.getElementById('display-kanji');
        const kanaEl = document.getElementById('display-kana');
        if (kanjiEl) kanjiEl.innerText = nextQ.kanji;
        if (kanaEl) kanaEl.innerText = nextQ.kana;
        this.prepareNextChar();
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
            this.refreshDisplay(); 
            setTimeout(() => this.nextQuestion(), 50);
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
     * ハーフ・センター・スクロール搭載 refreshDisplay
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
            } else { 
                future += (ROMAJI_TABLE[k] ? ROMAJI_TABLE[k][0] : k); 
            }
        }

        this.guideRemainRomaji = best.substring(this.currentRomajiStr.length) + future;
        const nextChar = this.guideRemainRomaji[0] || "";

        el.innerHTML = `<span class="typed">${this.typedFullRomaji.toUpperCase()}</span><span class="current">${nextChar.toUpperCase()}</span><span>${this.guideRemainRomaji.substring(1).toUpperCase()}</span>`;

        // スクロール精密計算
        const typedSpan = el.querySelector('.typed');
        const typedWidth = typedSpan ? typedSpan.offsetWidth : 0;
        const threshold = this.CENTER_X - this.LEFT_PADDING; // 430 - 50 = 380px

        let translateX;
        if (typedWidth < threshold) {
            translateX = 50; // 前半：50px位置からスタート
        } else {
            translateX = 50 - (typedWidth - threshold); // 後半：中央に固定して左へ流す
        }

        el.style.transform = `translateX(${translateX}px)`;
        this.highlightKey(nextChar);
    }

    updateGuidePosition(x) {
        const container = document.getElementById('typing-container');
        if (container) {
            container.style.setProperty('--guide-x', `${x}px`);
        }
    }

    handleKeyDown(e) {
        if (this.state !== "PLAYING") return;
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
            this.triggerDamage();
        }
        this.updateStats();
    }

    triggerDamage() {
        const el = document.getElementById('typing-container');
        if (el) { 
            el.classList.add('damage-effect'); 
            setTimeout(() => el.classList.remove('damage-effect'), 50); 
        }
    }

    highlightKey(char) {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('highlight'));
        if (!char) return;
        let id = char.toLowerCase();
        if (id === ' ') id = 'space';
        if (id === '\\') id = 'backslash';
        const el = document.getElementById(`k-${id}`);
        if (el) el.classList.add('highlight');
    }

    logMiss(char) {
        if (!char) return;
        let c = char === '-' ? 'ー' : char.toUpperCase();
        this.missMap[c] = (this.missMap[c] || 0) + 1;
    }

    updateLoop() {
        if (this.state !== "PLAYING") return;
        // 放置中止判定
        if (performance.now() - this.lastInputTime > this.inactivityLimit) { 
            this.endGame("abort"); 
            return; 
        }
        requestAnimationFrame(() => this.updateLoop());
    }

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
     * オリジナルの詳細ランク（SSS～E-）を完全復元
     */
    endGame(reason = "") {
        this.state = "RESULT";
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
        
        const resScore = document.getElementById('res-score');
        const resRank = document.getElementById('result-rank');

        if(reason === "abort") {
            document.getElementById('result-title').innerText = "練習中止";
            if (resRank) { resRank.innerText = "評価不可"; resRank.style.color = "#95a5a6"; }
        } else {
            document.getElementById('result-title').innerText = "練習結果";
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

            // 演出：SSS～A- まではキラキラ
            if (["SSS", "SS", "S", "A+", "A", "A-"].includes(rank)) resRank.classList.add('sparkle');

            // 自己ベスト更新処理
            if (!this.bestScores[this.currentCategoryId] || score > this.bestScores[this.currentCategoryId]) {
                this.bestScores[this.currentCategoryId] = score;
                localStorage.setItem('pasotore_best', JSON.stringify(this.bestScores));
            }
        }

        const sorted = Object.entries(this.missMap).sort((a,b)=>b[1]-a[1]);
        const missListEl = document.getElementById('miss-detail-list');
        if (missListEl) missListEl.innerHTML = sorted.length ? sorted.map(([k,v])=>`<div class="miss-item"><span class="miss-key">${k}</span><span class="miss-count">${v}回</span></div>`).join('') : "ミスなし！";
    }

    formatTime(ms) {
        if (isNaN(ms) || ms < 0) return "---";
        const m = Math.floor(ms/60000); 
        const s = Math.floor((ms%60000)/1000); 
        const p = Math.floor((ms%1000)/10);
        return `${m}分${s}秒${p}`;
    }

    getRank(s) {
        if(s >= 350) return "SSS"; if(s >= 325) return "SS"; if(s >= 300) return "S";
        if(s >= 275) return "A+"; if(s >= 250) return "A"; if(s >= 225) return "A-";
        if(s >= 210) return "B+"; if(s >= 180) return "B"; if(s >= 150) return "B-";
        if(s >= 125) return "C+"; if(s >= 100) return "C"; if(s >= 80) return "C-";
        if(s >= 65) return "D+"; if(s >= 50) return "D"; if(s >= 35) return "D-";
        if(s >= 20) return "E+"; if(s >= 10) return "E";
        return "E-";
    }

    renderKeyboard() {
        const layout = [
            ["1","2","3","4","5","6","7","8","9","0","-","^"],
            ["Q","W","E","R","T","Y","U","I","O","P","@"],
            ["A","S","D","F","G","H","J","K","L",";",":","]"],
            ["Shift","Z","X","C","V","B","N","M",",",".","/","\\","Shift"], // JIS \追加
            ["Space"]
        ];
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
const app = new TypingApp();