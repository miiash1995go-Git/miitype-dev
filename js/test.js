/**
 * ぱそトレ！ 5分間タイピングテスト 試験エンジン (v20.7.29.Final_Fixed)
 * ------------------------------------------------------------
 * 【実装済み機能】
 * 1. ハイブリッド・インプット（変換中可視化）
 * 2. 前方一致・部分受理ロジック
 * 3. 確定済み文字のBackspace修正（逆流処理）
 * 4. 5カテゴリ出題管理（連続出題禁止 ＆ 自動トリム）
 * 5. 精密ランク判定（19段階）＆ 1行アドバイス
 * 6. エラー時ダメージエフェクト
 * ============================================================
 */

class TypingExam {
    constructor() {
        this.questionPool = {};     // カテゴリ分けされた全問題
        this.lastCategoryId = null; // 直前の出題カテゴリID
        this.currentText = '';      // 1行目
        this.nextText = '';         // 2行目
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
        // ページ読み込み時、描画を待ってからコンテンツ最上部へスクロール
        window.addEventListener('load', () => {
            const wrapper = document.querySelector('.test-main-wrapper');
            if (wrapper) {
                setTimeout(() => {
                    wrapper.scrollIntoView({ behavior: 'auto', block: 'start' });
                }, 50);
            }
        });
        // 【修正】データの読み込み成否に関わらず、Escキー（戻る操作）を即座に有効化
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isStarted) {
                    this.endExam(true);
                } else {
                    window.location.href = 'play.html';
                }
            }
        });

        try {
            const res = await fetch('./data/typing/test_5min.json');
            const data = await res.json();
            // カテゴリごとにデータを保持
            this.questionPool = data.categories;
            
            // ボタンイベントの確実な割り当て
            const startBtn = document.getElementById('test-start-btn');
            if (startBtn) {
                startBtn.onclick = () => this.startExam();
            }
            this.setupInputEvents();
        } catch (e) { 
            console.error("試験データの読み込みに失敗しました", e); 
        }
    }

    startExam() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        // カウントダウン中はまだ「開始（isStarted）」としない
        this.isStarted = false;
        this.renderNextQuestion();
        
        let count = 5;
        // サンプルエリアの1行目に収まるサイズ（1.55rem）でカウントダウンを表示
        this.sampleBox.innerHTML = `<div style="font-size: 1.55rem; font-weight: 900; color: #2563eb; text-align: center;">テスト開始まで：${count}</div>`;
        
        const countdownTimer = setInterval(() => {
            count--;
            if (count > 0) {
                this.sampleBox.innerHTML = `<div style="font-size: 1.55rem; font-weight: 900; color: #2563eb; text-align: center;">テスト開始まで：${count}</div>`;
            } else {
                clearInterval(countdownTimer);
                // 試験開始の確定
                this.isStarted = true;
                this.startTime = Date.now();
                this.startTimer();
                this.focusInput();
                // サンプル文を正しい表示（グレーなしの初期状態）に戻す
                this.updateDisplays();
            }
        }, 1000);
    }


    // カテゴリの重複を避けつつ、データ末尾の空白を除去して選出
    pickNextQuestion() {
        const catIds = Object.keys(this.questionPool);
        if (catIds.length === 0) return { kanji: "エラー：データがありません", kana: "" };

        // 直前のカテゴリID以外から抽選（初回は全カテゴリ対象）
        const availableCats = this.lastCategoryId 
            ? catIds.filter(id => id !== this.lastCategoryId) 
            : catIds;
            
        const selectedCatId = availableCats[Math.floor(Math.random() * availableCats.length)];
        const pool = this.questionPool[selectedCatId];
        const rawQuestion = pool[Math.floor(Math.random() * pool.length)];
        
        // データ末尾の不要な空白（半角スペース等）を自動削除して、判定不全を防止
        const sanitizedQuestion = {
            kanji: rawQuestion.kanji.trim(),
            kana: rawQuestion.kana.trim()
        };
        
        renderNextQuestion() {
        // 初回のみ2つ分ロード
        if (!this.currentText) {
            this.currentText = this.pickNextQuestion().kanji;
            this.nextText = this.pickNextQuestion().kanji;
        }

        // 構造を2行スタックへ
        this.sampleBox.innerHTML = `
            <div id="sample-inner" class="sample-inner-stack">
                <div id="line-current" class="sample-line"></div>
                <div id="line-next" class="sample-line sample-line--next">${this.nextText}</div>
            </div>
        `;
        
        this.progress = 0;
        this.inputContent = ''; 
        this.composingText = '';
        this.isComposing = false;
        this.updateDisplays();
    }

    updateDisplays() {
        // ① サンプルエリア：確定済みはグレー、未入力は黒（1行目のみ更新）
        const line1 = document.getElementById('line-current');
        if (line1) {
            const done = this.currentText.substring(0, this.progress);
            const remain = this.currentText.substring(this.progress);
            line1.innerHTML = `<span class="char-done">${done}</span><span>${remain}</span>`;
        }

        // ② 入力エリア：確定済み文字 ＋ キャレットのみ表示
        let inputHtml = `<span class="char-confirmed">${this.inputContent}</span>`;
        inputHtml += `<span class="char-current-caret"></span>`;
        this.visualText.innerHTML = inputHtml;

        // IME候補窓を青いキャレットの位置にミリ単位で同期
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
        // ボックス内クリックでフォーカスを戻す
        document.addEventListener('click', () => { 
            if(this.isStarted && !this.isTransitioning) this.focusInput(); 
        });
        
        // 2. 入力欄自体の監視（IME非変換時の特殊キー処理）
        this.realInput.addEventListener('keydown', (e) => {
            if (this.isStarted && !this.isComposing) {
                // Escでの中断
                if (e.key === 'Escape') {
                    this.endExam(true);
                }
                // Backspace：確定済みエリアへの修正（逆流）
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

        // 3. ハイブリッドIME制御（変換中のみ実体を可視化）
        this.realInput.addEventListener('compositionstart', () => { 
            this.isComposing = true; 
            this.realInput.style.opacity = '1'; 
            const caret = this.visualText.querySelector('.char-current-caret');
            if (caret) caret.style.visibility = 'hidden';
        });

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
                if (e.inputType !== 'deleteContentBackward' && this.realInput.value.length > 0) {
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
            if (this.progress >= this.currentText.length) {
                this.isTransitioning = true;
                
                // 1行目完了：0.3秒後にスライド開始
                setTimeout(() => {
                    const stack = document.getElementById('sample-inner');
                    if (stack) stack.classList.add('is-sliding');

                    // スライドアニメーション完了後（さらに0.3秒後）にデータ入れ替え
                    setTimeout(() => {
                        this.currentText = this.nextText;
                        this.nextText = this.pickNextQuestion().kanji;
                        
                        this.renderNextQuestion();
                        this.isTransitioning = false;
                        this.focusInput();
                    }, 300);
                }, 300);
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

            // 【Googleアナリティクス連携】
            // このレポート専用の名前（5分間タイピングテスト）でデータを送信します
            if (typeof gtag === 'function') {
                gtag('event', 'typing_complete', {
                    'category_name': '5分間タイピングテスト', // レポートで仕分けるための名前
                    'rank': rank,                    // レポートの「判定ランク」列に表示
                    'score': this.totalChars,             // レポートの「スコア」列に文字数を表示
                    'accuracy': parseFloat(accuracy),      // 正確率
                    'cpm': cpm                             // 打鍵速度
                });
            }

            // 【自己ベスト保存】
            const storageKey = 'pasotore_best';
            const bestScores = JSON.parse(localStorage.getItem(storageKey)) || {};
            if (!bestScores['test_5min'] || this.totalChars > bestScores['test_5min']) {
                bestScores['test_5min'] = this.totalChars;
                localStorage.setItem(storageKey, JSON.stringify(bestScores));
            }
        }
    }

    calculateRank(chars) {
        if (chars >= 900) return "Legend";
        if (chars >= 800) return "Master";
        if (chars >= 700)  return "SSS";
        if (chars >= 650)  return "SS";
        if (chars >= 600)  return "S";
        if (chars >= 570)  return "A+";
        if (chars >= 530)  return "A";
        if (chars >= 500)  return "A-";
        if (chars >= 460)  return "B+";
        if (chars >= 430)  return "B";
        if (chars >= 400)  return "B-";
        if (chars >= 360)  return "C+";
        if (chars >= 330)  return "C";
        if (chars >= 300)  return "C-";
        if (chars >= 250)  return "D+";
        if (chars >= 200)  return "D";
        if (chars >= 150)  return "D-";
        if (chars >= 100)  return "E+";
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
            "A":      "採用・合格ラインを十分に超えています。実務で困ることはない素晴らしい実力です。",
            "A-":     "安定した入力能力です。正確なリズムを保ちながら練習を続けましょう。",
            "B+":     "事務職の理想的なレベルです。日々の練習でさらに馴染ませましょう。",
            "B":      "実務レベルをクリアしています。ミスを減らすと速度はさらに伸びます。",
            "B-":     "一般事務レベル到達です。変換のタイミングを考えるのが上達の近道です。",
            "C+":     "着実な成長を感じます。正確率と速度もバランスよく向上していきましょう。",
            "C":      "練習の成果が出ています。毎日の積み重ねが、未来のあなたの自信を作ります。",
            "C-":     "一歩ずつ進んでいます。キーを見ずに打てる文字を増やしましょう。数字や記号に注意です。",
            "D+":     "ビジネス文書タイピングの最初の一歩をクリアしました。正確に打つ喜びを大切にしましょう。",
            "D":      "キーの場所を指に覚えさせましょう。焦らず、ゆっくり進めば大丈夫です。",
            "D-":     "タッチタイピングに挑戦です。ホームポジションや上段・下段の指の位置を確認してみましょう。",
            "E+":     "ここから始まります。まずはローマ字の基本から、自分のペースで進みましょう。",
            "E":      "パソコンに慣れることから始めましょう。練習すれば必ず上達するスキルです。",
            "E-":     "焦らなくて大丈夫です。自分のペースでゆっくり一歩ずつ進めていきましょう。"
        };
        return list[rank] || "お疲れ様でした。次回の挑戦も応援しています。";
    }
}
new TypingExam();