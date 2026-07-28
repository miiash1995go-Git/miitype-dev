/**
 * ぱそトレ！ 5分間タイピングテスト ロジック (v20.7.28)
 */
class TypingTest {
    constructor() {
        this.questions = [];
        this.currentChunk = []; // 3〜4問の塊
        this.totalCharsTyped = 0;
        this.missCount = 0;
        this.correctKeys = 0;
        this.timeLeft = 300; // 5分
        this.timerId = null;
        this.isRunning = false;
        
        // 参照
        this.inputField = document.getElementById('test-input-field');
        this.displayArea = document.getElementById('test-question-display');
        
        this.init();
    }

    async init() {
        try {
            const res = await fetch('./data/typing/test_5min.json');
            const data = await res.json();
            this.questions = data.questions;
            
            document.getElementById('test-start-btn').onclick = () => this.startTest();
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') window.location.href = 'play.html';
            });
        } catch (e) { console.error("Data Load Error", e); }
    }

    startTest() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        this.isRunning = true;
        this.inputField.focus();
        this.nextSet();
        this.startTimer();
        
        this.inputField.oninput = () => this.checkInput();
    }

    startTimer() {
        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateUI();
            if (this.timeLeft <= 0) this.endTest();
        }, 1000);
    }

    nextSet() {
        // シャッフルして4つの質問を抽出
        this.currentChunk = [];
        const temp = [...this.questions].sort(() => Math.random() - 0.5);
        this.currentChunk = temp.slice(0, 4);
        
        this.renderQuestions();
        this.inputField.value = '';
        this.currentSentenceIndex = 0;
    }

    renderQuestions() {
        this.displayArea.innerHTML = this.currentChunk.map((q, i) => 
            `<div id="sentence-${i}" class="test-line">${this.wrapChars(q.kanji)}</div>`
        ).join('');
        this.activeLineChars = this.displayArea.querySelectorAll(`#sentence-${this.currentSentenceIndex} span`);
    }

    wrapChars(text) {
        return text.split('').map(c => `<span>${c}</span>`).join('');
    }

    checkInput() {
        if (!this.isRunning) return;
        const typed = this.inputField.value;
        const target = this.currentChunk[this.currentSentenceIndex].kanji;

        // 一致する文字まで色を変える
        let matchLen = 0;
        for (let i = 0; i < typed.length; i++) {
            if (typed[i] === target[i]) {
                this.activeLineChars[i].classList.add('char-correct');
                matchLen++;
            } else {
                // ミス判定（最後の1文字が違う場合）
                if (i === typed.length - 1) this.missCount++;
                break;
            }
        }

        // 1文完成
        if (typed === target) {
            this.totalCharsTyped += target.length;
            this.currentSentenceIndex++;
            this.inputField.value = '';
            
            if (this.currentSentenceIndex >= this.currentChunk.length) {
                this.nextSet();
            } else {
                this.activeLineChars = this.displayArea.querySelectorAll(`#sentence-${this.currentSentenceIndex} span`);
            }
            this.updateUI();
        }
    }

    updateUI() {
        const min = Math.floor(this.timeLeft / 60);
        const sec = this.timeLeft % 60;
        document.getElementById('test-timer').innerText = `${min}:${sec.toString().padStart(2, '0')}`;
        document.getElementById('test-char-count').innerText = this.totalCharsTyped;
    }

    endTest() {
        this.isRunning = false;
        clearInterval(this.timerId);
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');

        const acc = this.totalCharsTyped > 0 ? (100 - (this.missCount / this.totalCharsTyped * 100)).toFixed(1) : 0;
        const rank = this.getRank(this.totalCharsTyped);

        document.getElementById('res-rank').innerText = rank;
        document.getElementById('res-total_chars').innerText = this.totalCharsTyped;
        document.getElementById('res-accuracy').innerText = acc;
        document.getElementById('res-misses').innerText = this.missCount;
        document.getElementById('res-comment').innerText = this.getComment(rank);
    }

    getRank(s) {
        if(s >= 1200) return "Master";
        if(s >= 1000) return "S";
        if(s >= 800) return "A";
        if(s >= 600) return "B";
        if(s >= 400) return "C";
        return "D";
    }

    getComment(rank) {
        const comments = {
            "Master": "卓越した技術です。実務において圧倒的な生産性を発揮できるでしょう。",
            "S": "非常に高いスキルです。自信を持って仕事に取り組めます。",
            "A": "合格ラインです。一般的な事務職として十分な速度を備えています。",
            "B": "実務の基本レベルです。さらなる正確性を磨きましょう。",
            "C": "基礎はできています。ホームポジションを再確認してください。",
            "D": "まずは正確に入力することから始めましょう。"
        };
        return comments[rank];
    }
}
new TypingTest();