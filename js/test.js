/**
 * ぱそトレ！ 5分間タイピングテスト 試験エンジン (v20.7.28)
 */
class TypingExam {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.totalChars = 0;
        this.missCount = 0;
        this.startTime = null;
        this.timeLeft = 300; // 5分
        this.timerId = null;
        this.isStarted = false;
        
        // UI参照
        this.realInput = document.getElementById('test-real-input');
        this.sampleBox = document.getElementById('sample-box');
        this.inputViewBox = document.getElementById('input-view-box');
        
        this.init();
    }

    async init() {
        try {
            const res = await fetch('./data/typing/test_5min.json');
            const data = await res.json();
            // 試験用にシャッフル
            this.questions = data.questions.sort(() => Math.random() - 0.5);
            
            document.getElementById('test-start-btn').onclick = () => this.startExam();
            
            // IME制御とキー監視
            this.setupInputEvents();
        } catch (e) { console.error("試験データの読み込みに失敗しました", e); }
    }

    startExam() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        this.isStarted = true;
        this.startTime = Date.now();
        this.renderNextQuestion();
        this.startTimer();
        this.focusInput();
    }

    setupInputEvents() {
        // 常に入力欄をフォーカス
        document.addEventListener('click', () => { if(this.isStarted) this.focusInput(); });
        
        // Escキーで中断
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.location.href = 'play.html';
        });

        // IMEイベントハンドラ
        this.realInput.addEventListener('compositionend', (e) => {
            this.evaluateString(e.data);
            this.realInput.value = ''; // 確定後に物理フィールドを空にする
        });

        // 誤入力（正確率用）の簡易検知
        this.realInput.addEventListener('keydown', (e) => {
            if (this.isStarted && e.key === 'Enter') {
                // 確定前のEnter等での空送信を防止
            }
        });
    }

    focusInput() { this.realInput.focus(); }

    renderNextQuestion() {
        this.currentText = this.questions[this.currentIndex].kanji;
        this.sampleBox.innerText = this.currentText;
        
        // 入力表示エリアを黒文字で初期化
        this.progress = 0;
        this.updateInputView();
    }

    updateInputView() {
        const done = this.currentText.substring(0, this.progress);
        const remain = this.currentText.substring(this.progress);
        
        let html = `<span class="char-done">${done}</span>`;
        if (remain.length > 0) {
            html += `<span class="char-current-caret"></span><span>${remain}</span>`;
        }
        this.inputViewBox.innerHTML = html;
    }

    evaluateString(committedStr) {
        if (!this.isStarted) return;
        
        const targetPart = this.currentText.substring(this.progress, this.progress + committedStr.length);
        
        if (committedStr === targetPart) {
            // 正解
            this.progress += committedStr.length;
            this.totalChars += committedStr.length;
            this.updateInputView();
            document.getElementById('test-char-count').innerText = this.totalChars;

            // 文章完了判定
            if (this.progress >= this.currentText.length) {
                this.isTransitioning = true;
                setTimeout(() => {
                    this.currentIndex = (this.currentIndex + 1) % this.questions.length;
                    this.renderNextQuestion();
                    this.isTransitioning = false;
                }, 1000); // 1秒のインターバル
            }
        } else {
            // ミス（完全一致しない場合は進ませない）
            this.missCount++;
            // 視覚的フィードバック（必要ならここに追加可能だが、今は静寂を優先）
        }
    }

    startTimer() {
        this.timerId = setInterval(() => {
            this.timeLeft--;
            const min = Math.floor(this.timeLeft / 60);
            const sec = this.timeLeft % 60;
            document.getElementById('test-timer').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            
            if (this.timeLeft <= 0) this.endExam();
        }, 1000);
    }

    endExam() {
        this.isStarted = false;
        clearInterval(this.timerId);
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');

        // 結果計算
        const accuracy = this.totalChars > 0 ? (100 - (this.missCount / this.totalChars * 100)).toFixed(1) : "0.0";
        const cpm = Math.floor(this.totalChars / 5); // 5分間なので5で割る
        const rank = this.calculateRank(this.totalChars);

        document.getElementById('res-rank').innerText = rank;
        document.getElementById('res-total-chars').innerText = this.totalChars;
        document.getElementById('res-accuracy').innerText = accuracy;
        document.getElementById('res-cpm').innerText = cpm;
        document.getElementById('res-comment').innerText = this.getComment(rank);
    }

    calculateRank(chars) {
        if(chars >= 1400) return "Legend";
        if(chars >= 1200) return "Master";
        if(chars >= 1000) return "S";
        if(chars >= 800)  return "A";
        if(chars >= 600)  return "B";
        if(chars >= 400)  return "C";
        return "D";
    }

    getComment(rank) {
        const list = {
            "Legend": "もはや教えることはありません。プロのタイピストとして自信を持ってください。",
            "Master": "卓越した技術です。どのような事務現場でも圧倒的な信頼を得られるでしょう。",
            "S": "非常に高い入力能力です。実務において速度が壁になることはありません。",
            "A": "合格ラインです。正確性を維持できれば即戦力として十分に活躍できます。",
            "B": "実務の基本レベルです。変換前に一呼吸置くことで、さらに正確性が向上します。",
            "C": "基礎は身についています。毎日1回このテストを継続して、指を慣らしましょう。",
            "D": "まずはホームポジションを再確認し、正確に入力することを意識してください。"
        };
        return list[rank] || "お疲れ様でした。";
    }
}
new TypingExam();