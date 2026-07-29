/**
 * ぱそトレ！ 5分間タイピングテスト 試験エンジン (v20.7.29.Ultimate)
 * ------------------------------------------------------------
 * 【実装済み機能】
 * 1. ハイブリッド・インプット（変換中可視化）
 * 2. 前方一致・部分受理ロジック
 * 3. 確定済み文字のBackspace修正（逆流処理）
 * 4. 5カテゴリ出題管理（連続出題禁止）
 * 5. 精密ランク判定（19段階）＆ 1行アドバイス
 * 6. エラー時ダメージエフェクト
 * ============================================================
 */

class TypingExam {
    constructor() {
        this.questionPool = {};     // カテゴリ分けされた全問題
        this.lastCategoryId = null; // 直前の出題カテゴリID
        this.currentIndex = 0;
        this.totalChars = 0;
        this.missCount = 0;
        this.startTime = null;
        this.timeLeft = 300; // 5分
        this.timerId = null;
        this.isStarted = false;
        this.isTransitioning = false;
        this.inputContent = ''; 
        this.composingText = '';
        this.isComposing = false;
        
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
            // カテゴリごとにデータを保持
            this.questionPool = data.categories;
            
            document.getElementById('test-start-btn').onclick = () => this.startExam();
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

    // カテゴリの重複を避けつつランダムに1問選出する
    pickNextQuestion() {
        const catIds = Object.keys(this.questionPool);
        // 直前のカテゴリID以外から抽選
        const availableCats = catIds.filter(id => id !== this.lastCategoryId);
        const selectedCatId = availableCats[Math.floor(Math.random() * availableCats.length)];
        
        const pool = this.questionPool[selectedCatId];
        const rawQuestion = pool[Math.floor(Math.random() * pool.length)];
        
        // 【重要】データ末尾の不要な空白を削除して、タイピングの中断を防止
        const sanitizedQuestion = {
            kanji: rawQuestion.kanji.trim(),
            kana: rawQuestion.kana.trim()
        };
        
        this.lastCategoryId = selectedCatId;
        return sanitizedQuestion;

    renderNextQuestion() {
        const q = this.pickNextQuestion();
        this.currentText = q.kanji;
        
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

        // ② 入力エリア：確定済み文字 ＋ キャレットのみ表示
        let inputHtml = `<span class="char-confirmed">${this.inputContent}</span>`;
        inputHtml += `<span class="char-current-caret"></span>`;
        this.visualText.innerHTML = inputHtml;

        // IME候補窓の位置を、青いキャレットの位置にミリ単位で同期
        const caret = this.visualText.querySelector('.char-current-caret');
        if (caret && this.realInput) {
            this.realInput.style.left = caret.offsetLeft + 'px';
            this.realInput.style.top = caret.offsetTop + 'px';
            
            // 右端（約920px）までの残り幅を計算し、IME窓の突き抜けを防止
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
                    this.endExam(true); // テスト中なら結果画面へ
                } else {
                    window.location.href = 'play.html'; // 開始前なら戻る
                }
            }
        });

        // 2. 入力欄自体の監視（中断 ＆ 確定済み文字のBackspace修正）
        this.realInput.addEventListener('keydown', (e) => {
            if (this.isStarted && !this.isComposing) {
                // Escキー
                if (e.key === 'Escape') {
                    this.endExam(true);
                }
                // Backspaceキー：確定済みエリアへの逆流修正
                else if (e.key === 'Backspace' && this.realInput.value === '') {
                    if (this.progress > 0) {
                        this.progress--;
                        this.totalChars--;
                        this.inputContent = this.inputContent.slice(0, -1);
                        document.getElementById('test-char-count').innerText = this.totalChars;
                        this.updateDisplays();
                    }
                }
            }
        });

        // 3. ハイブリッドIME制御
        this.realInput.addEventListener('compositionstart', () => { 
            this.isComposing = true; 
            this.realInput.style.opacity = '1'; // 変換中の文字と下線を可視化
            const caret = this.visualText.querySelector('.char-current-caret');
            if (caret) caret.style.visibility = 'hidden';
        });

        this.realInput.addEventListener('compositionend', (e) => {
            this.isComposing = false;
            this.realInput.style.opacity = '0'; // 確定したら隠す
            const caret = this.visualText.querySelector('.char-current-caret');
            if (caret) caret.style.visibility = 'visible';
            
            this.evaluateString(e.data);
            this.realInput.value = ''; 
        });

