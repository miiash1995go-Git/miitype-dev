/**
 * ぱそトレ！ Logic v11.1
 * 修正：正確率「%%」バグ修正 ＆ カウントダウン中央 ＆ 準備画面センター
 */

const ROMAJI_TABLE = {
    'あ':['a'], 'い':['i'], 'う':['u'], 'え':['e'], 'お':['o'],
    'か':['ka'], 'き':['ki'], 'く':['ku'], 'け':['ke'], 'こ':['ko'],
    'さ':['sa'], 'し':['shi','si'], 'す':['su'], 'せ':['se'], 'そ':['so'],
    'た':['ta'], 'ち':['chi','ti'], 'つ':['tsu','tu'], 'て':['te'], 'と':['to'],
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
    'ちゃ':['cha','tya'], 'ちゅ':['chu','tyu'], 'ちょ':['cho','tyo'],
    'にゃ':['nya'], 'にゅ':['nyu'], 'にょ':['nyo'],
    'ひゃ':['hya'], 'ひゅ':['hyu'], 'ひょ':['hyo'],
    'みゃ':['mya'], 'みゅ':['myu'], 'みょ':['myo'],
    'りゃ':['rya'], 'りゅ':['ryu'], 'りょ':['ryo'],
    'ぎゃ':['gya'], 'ぎゅ':['gyu'], 'ぎょ':['gyo'],
    'じゃ':['ja','zi'], 'じゅ':['ju'], 'じょ':['jo'],
    'びゃ':['bya'], 'びゅ':['byu'], 'びょ':['byo'],
    'ぴゃ':['pya'], 'ぴゅ':['pyu'], 'ぴょ':['pyo'],
    'ふぁ':['fa'], 'ふぃ':['fi'], 'ふぇ':['fe'], 'ふぉ':['fo'],
    'うぃ':['wi'], 'うぇ':['we'], 'うぉ':['wo'],
    'てぃ':['ti'], 'でぃ':['di'], 'ちぇ':['che','tye'],
    'っ':['xtu','ltu'], 'ー':['-'], '-':['-'], ' ':[' ']
};

class TypingApp {
    constructor() {
        this.data = null;
        this.currentCategory = 'it_terms';
        this.state = "START"; 
        this.soundEnabled = false;
        this.targetLimit = 320;
        this.inactivityLimit = 120000;
        this.startTime = null;
        this.misses = 0;
        this.totalTypedCount = 0; 
        this.totalMissedCount = 0; 
        this.missMap = {};
        this.lastQuestion = null;
        this.init();
    }

    async init() {
        try {
            const res = await fetch('./data/weekly.json');
            this.data = await res.json();
            this.validateData();
        } catch (e) { console.error(e); }
        this.setupEventListeners();
        this.renderKeyboard();
    }

