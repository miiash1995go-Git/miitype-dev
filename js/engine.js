/**
 * TypingEngine
 * タイピングの判定・計算ロジックを管理するクラス
 */
class TypingEngine {
    constructor() {
        this.reset();
    }

    // ゲーム状態のリセット
    reset() {
        this.questions = [];
        this.currentQIndex = 0;
        this.charIndex = 0;
        this.misses = 0;
        this.totalTyped = 0;
        this.startTime = null;
        this.missMap = {}; // 苦手キー集計用
    }

    // 問題をセット
    setQuestions(data) {
        this.questions = data;
    }

    // 現在の問題を取得
    getCurrentQuestion() {
        return this.questions[this.currentQIndex];
    }

    // 入力判定
    checkInput(key) {
        // 最初の入力でタイマー開始（外部で管理するがフラグとして）
        if (!this.startTime) this.startTime = Date.now();

        const question = this.getCurrentQuestion();
        const targetChar = question.romaji[this.charIndex];

        this.totalTyped++;

        if (key === targetChar) {
            // 正解
            this.charIndex++;
            
            // 問題文をすべて打ち終わったか
            if (this.charIndex >= question.romaji.length) {
                this.currentQIndex++;
                this.charIndex = 0;
                
                // 全問題終了チェック
                if (this.currentQIndex >= this.questions.length) {
                    return "COMPLETED";
                }
                return "NEXT_QUESTION";
            }
            return "CORRECT";
        } else {
            // ミス
            this.misses++;
            this.logMiss(targetChar);
            return "MISS";
        }
    }

    // ミスしたキーを記録（苦手分析用）
    logMiss(char) {
        if (!this.missMap[char]) {
            this.missMap[char] = 0;
        }
        this.missMap[char]++;
    }

    // WPMと正確率を計算
    calculateStats() {
        const now = Date.now();
        const elapsedMinutes = (now - this.startTime) / 1000 / 60;
        
        // WPM: (総タイプ数 / 5) / 分 (タイピング界の一般的定義)
        const wpm = elapsedMinutes > 0 ? Math.floor((this.totalTyped / 5) / elapsedMinutes) : 0;
        
        // 正確率: (正解数 / 総入力数) * 100
        const correctTyped = this.totalTyped - this.misses;
        const accuracy = this.totalTyped > 0 ? Math.floor((correctTyped / this.totalTyped) * 100) : 100;
        
        // スコア（独自計算：WPM * 正確率の二乗）
        const score = Math.floor(wpm * (accuracy / 100) ** 2);

        return { wpm, accuracy, score, misses: this.misses };
    }

    // 苦手キーワースト3を取得
    getWeakKeys() {
        return Object.entries(this.missMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
    }
}