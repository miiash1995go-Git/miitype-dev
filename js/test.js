/**
 * ぱそトレ！ 5分間タイピングテスト 試験エンジン (v20.8.02.Final)
 * ------------------------------------------------------------
 * 【統合済み機能】
 * 1. 2行表示・0.3秒後装填スライドラグ（最新UI）
 * 2. ハイブリッドIME入力（変換中可視化）
 * 3. 前方一致・部分受理ロジック ＆ 逆流修正（Backspace戻し）
 * 4. GA4連携 ＆ 自己ベスト保存 ＆ 19段階ランク判定
 * 5. エラー時ダメージエフェクト（赤フラッシュ）
 * ============================================================
 */

class TypingExam {
    constructor() {
        this.questionPool = {};     // カテゴリ分けされた全問題
        this.lastCategoryId = null; // 直前の出題カテゴリID
        this.currentText = '';      // 現在の入力対象（1行目）
        this.nextText = '';         // 次の待機対象（2行目）
        this.currentIndex = 0;
        this.totalChars = 0;
        this.missCount = 0;
        this.startTime = null;
        this.timeLeft = 300;        // 5分
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
        // ページ読み込み時の自動スクロール
        window.addEventListener('load', () => {
            const wrapper = document.querySelector('.test-main-wrapper');
            if (wrapper) {
                setTimeout(() => {
                    wrapper.scrollIntoView({ behavior: 'auto', block: 'start' });
                }, 50);
            }
        });

        // Escキーによる中断・戻り
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isStarted) {
                    this.endExam(true);
                } else {
                    window.location.href = './play.html';
                }
            }
        });

        try {
            const res = await fetch('./data/typing/test_5min.json');
            const data = await res.json();
            this.questionPool = data.categories;
            
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
        
        this.isStarted = false;
        let count = 5;

        // カウントダウン表示（中央配置）
        this.sampleBox.innerHTML = `<div style="font-size: 1.55rem; font-weight: 900; color: #2563eb; text-align: center; line-height: 110px;">テスト開始まで：${count}</div>`;
        
        const countdownTimer = setInterval(() => {
            count--;
            if (count > 0) {
                this.sampleBox.innerHTML = `<div style="font-size: 1.55rem; font-weight: 900; color: #2563eb; text-align: center; line-height: 110px;">テスト開始まで：${count}</div>`;
            } else {
                clearInterval(countdownTimer);
                this.isStarted = true;
                this.startTime = Date.now();
                this.renderNextQuestion(); // ここで2行構造を生成
                this.startTimer();
                this.focusInput();
            }
        }, 1000);
    }startExam() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        this.isStarted = false;
        let count = 5;

        // 【改良】カウントダウン開始と同時にフォーカスを奪取し、空振りを防ぐ
        this.focusInput();

        // 【改良】リマインド文を追加。line-heightを調整して中央寄せを維持
        const getCountdownHtml = (c) => `
            <div style="text-align: center; padding-top: 10px;">
                <div style="font-size: 2.2rem; font-weight: 900; color: #2563eb; margin-bottom: 5px;">${c}</div>
                <div style="font-size: 0.9rem; font-weight: 800; color: #64748b;">日本語入力を「オン」にしてお待ちください</div>
            </div>
        `;
        this.sampleBox.innerHTML = getCountdownHtml(count);
        
        const countdownTimer = setInterval(() => {
            count--;
            if (count > 0) {
                this.sampleBox.innerHTML = getCountdownHtml(count);
                // 待機中もフォーカスを維持（ユーザーがよそ見クリックしても戻す）
                this.focusInput();
            } else {
                clearInterval(countdownTimer);
                this.isStarted = true;
                this.startTime = Date.now();
                
                // 【改良】1文字目のゴミ入力をクリアしてから開始
                this.realInput.value = '';
                
                this.renderNextQuestion();
                this.startTimer();
                this.focusInput();
            }
        }, 1000);
    }

    pickNextQuestion() {
        const catIds = Object.keys(this.questionPool);
        if (catIds.length === 0) return { kanji: "エラー：データがありません", kana: "" };

        const availableCats = this.lastCategoryId 
            ? catIds.filter(id => id !== this.lastCategoryId) 
            : catIds;
            
        const selectedCatId = availableCats[Math.floor(Math.random() * availableCats.length)];
        const pool = this.questionPool[selectedCatId];
        const rawQuestion = pool[Math.floor(Math.random() * pool.length)];
        
        const sanitizedQuestion = {
            kanji: rawQuestion.kanji.trim(),
            kana: rawQuestion.kana.trim()
        };
        
        this.lastCategoryId = selectedCatId;
        return sanitizedQuestion;
    }

    renderNextQuestion() {
        // 初回のみ2つ分ロード
        if (!this.currentText) {
            this.currentText = this.pickNextQuestion().kanji;
            this.nextText = this.pickNextQuestion().kanji;
        }

        // 2行表示構造の構築
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
        // ① サンプルエリア：1行目(line-current)のみを更新対象にする
        const lineCurrent = document.getElementById('line-current');
        if (lineCurrent) {
            const done = this.currentText.substring(0, this.progress);
            const remain = this.currentText.substring(this.progress);
            lineCurrent.innerHTML = `<span class="char-done">${done}</span><span>${remain}</span>`;
        }

        // ② 入力エリア：確定済み文字 ＋ 青いキャレットを表示
        let inputHtml = `<span class="char-confirmed">${this.inputContent}</span>`;
        inputHtml += `<span class="char-current-caret"></span>`;
        this.visualText.innerHTML = inputHtml;

        // IME候補窓の位置同期
        const caret = this.visualText.querySelector('.char-current-caret');
        if (caret && this.realInput) {
            this.realInput.style.left = caret.offsetLeft + 'px';
            this.realInput.style.top = caret.offsetTop + 'px';
            const remainingWidth = 920 - caret.offsetLeft;
            this.realInput.style.width = Math.max(remainingWidth, 100) + 'px';
        }
    }

    setupInputEvents() {
        document.addEventListener('click', () => { 
            if(this.isStarted && !this.isTransitioning) this.focusInput(); 
        });
        
        this.realInput.addEventListener('keydown', (e) => {
            if (this.isStarted && !this.isComposing) {
                if (e.key === 'Escape') {
                    this.endExam(true);
                }
                // Backspace逆流修正（デグレード防止）
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
                
                // 完了時：ラグを 300ms -> 150ms に短縮し、即座に次弾を装填
                setTimeout(() => {
                    const stack = document.getElementById('sample-inner');
                    if (stack) {
                        stack.classList.add('is-sliding');
                    }

                    // CSS遷移(0.2s)に合わせて 200ms 後にデータを入れ替える
                    setTimeout(() => {
                        this.currentText = this.nextText;
                        this.nextText = this.pickNextQuestion().kanji;
                        
                        this.renderNextQuestion();
                        this.isTransitioning = false;
                        this.focusInput();
                    }, 200);

                }, 150); 
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
        this.isTransitioning = false;
        clearInterval(this.timerId);

        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');

        // 【物理仕様復旧】ノートPC環境でヘッダーを隠し、結果カードを最上部へ配置する自動スクロール
        const wrapper = document.querySelector('.test-main-wrapper');
        if (wrapper) {
            setTimeout(() => {
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }

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

            // GA4送信
            if (typeof gtag === 'function') {
                gtag('event', 'typing_complete', {
                    'category_name': '5分間タイピングテスト',
                    'rank': rank,
                    'score': this.totalChars,
                    'accuracy': parseFloat(accuracy),
                    'cpm': cpm
                });
            }

            // 自己ベスト保存
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
        if (chars >= 700) return "SSS";
        if (chars >= 650) return "SS";
        if (chars >= 600) return "S";
        if (chars >= 570) return "A+";
        if (chars >= 530) return "A";
        if (chars >= 500) return "A-";
        if (chars >= 460) return "B+";
        if (chars >= 430) return "B";
        if (chars >= 400) return "B-";
        if (chars >= 360) return "C+";
        if (chars >= 330) return "C";
        if (chars >= 300) return "C-";
        if (chars >= 250) return "D+";
        if (chars >= 200) return "D";
        if (chars >= 150) return "D-";
        if (chars >= 100) return "E+";
        if (chars >= 50)  return "E";
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