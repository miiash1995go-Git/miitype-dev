/**
 * EduTyping Next - Professional Logic v9.3
 * 修正：ガイド文字列の「拗音（ちぇ等）」先読み対応
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
    'てぃ':['ti'], 'でぃ':['di'], 'ちぇ':['che','tye'], 'っ':['xtu','ltu'], 'ー':['-'], '-':['-'], ' ':[' ']
};

class TypingApp {
    constructor() {
        this.data = null;
        this.currentCategory = 'it_terms';
        this.state = "START";
        this.soundEnabled = true;
        this.targetLimit = 320;
        this.inactivityLimit = 120000;
        this.init();
    }

    async init() {
        try {
            const res = await fetch('./data/weekly.json');
            this.data = await res.json();
        } catch (e) { console.error(e); }
        this.setupEventListeners();
        this.renderKeyboard();
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
        document.getElementById('typing-container').innerHTML = '<div class="ready-text">スペースキーを押して開始</div>';
        this.highlightKey(' ');
    }

    startCountdown() {
        this.state = "COUNTDOWN";
        let count = 3;
        const area = document.getElementById('typing-container');
        const timer = setInterval(() => {
            if (count > 0) {
                area.innerHTML = `<div class="countdown-overlay">${count}</div>`;
                if(this.soundEnabled) this.playSound(800, 0.1);
                count--;
            } else {
                clearInterval(timer);
                this.startGame();
            }
        }, 1000);
    }

    startGame() {
        document.getElementById('typing-container').innerHTML = '<div id="display-kanji"></div><div id="display-kana"></div><div id="display-romaji"></div>';
        this.state = "PLAYING";
        this.startTime = performance.now();
        this.lastInputTime = this.startTime;
        this.misses = 0; this.totalTypedCount = 0; this.cumTypedCount = 0;
        this.missMap = {};
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.nextQuestion();
        this.updateLoop();
    }

    nextQuestion() {
        if (this.cumTypedCount >= this.targetLimit) { this.endGame(); return; }
        const questions = this.data.categories[this.currentCategory];
        const nextQ = questions[Math.floor(Math.random() * questions.length)];
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
            let nextK = this.kanaList[0];
            let nextF = ROMAJI_TABLE[nextK] ? ROMAJI_TABLE[nextK].map(o => o[0]) : [];
            this.pendingRomajiOptions = (nextF.every(f => !['a','i','u','e','o','y','n'].includes(f))) ? ['n','nn','xn'] : ['nn','xn'];
        } else if (char === 'っ' && this.kanaList.length > 0) {
            let nextK = this.kanaList[0];
            let nextF = ROMAJI_TABLE[nextK] ? ROMAJI_TABLE[nextK][0][0] : "";
            this.pendingRomajiOptions = nextF ? [nextF, 'xtu', 'ltu'] : ['xtu','ltu'];
        } else {
            this.pendingRomajiOptions = [...(ROMAJI_TABLE[char] || [char])];
        }
        this.currentRomajiStr = ""; this.refreshDisplay();
    }

    refreshDisplay() {
        if (this.state !== "PLAYING") return;
        let best = this.pendingRomajiOptions.find(o => o.startsWith(this.currentRomajiStr)) || this.pendingRomajiOptions[0];
        
        // 残りのかなリストからも「拗音」や「促音」を正しく解析してガイドを作る
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
        const next = this.guideRemainRomaji[0] || "";
        document.getElementById('display-romaji').innerHTML = `<span class="typed">${this.typedFullRomaji}</span><span class="current">${next}</span><span>${this.guideRemainRomaji.substring(1)}</span>`;
        this.highlightKey(next);
    }

    handleKeyDown(e) {
        if (this.state === "READY" && e.key === " ") { this.startCountdown(); return; }
        if (this.state !== "PLAYING" || e.key.length !== 1) return;
        if (e.key === "Escape") { this.endGame("abort"); return; }
        
        this.lastInputTime = performance.now();
        const key = e.key.toLowerCase();
        let matches = this.pendingRomajiOptions.filter(o => o.startsWith(this.currentRomajiStr + key));

        if (matches.length > 0) {
            this.currentRomajiStr += key; this.typedFullRomaji += key;
            this.totalTypedCount++; this.cumTypedCount++;
            this.pendingRomajiOptions = matches;
            if(this.soundEnabled) this.playSound(600, 0.05);
            if (this.pendingRomajiOptions.includes(this.currentRomajiStr)) this.prepareNextChar();
            else this.refreshDisplay();
        } else {
            this.misses++;
            this.logMiss(this.guideRemainRomaji[0]);
            if(this.soundEnabled) this.playSound(200, 0.1);
            this.triggerDamage();
        }
        this.updateStats();
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
        if (performance.now() - this.lastInputTime > this.inactivityLimit) { this.endGame("inactivity"); return; }
        requestAnimationFrame(() => this.updateLoop());
    }

    updateStats() {
        const sec = (performance.now() - this.startTime) / 1000;
        const cpm = sec > 0 ? Math.floor(this.totalTypedCount / (sec / 60)) : 0;
        const acc = this.totalTypedCount > 0 ? Math.floor(((this.totalTypedCount - this.misses) / this.totalTypedCount) * 100) : 100;
        document.getElementById('wpm').innerText = cpm;
        document.getElementById('accuracy').innerText = acc;
    }

    endGame(reason = "") {
        this.state = "RESULT";
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
        const resTitle = document.getElementById('result-title');
        const resScore = document.getElementById('res-score');
        const resRank = document.getElementById('result-rank');

        if(reason === "abort") {
            resTitle.innerText = "練習中止"; resScore.innerText = "---"; resRank.innerText = "評価不可";
        } else {
            resTitle.innerText = "練習結果";
            const cpm = parseInt(document.getElementById('wpm').innerText);
            const acc = parseInt(document.getElementById('accuracy').innerText);
            const score = Math.floor(cpm * (acc/100)**3);
            resScore.innerText = score; resRank.innerText = this.getRank(score);
        }
        document.getElementById('res-time').innerText = this.formatTime(performance.now() - this.startTime);
        document.getElementById('res-wpm').innerText = document.getElementById('wpm').innerText;
        document.getElementById('res-acc').innerText = document.getElementById('accuracy').innerText;
        document.getElementById('res-miss').innerText = this.misses;
        const sorted = Object.entries(this.missMap).sort((a,b)=>b[1]-a[1]);
        document.getElementById('miss-detail-list').innerHTML = sorted.length ? sorted.map(([k,v])=>`<div class="miss-item"><span class="miss-key">${k}</span><span>${v}回</span></div>`).join('') : "ミスなし！";
    }

    formatTime(ms) {
        const m = Math.floor(ms/60000); const s = Math.floor((ms%60000)/1000); const p = Math.floor((ms%1000)/10);
        return `${m}分${s}秒${p}`;
    }

    getRank(s) {
        if(s >= 400) return "SSS"; if(s >= 370) return "SS"; if(s >= 340) return "S";
        if(s >= 300) return "A+"; if(s >= 260) return "A"; if(s >= 220) return "A-";
        if(s >= 190) return "B+"; if(s >= 160) return "B"; if(s >= 130) return "B-";
        if(s >= 100) return "C+"; if(s >= 80) return "C"; if(s >= 60) return "C-";
        return "D";
    }

    renderKeyboard() {
        const layout = [["1","2","3","4","5","6","7","8","9","0","-","^"],["Q","W","E","R","T","Y","U","I","O","P","@"],["A","S","D","F","G","H","J","K","L",";",":","]"],["Shift","Z","X","C","V","B","N","M",",",".","/","Shift"],["Space"]];
        const container = document.getElementById('keyboard-container');
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