    validateData() {
        for (let cat in this.data.categories) {
            this.data.categories[cat].forEach((item, idx) => {
                if (/[一-龠々]/.test(item.kana)) console.error(`重大不備: ${cat} ${idx+1}: かなに漢字混入`);
            });
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.cat;
            });
        });
        document.getElementById('sound-toggle').addEventListener('click', (e) => {
            this.soundEnabled = !this.soundEnabled;
            e.target.innerText = `タイプ音: ${this.soundEnabled ? 'ON' : 'OFF'}`;
        });
        document.getElementById('start-btn').addEventListener('click', () => this.prepareReady());
        window.addEventListener('keydown', (e) => {
            if (e.key === " " && (this.state === "READY" || this.state === "PLAYING")) e.preventDefault();
            this.handleKeyDown(e);
        });
    }

    prepareReady() {
        this.state = "READY";
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        // ★準備画面：中央寄せ ＆ ガイド内包
        document.getElementById('typing-container').innerHTML = `
            <div class="ready-container">
                <div class="ready-text">スペースキーを押して開始</div>
                <div class="esc-guide-ready">中断して終了するには [Esc] キー</div>
            </div>`;
        this.highlightKey(' ');
    }

    startCountdown() {
        this.state = "COUNTDOWN";
        let count = 3;
        const area = document.getElementById('typing-container');
        area.innerHTML = `<div class="countdown-overlay">${count}</div>`;
        
        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                area.innerHTML = `<div class="countdown-overlay">${count}</div>`;
                if(this.soundEnabled) this.playSound(800, 0.1);
            } else {
                clearInterval(timer);
                this.startGame();
            }
        }, 1000);
    }

    startGame() {
        document.getElementById('typing-container').innerHTML = `
            <div class="text-wrapper-left">
                <div id="display-kanji"></div>
                <div id="display-kana"></div>
                <div class="romaji-scroll-window">
                    <div id="display-romaji" class="romaji-content"></div>
                </div>
            </div>`;
        this.state = "PLAYING";
        this.startTime = performance.now();
        this.lastInputTime = this.startTime;
        this.totalTypedCount = 0;
        this.totalMissedCount = 0;
        this.missMap = {};
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.nextQuestion();
        this.updateLoop();
    }

    nextQuestion() {
        if (this.totalTypedCount >= this.targetLimit) { this.endGame(); return; }
        const questions = this.data.categories[this.currentCategory];
        let available = questions.filter(q => q !== this.lastQuestion);
        const nextQ = available[Math.floor(Math.random() * available.length)];
        this.lastQuestion = nextQ;
        this.kanaList = this.splitKana(nextQ.kana);
        this.typedFullRomaji = ""; this.currentRomajiStr = "";
        document.getElementById('display-kanji').innerText = nextQ.kanji;
        document.getElementById('display-kana').innerText = nextQ.kana;
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
                let nr = ROMAJI_TABLE[tempKana[0]] ? ROMAJI_TABLE[tempKana[0]][0] : tempKana[0];
                future += nr[0];
            } else { future += (ROMAJI_TABLE[k] ? ROMAJI_TABLE[k][0] : k); }
        }
        this.guideRemainRomaji = best.substring(this.currentRomajiStr.length) + future;
        const next = this.guideRemainRomaji[0] || "";
        el.innerHTML = `<span class="typed">${this.typedFullRomaji.toUpperCase()}</span><span class="current">${next.toUpperCase()}</span><span>${this.guideRemainRomaji.substring(1).toUpperCase()}</span>`;
        const offset = el.querySelector('.typed').offsetWidth;
        el.style.transform = `translateX(-${offset}px)`;
        this.highlightKey(next);
    }

    handleKeyDown(e) {
        if (e.key === "Escape") { if (this.state !== "START") this.endGame("abort"); return; }
        if (this.state === "READY" && e.key === " ") { this.startCountdown(); return; }
        if (this.state !== "PLAYING" || e.key.length !== 1) return;
        this.lastInputTime = performance.now();
        const key = e.key.toLowerCase();
        let matches = this.pendingRomajiOptions.filter(o => o.startsWith(this.currentRomajiStr + key));
        if (matches.length > 0) {
            this.currentRomajiStr += key; this.typedFullRomaji += key;
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
    }

    triggerDamage() {
        const el = document.getElementById('typing-container');
        el.classList.add('damage-effect');
        setTimeout(() => el.classList.remove('damage-effect'), 50);
    }

    highlightKey(char) {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('highlight'));
        if (!char) return;
        let id = char === ' ' ? 'k-space' : `k-${char.toLowerCase()}`;
        const el = document.getElementById(id);
        if (el) el.classList.add('highlight');
    }

    logMiss(char) {
        if (!char) return;
        let c = char === '-' ? 'ー' : char.toUpperCase();
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
        const accNum = Math.floor(((this.totalTypedCount - this.totalMissedCount) / this.totalTypedCount) * 100);
        document.getElementById('wpm').innerText = cpm;
        document.getElementById('accuracy').innerText = (accNum < 0 ? 0 : accNum); // ％％バグの根絶
    }

    endGame(reason = "") {
        this.state = "RESULT";
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
        const resTitle = document.getElementById('result-title');
        const resScore = document.getElementById('res-score');
        const resRank = document.getElementById('result-rank');
        const resAcc = document.getElementById('res-acc');

        if(reason === "abort") {
            resTitle.innerText = "練習中止"; resScore.innerText = "---"; resRank.innerText = "評価不可"; resRank.style.color = "#95a5a6"; resAcc.innerText = "---";
            document.getElementById('res-time').innerText = "---"; document.getElementById('res-wpm').innerText = "---"; document.getElementById('res-miss').innerText = "---"; document.getElementById('res-total').innerText = "---";
        } else {
            resTitle.innerText = "練習結果";
            const sec = (performance.now() - this.startTime) / 1000;
            const cpm = Math.floor(this.totalTypedCount / (sec / 60)) || 0;
            const accNum = Math.floor(((this.totalTypedCount - this.totalMissedCount) / this.totalTypedCount) * 100);
            const score = Math.floor(cpm * ((accNum < 0 ? 0 : accNum)/100)**3);
            const rank = this.getRank(score);
            resScore.innerText = score; resRank.innerText = rank; resRank.style.color = "var(--accent)";
            document.getElementById('res-time').innerText = this.formatTime(performance.now() - this.startTime);
            document.getElementById('res-wpm').innerText = cpm;
            resAcc.innerText = (accNum < 0 ? 0 : accNum); // ％％バグ根絶
            document.getElementById('res-miss').innerText = this.totalMissedCount;
            document.getElementById('res-total').innerText = this.totalTypedCount + this.totalMissedCount;
            if (["SSS", "SS", "S", "A+", "A", "A-"].includes(rank)) resRank.classList.add('sparkle');
        }
        const sorted = Object.entries(this.missMap).sort((a,b)=>b[1]-a[1]);
        document.getElementById('miss-detail-list').innerHTML = sorted.length ? sorted.map(([k,v])=>`<div class="miss-item"><span class="miss-key">${k}</span><span class="miss-count">${v}回</span></div>`).join('') : "ミスなし！";
    }

    formatTime(ms) {
        if (isNaN(ms) || ms < 0) return "---";
        const m = Math.floor(ms/60000); const s = Math.floor((ms%60000)/1000); const p = Math.floor((ms%1000)/10);
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
        const layout = [["1","2","3","4","5","6","7","8","9","0","-","^"],["Q","W","E","R","T","Y","U","I","O","P","@"],["A","S","D","F","G","H","J","K","L",";",":","]"],["Shift","Z","X","C","V","B","N","M",",",".","/","Shift"],["Space"]];
        const container = document.getElementById('keyboard-container');
        container.innerHTML = "";
        layout.forEach((row, i) => {
            const rowEl = document.createElement('div'); rowEl.className = `keyboard-row row-${i}`;
            row.forEach(key => {
                const kEl = document.createElement('div'); kEl.className = 'key';
                if(key === "Space") kEl.classList.add('space');
                if(key === "Shift") kEl.classList.add('wide-shift');
                kEl.innerText = key; kEl.id = `k-${key === "Space" ? "space" : key.toLowerCase()}`;
                rowEl.appendChild(kEl);
            });
            container.appendChild(rowEl);
        });
    }

    playSound(f, d) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator(); const gain = this.audioCtx.createGain();
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.frequency.value = f; gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + d);
        osc.start(); osc.stop(this.audioCtx.currentTime + d);
    }
}
const app = new TypingApp();