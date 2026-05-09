'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { JLPT_N3_QUESTIONS, type JLPTQuestion } from '@/data/jlptQuestions';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Filter = 'all' | 'vocabulary' | 'grammar' | 'reading';
type Phase = 'start' | 'quiz' | 'result';

export default function JLPTPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [phase, setPhase] = useState<Phase>('start');
  const [questions, setQuestions] = useState<JLPTQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP';
    utt.rate = 0.8;
    window.speechSynthesis.speak(utt);
  }, []);

  const startQuiz = () => {
    const filtered = filter === 'all' ? JLPT_N3_QUESTIONS : JLPT_N3_QUESTIONS.filter(q => q.type === filter);
    setQuestions(shuffle(filtered));
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setShowExplanation(false);
    setPhase('quiz');
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].answer;
    if (correct) {
      setScore(s => s + 1);
      if (questions[current].keyword) speak(questions[current].keyword!);
    }
    setAnswers(a => [...a, correct]);
    setShowExplanation(false);
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = { vocabulary: '📚 어휘', grammar: '✏️ 문법', reading: '📖 독해' };
    return map[type] || type;
  };

  const typeColor = (type: string) => {
    const map: Record<string, string> = { vocabulary: '#5a7a5a', grammar: '#3a5a7a', reading: '#7a3a5a' };
    return map[type] || '#8b5e3c';
  };

  const q = questions[current];
  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const totalByType = {
    all: JLPT_N3_QUESTIONS.length,
    vocabulary: JLPT_N3_QUESTIONS.filter(q => q.type === 'vocabulary').length,
    grammar: JLPT_N3_QUESTIONS.filter(q => q.type === 'grammar').length,
    reading: JLPT_N3_QUESTIONS.filter(q => q.type === 'reading').length,
  };

  if (phase === 'start') {
    return (
      <div style={{ maxWidth: '680px', margin: '40px auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎌</div>
          <h1 style={{ fontSize: '24px', color: '#8b5e3c', fontFamily: 'Noto Serif JP, serif', margin: '0 0 4px' }}>
            JLPT N3 練習問題
          </h1>
          <p style={{ fontSize: '13px', color: '#9d7b6a', margin: 0 }}>
            마이 팟캐스트 어휘 기반 N3 연습문제 • {JLPT_N3_QUESTIONS.length}문제
          </p>
        </div>

        <div style={{ background: '#fff8f0', borderRadius: '16px', border: '1px solid #e9d8c2', padding: '24px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#8b5e3c', fontWeight: 'bold', marginBottom: '12px' }}>문제 유형 선택:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            {([
              { key: 'all', icon: '🌸', label: '전체', count: totalByType.all },
              { key: 'vocabulary', icon: '📚', label: '어휘', count: totalByType.vocabulary },
              { key: 'grammar', icon: '✏️', label: '문법', count: totalByType.grammar },
              { key: 'reading', icon: '📖', label: '독해', count: totalByType.reading },
            ] as const).map(({ key, icon, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '14px', borderRadius: '12px', border: '2px solid',
                  borderColor: filter === key ? '#8b5e3c' : '#e9d8c2',
                  background: filter === key ? '#8b5e3c' : '#f5ece0',
                  color: filter === key ? 'white' : '#8b5e3c',
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{label}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{count}문제</div>
              </button>
            ))}
          </div>

          {/* Info boxes */}
          <div style={{ background: '#f5ece0', borderRadius: '10px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#6b5040', lineHeight: '1.8' }}>
            <strong>📌 이 문제들은:</strong><br />
            • 마이 팟캐스트 "일본 편의점" 에피소드의 어휘를 기반으로 한 N3 수준 문제입니다<br />
            • 어휘, 문법, 독해 영역으로 구성되어 있습니다<br />
            • 각 문제에 상세한 해설이 포함되어 있습니다
          </div>

          <button
            onClick={startQuiz}
            style={{ width: '100%', padding: '16px', background: '#8b5e3c', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🎌 시험 시작!
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: '13px', color: '#9d7b6a', textDecoration: 'none' }}>
            ← 카라오케로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    const level = pct >= 80 ? 'N3 합격권! 🎉' : pct >= 60 ? 'N3 아슬아슬... 💪' : '더 공부해요! 📚';

    return (
      <div style={{ maxWidth: '680px', margin: '40px auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff8f0', borderRadius: '16px', border: '1px solid #e9d8c2', padding: '32px 24px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '52px', marginBottom: '8px' }}>{pct >= 80 ? '🎌' : pct >= 60 ? '💪' : '📚'}</div>
            <h2 style={{ fontSize: '20px', color: '#8b5e3c', fontFamily: 'Noto Serif JP, serif', marginBottom: '8px' }}>{level}</h2>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#8b5e3c' }}>
              {score}<span style={{ fontSize: '20px', color: '#9d7b6a' }}> / {questions.length}</span>
            </div>
            <div style={{ fontSize: '14px', color: '#9d7b6a', marginTop: '4px' }}>정답률 {pct}%</div>
          </div>

          <div style={{ height: '8px', background: '#e9d8c2', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(to right, #d4a373, #8b5e3c)', borderRadius: '4px' }} />
          </div>

          {/* Question review */}
          <div style={{ marginBottom: '20px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
            {questions.map((q, i) => (
              <div key={i} style={{ padding: '10px 12px', marginBottom: '6px', borderRadius: '8px', background: answers[i] ? '#d4edda' : '#fde8e8', border: `1px solid ${answers[i] ? '#5a7a5a' : '#c4808080'}` }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{answers[i] ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ fontSize: '12px', color: typeColor(q.type), marginBottom: '2px' }}>{typeLabel(q.type)}</div>
                    <div style={{ fontSize: '13px', color: '#3d2b1f' }}>{q.question}</div>
                    {!answers[i] && (
                      <div style={{ fontSize: '12px', color: '#5a7a5a', marginTop: '4px' }}>
                        정답: {q.options[q.answer]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={startQuiz} style={{ flex: 1, padding: '12px', background: '#8b5e3c', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>
              🔄 다시 도전
            </button>
            <button onClick={() => setPhase('start')} style={{ flex: 1, padding: '12px', background: '#f0e8d8', color: '#8b5e3c', border: 'none', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>
              📋 유형 선택
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz
  return (
    <div style={{ maxWidth: '680px', margin: '40px auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#9d7b6a' }}>
          문제 {current + 1} / {questions.length}
        </div>
        <span style={{ fontSize: '12px', background: typeColor(q.type), color: 'white', padding: '3px 10px', borderRadius: '10px' }}>
          {typeLabel(q.type)}
        </span>
        <div style={{ fontSize: '12px', color: '#9d7b6a' }}>점수 {score}</div>
      </div>

      {/* Progress */}
      <div style={{ height: '5px', background: '#e9d8c2', borderRadius: '3px', marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(to right, #d4a373, #8b5e3c)', transition: 'width 0.3s ease' }} />
      </div>

      {/* Question */}
      <div style={{ background: '#fff8f0', borderRadius: '16px', border: '1px solid #e9d8c2', padding: '28px 24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(139,94,60,0.10)' }}>
        <div style={{ fontSize: '16px', color: '#3d2b1f', lineHeight: '1.8', fontFamily: 'Noto Serif JP, Georgia, serif', marginBottom: '12px' }}>
          {q.question}
        </div>
        {q.keyword && (
          <button
            onClick={() => speak(q.keyword!)}
            style={{ background: '#f0e8d8', border: 'none', borderRadius: '20px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', color: '#8b5e3c' }}
          >
            🔊 키워드 듣기: {q.keyword}
          </button>
        )}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {q.options.map((opt, i) => {
          let bg = '#fff8f0', border = '#e9d8c2', color = '#3d2b1f';
          if (selected !== null) {
            if (i === q.answer) { bg = '#d4edda'; border = '#5a7a5a'; color = '#2d5a2d'; }
            else if (i === selected && selected !== q.answer) { bg = '#fde8e8'; border = '#8b3a3a'; color = '#8b3a3a'; }
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              style={{ padding: '14px 16px', borderRadius: '12px', border: `2px solid ${border}`, background: bg, color, fontSize: '14px', cursor: selected !== null ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.2s ease', fontFamily: 'Noto Serif JP, Georgia, serif', lineHeight: '1.6' }}
            >
              <span style={{ color: '#9d7b6a', marginRight: '8px' }}>{['①', '②', '③', '④'][i]}</span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {selected !== null && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '10px', background: selected === q.answer ? '#d4edda' : '#fde8e8', color: selected === q.answer ? '#2d5a2d' : '#8b3a3a', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
            {selected === q.answer ? '🎉 정답이에요!' : `❌ 정답은: ${q.options[q.answer]}`}
          </div>

          <button
            onClick={() => setShowExplanation(!showExplanation)}
            style={{ width: '100%', padding: '10px', background: '#f5ece0', color: '#8b5e3c', border: '1px solid #e9d8c2', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}
          >
            {showExplanation ? '해설 닫기 ▲' : '해설 보기 ▼'}
          </button>

          {showExplanation && (
            <div style={{ padding: '14px 16px', background: '#fff8e7', borderRadius: '10px', border: '1px solid #e9d8c2', fontSize: '13px', color: '#3d2b1f', lineHeight: '1.8', marginBottom: '10px', fontFamily: 'Noto Serif JP, Georgia, serif' }}>
              {q.explanation}
            </div>
          )}

          <button
            onClick={next}
            style={{ width: '100%', padding: '12px', background: '#8b5e3c', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {current + 1 >= questions.length ? '결과 보기 🌸' : '다음 문제 →'}
          </button>
        </div>
      )}
    </div>
  );
}