        this.realInput.addEventListener('input', (e) => {
            if (!this.isComposing) {
                if (e.inputType === 'deleteContentBackward') {
                    // 通常の文字入力中以外の削除は親のkeydownで処理済み
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

        // 【前方一致・部分受理方式】
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
            // 文章完了判定
            if (this.progress >= this.currentText.length) {
                this.isTransitioning = true;
                setTimeout(() => {
                    this.renderNextQuestion();
                    this.isTransitioning = false;
                    this.focusInput();
                }, 1000); // 1秒待機
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

    focusInput() { this.realInput.focus(); }

    startTimer() {
        this.timerId = setInterval(() => {
            this.timeLeft--;
            const min = Math.floor(this.timeLeft / 60);
            const sec = this.timeLeft % 60;
            document.getElementById('test-timer').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            if (this.timeLeft <= 0) this.endExam();
        }, 1000);
    }

    endExam(isAborted = false) {
        this.isStarted = false;
        clearInterval(this.timerId);
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');

        const resRank = document.getElementById('res-rank');

        if (isAborted) {
            resRank.innerText = "判定不可";
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
            resRank.style.color = "#2563eb";
            document.getElementById('res-total-chars').innerText = this.totalChars;
            document.getElementById('res-accuracy').innerText = accuracy;
            document.getElementById('res-cpm').innerText = cpm;
            document.getElementById('res-comment').innerText = this.getComment(rank);
        }
    }

    calculateRank(chars) {
        if (chars >= 1100) return "Legend";
        if (chars >= 1000) return "Master";
        if (chars >= 950)  return "SSS";
        if (chars >= 900)  return "SS";
        if (chars >= 850)  return "S";
        if (chars >= 800)  return "A+";
        if (chars >= 750)  return "A";
        if (chars >= 700)  return "A-";
        if (chars >= 650)  return "B+";
        if (chars >= 600)  return "B";
        if (chars >= 550)  return "B-";
        if (chars >= 500)  return "C+";
        if (chars >= 450)  return "C";
        if (chars >= 400)  return "C-";
        if (chars >= 350)  return "D+";
        if (chars >= 300)  return "D";
        if (chars >= 250)  return "D-";
        if (chars >= 150)  return "E+";
        if (chars >= 50)   return "E";
        return "E-";
    }

    getComment(rank) {
        const list = {
            "Legend": "極めて高い技術です。実務の枠を超えた驚異的な実力をお持ちです。",
            "Master": "卓越した技術です。どのような現場でも即戦力として信頼されるでしょう。",
            "SSS":    "素晴らしい速度です。入力が仕事の負担になることは一切ありません。",
            "SS":     "高度なスキルです。自信を持って日々の実務に取り組んでください。",
            "S":      "実務トップクラスの速度です。確実な練習の成果がしっかり表れています。",
            "A+":     "非常にスムーズな打鍵です。即戦力として申し分ない実力を備えています。",
            "A":      "合格ラインを十分に超えています。実務で困ることはない素晴らしい実力です。",
            "A-":     "安定した入力能力です。正確なリズムを保ちながら練習を続けましょう。",
            "B+":     "標準的な事務職の理想的なレベルです。日々の業務でさらに馴染ませましょう。",
            "B":      "実務の基本レベルをクリアしています。ミスを減らすと速度はさらに伸びます。",
            "B-":     "しっかり身についています。速度と正確性のバランスが大事です。",
            "C+":     "着実な成長を感じます。正確率UP%を目指すと、速度も自然に向上します。",
            "C":      "練習の成果が出ています。毎日の積み重ねが、未来のあなたの自信を作ります。",
            "C-":     "一歩ずつ進んでいます。見ずに打てる文字を増やすと、入力が楽になります。",
            "D+":     "最初の一歩をクリアしました。まずは正確に打つ喜びを大切にしましょう。",
            "D":      "キーの場所を指に覚えさせましょう。焦らず、ゆっくり進めば大丈夫です。",
            "D-":     "挑戦したことが素晴らしいです。ホームポジションを再確認してみましょう。",
            "E+":     "ここから始まります。まずはローマ字の基本から、自分のペースで進みましょう。",
            "E":      "パソコンに慣れることから始めましょう。練習すれば必ず上達するスキルです。",
            "E-":     "焦らなくて大丈夫です。自分のペースでゆっくり一歩ずつ進めていきましょう。"
        };
        return list[rank] || "お疲れ様でした。次回の挑戦も応援しています。";
    }
}
new TypingExam();