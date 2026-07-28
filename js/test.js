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
        this.visualText = document.getElementById('test-visual-text');
        
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
        // クリックで入力を強制フォーカス
        document.addEventListener('click', () => { 
            if(this.isStarted && !this.isTransitioning) this.focusInput(); 
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.location.href = 'play.html';
        });

        // IME入力・確定イベントの統合監視
        this.isComposing = false;
        // 変換開始：キャレットを隠す（IME側の下線が出るため）
        this.realInput.addEventListener('compositionstart', () => { 
            this.isComposing = true; 
            // opacityは0のまま、枠線なしの状態でIME候補窓のみを表示させる
            const caret = this.visualText.querySelector('.char-current-caret');
            if (caret) caret.style.visibility = 'hidden';
        });
        this.realInput.addEventListener('compositionend', (e) => {
            this.isComposing = false;
            // 確定された文字列を評価
            this.evaluateString(e.data);
            this.realInput.value = ''; 
        });

        // 直接入力（英数）や削除の監視
        this.realInput.addEventListener('input', (e) => {
            if (!this.isComposing && e.inputType !== 'deleteContentBackward') {
                if (this.realInput.value.length > 0) {
                    this.evaluateString(this.realInput.value);
                    this.realInput.value = '';
                }
            }
        });
    }

    focusInput() { this.realInput.focus(); }

    renderNextQuestion() {
        if (this.questions.length === 0) return;
        this.currentText = this.questions[this.currentIndex].kanji;
        
        // 1. サンプルエリア：お手本を黒文字で表示
        this.sampleBox.innerHTML = `<span>${this.currentText}</span>`;
        
        // 2. 入力エリア：完全に空にする
        this.progress = 0;
        this.inputContent = ''; 
        this.composingText = '';
        this.isComposing = false;
        this.updateDisplays();
    }

    updateDisplays() {
        // ① サンプルエリア：確定済みはグレー、未入力は黒
        const done = this.currentText.substring(0, this.progress);
        const remain = this.currentText.substring(this.progress);
        this.sampleBox.innerHTML = `<span class="char-done">${done}</span><span>${remain}</span>`;

        // ② 入力エリア：visualText レイヤーのみを更新（input要素を消さない）
        let inputHtml = `<span class="char-confirmed">${this.inputContent}</span>`;
        if (this.isComposing) {
            // 変換中はIMEの文字が出るため、ここでの表示は最小限（キャレットのみ等）にする
        }
        inputHtml += `<span class="char-current-caret"></span>`;
        this.visualText.innerHTML = inputHtml;

        // IME候補窓を「現在の入力位置」へ追従させる
        const caret = this.visualText.querySelector('.char-current-caret');
        if (caret && this.realInput) {
            this.realInput.style.left = caret.offsetLeft + 'px';
            this.realInput.style.top = caret.offsetTop + 'px';
            
            // 右端の壁（920px）までの残り幅を計算し、IME窓がはみ出さないように制限
            const remainingWidth = 920 - caret.offsetLeft;
            this.realInput.style.width = Math.max(remainingWidth, 100) + 'px';
        }
    }

    setupInputEvents() {
        document.addEventListener('click', () => { 
            if(this.isStarted && !this.isTransitioning) this.focusInput(); 
        });
        
        // 1. 画面全体の監視（Escキーの挙動を状況に応じて分岐）
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isStarted) {
                    // テスト中：中断して結果画面（判定不可）へ
                    this.endExam(true);
                } else {
                    // テスト開始前：play.html（カテゴリ選択）へ戻る
                    window.location.href = 'play.html';
                }
            }
        });

        // 2. 入力欄自体の監視（IME非変換時のEsc ＆ 確定文字の削除を拾う）
        this.realInput.addEventListener('keydown', (e) => {
            if (this.isStarted && !this.isComposing) {
                // Escキー：中断処理
                if (e.key === 'Escape') {
                    this.endExam(true);
                }
                
                // Backspaceキー：確定済み文字の修正ロジック（ここを追加）
                else if (e.key === 'Backspace' && this.realInput.value === '') {
                    if (this.progress > 0) {
                        // 1文字分、時計の針を戻す
                        this.progress--;
                        this.totalChars--;
                        this.inputContent = this.inputContent.slice(0, -1);
                        
                        // 統計表示とUIを更新
                        document.getElementById('test-char-count').innerText = this.totalChars;
                        this.updateDisplays();
                    }
                }
            }
        });

        this.isComposing = false;
        
        // 変換開始：本物の入力口を可視化し、自作キャレットを隠す
        this.realInput.addEventListener('compositionstart', () => { 
            this.isComposing = true; 
            this.realInput.style.opacity = '1'; 
            const caret = this.visualText.querySelector('.char-current-caret');
            if (caret) caret.style.visibility = 'hidden';
        });

        this.realInput.addEventListener('compositionupdate', (e) => {
            // OS側の描画に任せるため空で維持
        });

        // 変換確定：本物の入力口を再び隠し、自作キャレットを戻す
        this.realInput.addEventListener('compositionend', (e) => {
            this.isComposing = false;
            this.realInput.style.opacity = '0'; 
            const caret = this.visualText.querySelector('.char-current-caret');
            if (caret) caret.style.visibility = 'visible';
            
            this.evaluateString(e.data);
            this.realInput.value = ''; 
        });

        this.realInput.addEventListener('input', (e) => {
            if (!this.isComposing) {
                if (e.inputType === 'deleteContentBackward') {
                    this.inputContent = this.inputContent.slice(0, -1);
                } else if (this.realInput.value.length > 0) {
                    this.evaluateString(this.realInput.value);
                    this.realInput.value = '';
                }
                this.updateDisplays();
            }
        });
    }

    evaluateString(committedStr) {
        if (!this.isStarted || this.isTransitioning || !committedStr) return;
        let matchedAny = false;
        let hasError = false;

        for (let i = 0; i < committedStr.length; i++) {
            const char = committedStr[i];
            const targetChar = this.currentText[this.progress];
            if (char === targetChar) {
                this.progress++;
                this.totalChars++;
                this.inputContent += char;
                matchedAny = true;
            } else {
                this.missCount++;
                hasError = true;
                break;
            }
        }

        if (hasError) this.triggerDamageEffect();
        if (matchedAny) {
            document.getElementById('test-char-count').innerText = this.totalChars;
            if (this.progress >= this.currentText.length) {
                this.isTransitioning = true;
                setTimeout(() => {
                    this.currentIndex = (this.currentIndex + 1) % this.questions.length;
                    this.renderNextQuestion();
                    this.isTransitioning = false;
                    this.focusInput();
                }, 1000);
            }
        }
        this.updateDisplays();
    }

    triggerDamageEffect() {
        const box = this.inputViewBox;
        if (box) {
            box.classList.add('damage-effect');
            setTimeout(() => box.classList.remove('damage-effect'), 100);
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

    // 中断フラグ (isAborted) に対応
    endExam(isAborted = false) {
        this.isStarted = false;
        clearInterval(this.timerId);
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');

        const resRank = document.getElementById('res-rank');

        if (isAborted) {
            // 【指示通り：中断時の結果表示】
            resRank.innerText = "判定不可";
            // 主張を抑えたサイズと灰色（#94a3b8）に変更
            resRank.style.fontSize = "3.8rem";
            resRank.style.color = "#94a3b8"; 
            
            document.getElementById('res-total-chars').innerText = "---";
            document.getElementById('res-accuracy').innerText = "---";
            document.getElementById('res-cpm').innerText = "---";
            document.getElementById('res-comment').innerText = ""; 
        } else {
            const accuracy = this.totalChars > 0 ? (100 - (this.missCount / this.totalChars * 100)).toFixed(1) : "0.0";
            const cpm = Math.floor(this.totalChars / 5);
            const rank = this.calculateRank(this.totalChars);

            resRank.innerText = rank;
            resRank.style.fontSize = "6.5rem"; 
            resRank.style.color = "#2563eb"; // 通常時は青色
            
            document.getElementById('res-total-chars').innerText = this.totalChars;
            document.getElementById('res-accuracy').innerText = accuracy;
            document.getElementById('res-cpm').innerText = cpm;
            document.getElementById('res-comment').innerText = this.getComment(rank);
        }
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