'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface VocabWord {
  word: string;
  reading: string;
  meaning: string;
  addedAt: number;
}

interface QuizQuestion {
  word: VocabWord;
  options: string[];
  correctIdx: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(words: VocabWord[]): QuizQuestion[] {
  if (words.length < 2) return [];
  return shuffle(words).map((word) => {
    const others = words.filter((w) => w.word !== word.word);
    const wrong = shuffle(others).slice(0, 3).map((w) => w.meaning || w.word);
    const correctIdx = Math.floor(Math.random() * 4);
    const options = [...wrong];
    options.splice(correctIdx, 0, word.meaning || word.word);
    return { word, options: options.slice(0, 4), correctIdx };
  });
}

type Phase = 'start' | 'quiz' | 'result';

export default function QuizPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('start');
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [quizType, setQuizType] = useState<'word2meaning' | 'meaning2word'>('word2meaning');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocab');
      setWords(saved ? JSON.parse(saved) : []);
    } catch { setWords([]); }
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP';
    utt.rate = 0.8;
    window.speechSynthesis.speak(utt);
  }, []);

  const startQuiz = () => {
    const q = buildQuiz(words);
    setQuestions(q);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setPhase('quiz');
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].correctIdx;
    if (correct) {
      setScore((s) => s + 1);
      speak(questions[current].word.word);
    }
    setAnswers((a) => [...a, correct]);
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  };

  const q = questions[current];
  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;

  if (words.length < 2) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
        <h2 style={{ color: '#8b5e3c', marginBottom: '12px', fontFamily: 'Noto Serif JP, serif' }}>단어장이 비어있어요</h2>
        <p style={{ color: '#9d7b6a', marginBottom: '24px', fontSize: '14px' }}>
          퀴즈를 풀려면 최소 2개 이상의 단어가 필요해요.<br />
          카라오케 페이지에서 단어를 클릭해서 저장해보세요!
        </p>
        <Link href="/" style={{ display: 'inline-block', padding: '12px 28px', background: '#8b5e3c', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
          ☕ 카라오케로 이동
        </Link>
      </div>
    );
  }

  if (phase === 'start') {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', color: '#8b5e3c', fontFamily: 'Noto Serif JP, serif', margin: '0 0 8px' }}>✏️ 단어 퀴즈</h1>
          <p style={{ color: '#9d7b6a', fontSize: '13px', margin: 0 }}>저장한 단어를 복습해요!</p>
        </div>

        <div style={{ background: '#fff8f0', borderRadius: '16px', border: '1px solid #e9d8c2', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center', padding: '16px', background: '#f5ece0', borderRadius: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5e3c' }}>{words.length}</div>
              <div style={{ fontSize: '12px', color: '#9d7b6a' }}>저장된 단어</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: '#f5ece0', borderRadius: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5e3c' }}>{words.length}</div>
              <div style={{ fontSize: '12px', color: '#9d7b6a' }}>문제 수</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#8b5e3c', marginBottom: '10px', fontWeight: 'bold' }}>퀴즈 유형:</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'word2meaning', label: '일본어 → 의미' },
                { key: 'meaning2word', label: '의미 → 일본어' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setQuizType(key as any)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e9d8c2',
                    background: quizType === key ? '#8b5e3c' : '#f5ece0',
                    color: quizType === key ? 'white' : '#8b5e3c',
                    fontSize: '13px', cursor: 'pointer', fontWeight: 'bold',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startQuiz}
            style={{ width: '100%', padding: '14px', background: '#8b5e3c', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🌸 퀴즈 시작!
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    const emoji = pct >= 90 ? '🎉' : pct >= 70 ? '😊' : pct >= 50 ? '🙂' : '💪';
    const msg = pct >= 90 ? '완벽해요! 최고예요!' : pct >= 70 ? '잘했어요! 조금만 더!' : pct >= 50 ? '좋아요! 계속 연습해요!' : '다시 해봐요! 화이팅!';

    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff8f0', borderRadius: '16px', border: '1px solid #e9d8c2', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>{emoji}</div>
          <h2 style={{ fontSize: '24px', color: '#8b5e3c', fontFamily: 'Noto Serif JP, serif', marginBottom: '8px' }}>{msg}</h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#8b5e3c', marginBottom: '4px' }}>
            {score} <span style={{ fontSize: '24px', color: '#9d7b6a' }}>/ {questions.length}</span>
          </div>
          <div style={{ fontSize: '16px', color: '#9d7b6a', marginBottom: '24px' }}>정답률 {pct}%</div>

          <div style={{ height: '8px', background: '#e9d8c2', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(to right, #d4a373, #8b5e3c)', borderRadius: '4px' }} />
          </div>

          {/* Answer review */}
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            {questions.map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f0e8d8' }}>
                <span style={{ fontSize: '16px' }}>{answers[i] ? '✅' : '❌'}</span>
                <span style={{ fontSize: '16px', fontFamily: 'Noto Serif JP, serif', color: '#3d2b1f' }}>{q.word.word}</span>
                {q.word.reading && <span style={{ fontSize: '13px', color: '#8b5e3c' }}>({q.word.reading})</span>}
                <span style={{ fontSize: '12px', color: '#9d7b6a', marginLeft: 'auto' }}>{q.word.meaning}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={startQuiz}
              style={{ flex: 1, padding: '12px', background: '#8b5e3c', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🔄 다시 도전
            </button>
            <Link href="/vocabulary" style={{ flex: 1, display: 'block', textDecoration: 'none' }}>
              <div style={{ padding: '12px', background: '#f0e8d8', color: '#8b5e3c', borderRadius: '12px', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' }}>
                📖 단어장 보기
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Quiz question
  const question = quizType === 'word2meaning' ? q.word.word : q.word.meaning;
  const correctAnswer = quizType === 'word2meaning' ? q.word.meaning : q.word.word;
  const opts = quizType === 'word2meaning'
    ? q.options
    : q.options.map((o, i) => (i === q.correctIdx ? q.word.word : words.find(w => w.meaning === o)?.word || o));

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px 16px' }}>
      {/* Progress */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9d7b6a', marginBottom: '6px' }}>
          <span>문제 {current + 1} / {questions.length}</span>
          <span>점수: {score}</span>
        </div>
        <div style={{ height: '6px', background: '#e9d8c2', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(to right, #d4a373, #8b5e3c)', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Question card */}
      <div style={{ background: '#fff8f0', borderRadius: '16px', border: '1px solid #e9d8c2', padding: '32px 24px', marginBottom: '16px', textAlign: 'center', boxShadow: '0 2px 12px rgba(139,94,60,0.10)' }}>
        <div style={{ fontSize: '11px', color: '#9d7b6a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {quizType === 'word2meaning' ? '이 단어의 의미는?' : '이 의미의 일본어는?'}
        </div>
        <div
          style={{
            fontSize: quizType === 'word2meaning' ? '44px' : '20px',
            fontFamily: quizType === 'word2meaning' ? 'Noto Serif JP, serif' : 'inherit',
            color: '#3d2b1f', fontWeight: 'bold', marginBottom: '8px',
            lineHeight: 1.4,
          }}
        >
          {question}
        </div>
        {quizType === 'word2meaning' && q.word.reading && (
          <div style={{ fontSize: '16px', color: '#8b5e3c', marginBottom: '8px' }}>{q.word.reading}</div>
        )}
        {quizType === 'word2meaning' && (
          <button
            onClick={() => speak(q.word.word)}
            style={{ background: '#f0e8d8', border: 'none', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', color: '#8b5e3c' }}
          >
            🔊 듣기
          </button>
        )}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {q.options.map((opt, i) => {
          let bg = '#fff8f0';
          let border = '#e9d8c2';
          let color = '#3d2b1f';

          if (selected !== null) {
            if (i === q.correctIdx) {
              bg = '#d4edda'; border = '#5a7a5a'; color = '#2d5a2d';
            } else if (i === selected && selected !== q.correctIdx) {
              bg = '#fde8e8'; border = '#8b3a3a'; color = '#8b3a3a';
            }
          }

          const displayOpt = quizType === 'word2meaning' ? opt : (words.find(w => w.meaning === opt)?.word || opt);

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              style={{
                padding: '14px 18px', borderRadius: '12px', border: `2px solid ${border}`,
                background: bg, color, fontSize: quizType === 'meaning2word' ? '22px' : '14px',
                cursor: selected !== null ? 'default' : 'pointer', textAlign: 'left',
                fontFamily: quizType === 'meaning2word' ? 'Noto Serif JP, serif' : 'inherit',
                transition: 'all 0.2s ease', fontWeight: selected !== null && i === q.correctIdx ? 'bold' : 'normal',
              }}
            >
              <span style={{ color: '#9d7b6a', marginRight: '8px', fontSize: '13px' }}>
                {['①', '②', '③', '④'][i]}
              </span>
              {quizType === 'word2meaning' ? opt : (opts[i])}
            </button>
          );
        })}
      </div>

      {/* Feedback & Next */}
      {selected !== null && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <div style={{
            padding: '12px 16px', borderRadius: '10px', marginBottom: '12px',
            background: selected === q.correctIdx ? '#d4edda' : '#fde8e8',
            color: selected === q.correctIdx ? '#2d5a2d' : '#8b3a3a',
            fontSize: '14px', fontWeight: 'bold',
          }}>
            {selected === q.correctIdx ? '🎉 정답이에요!' : `❌ 정답은: ${quizType === 'word2meaning' ? q.word.meaning : q.word.word}`}
          </div>
          <button
            onClick={next}
            style={{ padding: '12px 32px', background: '#8b5e3c', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {current + 1 >= questions.length ? '결과 보기 🌸' : '다음 문제 →'}
          </button>
        </div>
      )}
    </div>
  );
}
