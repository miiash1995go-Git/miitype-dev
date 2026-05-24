/**
 * EduTyping Next - Professional Logic v8.1
 * 同期バグ ＆ 最後の一文字バグ 修正版
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
    'じゃ':['ja','ziya'], 'じゅ':['ju','ziyu'], 'じょ':['jo','ziyo'],
    'びゃ':['bya'], 'びゅ':['byu'], 'びょ':['byo'],
    'ぴゃ':['pya'], 'ぴゅ':['pyu'], 'ぴょ':['pyo'],
    'ふぁ':['fa'], 'ふぃ':['fi'], 'ふぇ':['fe'], 'ふぉ':['fo'],
    'うぃ':['wi'], 'うぇ':['we'], 'うぉ':['wo'],
    'てぃ':['ti'], 'でぃ':['di'], 'ー':['-'], ' ':[' ']
};

class TypingApp {
    constructor() {
        this.data = null;
        this.currentCategory = 'business';
        this.state = "START";
        
        this.kanaList = [];
        this.pendingRomajiOptions = [];
        this.currentRomajiStr = "";
        this.typedFullRomaji = "";
        this.guideRemainRomaji = "";

        this.startTime = 0;
        this.lastInputTime = 0;
        this.misses = 0;
        this.totalTypedCount = 0;
        this.cumTypedCount = 0;
        this.targetLimit = 350;
        this.maxTimeLimit = 240000;
        this.inactivityLimit = 120000;
        
        this.missMap = {};
        this.audioCtx = null;
        this.timerInterval = null;

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
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    startGame() {
        this.state = "PLAYING";
        const now = performance.now();
        this.startTime = now;
        this.lastInputTime = now;
        this.misses = 0;
        this.totalTypedCount = 0;
        this.cumTypedCount = 0;
        this.missMap = {};
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        this.nextQuestion();
        this.updateLoop();
    }

    nextQuestion() {
        const now = performance.now();
        if (this.cumTypedCount >= this.targetLimit || (now - this.startTime) >= this.maxTimeLimit) {
            this.endGame();
            return;
        }

        const questions = this.data.categories[this.currentCategory];
        const nextQ = questions[Math.floor(Math.random() * questions.length)];
        
        // データの同期をとる
        this.currentQuestion = nextQ; 
        document.getElementById('display-kanji').innerText = nextQ.kanji;
        document.getElementById('display-kana').innerText = nextQ.kana;
        
        this.kanaList = this.splitKana(nextQ.kana);
        this.typedFullRomaji = "";
        this.currentRomajiStr = "";
        
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
            this.nextQuestion();
            return;
        }

        let char = this.kanaList.shift();
        
        if (char === 'ん' && this.kanaList.length > 0) {
            let nextKana = this.kanaList[0];
            let nextFirsts = ROMAJI_TABLE[nextKana] ? ROMAJI_TABLE[nextKana].map(opt => opt[0]) : [];
            if (nextFirsts.length > 0 && nextFirsts.every(f => !['a','i','u','e','o','y','n'].includes(f))) {
                this.pendingRomajiOptions = ['n', 'nn', 'xn'];
            } else {
                this.pendingRomajiOptions = ['nn', 'xn'];
            }
        } 
        else if (char === 'っ' && this.kanaList.length > 0) {
            let nextKana = this.kanaList[0];
            let nextFirst = ROMAJI_TABLE[nextKana] ? ROMAJI_TABLE[nextKana][0][0] : "";
            this.pendingRomajiOptions = nextFirst ? [nextFirst, 'ltu', 'xtu'] : ['ltu', 'xtu'];
        } 
        else {
            this.pendingRomajiOptions = [...(ROMAJI_TABLE[char] || [char])];
        }

        this.currentRomajiStr = "";
        this.refreshDisplay();
    }

    refreshDisplay() {
        let currentBestOption = this.pendingRomajiOptions.find(opt => opt.startsWith(this.currentRomajiStr)) || this.pendingRomajiOptions[0];
        let currentRemain = currentBestOption.substring(this.currentRomajiStr.length);
        
        let futureRemain = "";
        this.kanaList.forEach(k => { futureRemain += ROMAJI_TABLE[k] ? ROMAJI_TABLE[k][0] : k; });
        
        this.guideRemainRomaji = currentRemain + futureRemain;

        const area = document.getElementById('display-romaji');
        const nextKeyGuide = this.guideRemainRomaji[0] || "";
        area.innerHTML = `<span class="typed">${this.typedFullRomaji}</span><span class="current">${nextKeyGuide}</span><span>${this.guideRemainRomaji.substring(1)}</span>`;
        
        this.highlightKey(nextKeyGuide);
    }

    handleKeyDown(e) {
        if (this.state !== "PLAYING" || e.key.length !== 1) return;
        this.lastInputTime = performance.now();
        const key = e.key.toLowerCase();

        let matches = this.pendingRomajiOptions.filter(opt => opt.startsWith(this.currentRomajiStr + key));

        if (matches.length > 0) {
            this.currentRomajiStr += key;
            this.typedFullRomaji += key;
            this.totalTypedCount++;
            this.cumTypedCount++;
            this.pendingRomajiOptions = matches;
            this.playSound(600, 0.05);

            if (this.pendingRomajiOptions.includes(this.currentRomajiStr)) {
                this.prepareNextChar();
            } else {
                this.refreshDisplay();
            }
        } else {
            this.misses++;
            let expected = this.guideRemainRomaji[0];
            this.logMiss(expected);
            this.playSound(200, 0.1);
            this.flashError();
        }
        this.updateStats();
    }

    updateLoop() {
        if (this.state !== "PLAYING") return;
        const now = performance.now();
        if (now - this.lastInputTime > this.inactivityLimit) {
            this.endGame("inactivity");
            return;
        }
        this.timerInterval = requestAnimationFrame(() => this.updateLoop());
    }

    updateStats() {
        const elapsedSec = (performance.now() - this.startTime) / 1000;
        const wpm = elapsedSec > 0 ? Math.floor((this.totalTypedCount / 5) / (elapsedSec / 60)) : 0;
        const acc = this.totalTypedCount > 0 ? Math.floor(((this.totalTypedCount - this.misses) / this.totalTypedCount) * 100) : 100;
        document.getElementById('wpm').innerText = wpm;
        document.getElementById('accuracy').innerText = acc;
    }

    endGame(reason = "") {
        this.state = "RESULT";
        cancelAnimationFrame(this.timerInterval);
        const totalTimeMs = performance.now() - this.startTime;
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
        if(reason === "inactivity") document.getElementById('result-title').innerText = "練習終了 (放置中断)";
        const wpm = parseInt(document.getElementById('wpm').innerText);
        const acc = parseInt(document.getElementById('accuracy').innerText);
        const score = Math.floor(wpm * (acc/100)**2);
        document.getElementById('res-score').innerText = score;
        document.getElementById('res-time').innerText = this.formatTimeResult(totalTimeMs);
        document.getElementById('res-wpm').innerText = wpm;
        document.getElementById('res-acc').innerText = acc;
        document.getElementById('res-miss').innerText = this.misses;
        document.getElementById('result-rank').innerText = this.getRank(score);
        const weak = Object.entries(this.missMap).sort((a,b)=>b[1]-a[1]).slice(0,3);
        document.getElementById('res-weak').innerHTML = weak.length ? weak.map(w => `<span class="key-box">${w[0].toUpperCase()}</span>`).join('') : "なし";
    }

    formatTimeResult(ms) {
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const msP = Math.floor((ms % 1000) / 10);
        return `${m}分${s}秒${msP}`;
    }

    getRank(s) {
        if(s >= 400) return "SSS"; if(s >= 370) return "SS"; if(s >= 340) return "S";
        if(s >= 310) return "A+"; if(s >= 280) return "A"; if(s >= 250) return "A-";
        if(s >= 220) return "B+"; if(s >= 190) return "B"; if(s >= 160) return "B-";
        if(s >= 130) return "C+"; if(s >= 100) return "C"; if(s >= 80) return "C-";
        if(s >= 60) return "D+"; if(s >= 40) return "D"; if(s >= 20) return "D-";
        if(s >= 15) return "E+"; if(s >= 10) return "E"; return "E-";
    }

    renderKeyboard() {
        const keys = "1234567890-^qwertyuiopasdfghjkl;zxcvbnm,./";
        const container = document.getElementById('keyboard');
        keys.split('').forEach(k => {
            const el = document.createElement('div');
            el.className = 'key'; el.id = `key-${k}`;
            el.innerText = k.toUpperCase();
            container.appendChild(el);
        });
    }

    highlightKey(char) {
        document.querySelectorAll('.key').forEach(k => k.classList.remove('highlight'));
        if (!char) return;
        const el = document.getElementById(`key-${char.toLowerCase()}`);
        if (el) el.classList.add('highlight');
    }

    logMiss(char) {
        if (!char) return;
        this.missMap[char] = (this.missMap[char] || 0) + 1;
    }

    flashError() {
        const area = document.getElementById('game-screen');
        area.style.backgroundColor = '#fff5f5';
        setTimeout(() => area.style.backgroundColor = 'transparent', 100);
    }

    playSound(freq, duration) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        osc.start(); osc.stop(this.audioCtx.currentTime + duration);
    }
}
const app = new TypingApp();