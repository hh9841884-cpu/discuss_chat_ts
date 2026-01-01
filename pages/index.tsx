import { useState, useEffect } from 'react';
import Image from 'next/image';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Home() {
  const [mode, setMode] = useState('論破度判定');
  const [character, setCharacter] = useState('魔王軍入団面接');
  const [turn, setTurn] = useState(0);
  const [history, setHistory] = useState<Message[]>([]);
  const [finished, setFinished] = useState(false);
  const [evaluated, setEvaluated] = useState(false);
  const [introShown, setIntroShown] = useState(false);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (mode === '論破度判定' && character === '魔王軍入団面接' && !introShown) {
      const intro = "🔥 **魔王軍 入団面接を開始する…**\n魔王：『まずは名を名乗れ。貴様は何者だ？』";
      setHistory([{ role: 'assistant', content: intro }]);
      setIntroShown(true);
      setTurn(1);
    }
  }, [mode, character, introShown]);

  const handleSend = async () => {
    if (!input || finished) return;

    const userMessage = { role: 'user', content: input } as const;
    const updatedHistory = [...history, userMessage];
    const currentTurn = turn + 1;
    setTurn(currentTurn);
    setInput('');

    // 質問フェーズ（10ターン未満のとき）
    if (currentTurn < 10) {
      const systemPrompt = `
  あなたは魔王として振る舞う。
  ユーザーは魔王軍に入りたい志願者である。
  あなたは面接官として、ユーザーに質問を投げかける。
  質問は短く鋭く、魔王らしい威圧感を持たせる。
  返答は「質問のみ」にする。

  現在のターン: ${currentTurn}

  もし次の質問が最後の質問（ターン10）であれば、
  必ず質問文の冒頭に「これが最後の質問だ…」と付け加える。
  `;

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory, systemPrompt }),
      });

      const data = await res.json();
      const newHistory = [...updatedHistory, { role: 'assistant', content: data.reply } as const];
      setHistory(newHistory);

      // 評価フェーズ（3ターン目以降、未評価のときのみ）
      if (currentTurn >= 3 && !evaluated && !finished) {
        const evalPrompt = `
  あなたは魔王として、志願者の回答を100点満点で評価する。
  平均で60点になるように厳しめに評価すること。
  75点以上で合格とする。

  評価基準（各25点満点）：
  1. 魔王軍にふさわしい野心（0〜25）
  2. 忠誠心（0〜25）
  3. 戦闘力のアピール（0〜25）
  4. 論理性と説得力（0〜25）

  あなたは以下を判断する：
  1. 志願者の回答が評価に十分な情報を含んでいるか？
  2. もし十分なら即座に評価を行う。
  3. もし不十分なら「False」とだけ返す。
  `;

        const evalRes = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newHistory, systemPrompt: evalPrompt }),
        });

        const evalData = await evalRes.json();

        if (evalData.reply !== 'False') {
          setHistory([...newHistory, { role: 'assistant', content: evalData.reply } as const]);
          setEvaluated(true);
          setFinished(true);
          return;
        }
      }
    }

    // 10ターン目：強制評価
    if (currentTurn >= 10 && !finished) {
      const finalPrompt = `
  あなたは魔王として、志願者の回答を100点満点で評価する。
  平均で60点になるように厳しめに評価すること。
  75点以上で合格とする。

  評価基準（各25点満点）：
  1. 魔王軍にふさわしい野心（0〜25）
  2. 忠誠心（0〜25）
  3. 戦闘力のアピール（0〜25）
  4. 論理性と説得力（0〜25）

  どんなに情報が少なくても、想像力を働かせて必ず評価を行うこと。
  「False」や「評価できない」とは絶対に返さないこと。

  返答形式：

  野心：◯◯点  
  忠誠心：◯◯点  
  戦闘力：◯◯点  
  論理性：◯◯点  
  ――――――  
  合計：◯◯点  
  評価コメント：◯◯◯  
  判定：合格 or 不合格
  `;

      const finalRes = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory, systemPrompt: finalPrompt }),
      });

      const finalData = await finalRes.json();
      setHistory([...updatedHistory, { role: 'assistant', content: finalData.reply } as const]);
      setFinished(true);
    }
  };


  const handleReset = () => {
    setTurn(0);
    setHistory([]);
    setFinished(false);
    setEvaluated(false);
    setIntroShown(false);
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>魔王軍 入団面接</h1>

      {history.map((msg, i) => (
        <div key={i} style={{ marginBottom: '1rem' }}>
          {msg.role === 'assistant' && (
            <div>
              <Image src="/maou.jpeg" alt="魔王" width={80} height={80} />
              <p><strong>魔王：</strong> {msg.content}</p>
            </div>
          )}
          {msg.role === 'user' && <p><strong>あなた：</strong> {msg.content}</p>}
        </div>
      ))}

      {!finished && (
        <div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="メッセージを入力"
            style={{ width: '80%' }}
          />
          <button onClick={handleSend}>送信</button>
        </div>
      )}

      {finished && (
        <div>
          <p>面接は終了しました。もう一度プレイしますか？</p>
          <button onClick={handleReset}>もう一度プレイする</button>
        </div>
      )}
    </main>
  );
}
