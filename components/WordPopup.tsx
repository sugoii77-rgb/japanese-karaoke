'use client';

import { useEffect, useState, useCallback } from 'react';

interface WordMeaning {
  english: string;
  korean?: string;
  partsOfSpeech: string;
  partsOfSpeechKo?: string;
}

interface WordResult {
  word: string;
  reading: string;
  meanings: WordMeaning[];
  jlpt: string;
  common: boolean;
}

interface WordPopupProps {
  word: string;
  onClose: () => void;
  onAddVocab: (word: string, reading: string, meaning: string) => void;
  onReadFrom: () => void;
}

export default function WordPopup({ word, onClose, onAddVocab, onReadFrom }: WordPopupProps) {
  const [results, setResults] = useState<WordResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  const speakWord = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    setAdded(false);

    speakWord(word);

    fetch(`/api/lookup?word=${encodeURIComponent(word)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setLoading(false);
      })
      .catch(() => {
        setError('단어 정보를 불러올 수 없습니다.');
        setLoading(false);
      });
  }, [word, speakWord]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleAddVocab = () => {
    if (results.length > 0) {
      const r = results[0];
      const firstMeaning = r.meanings[0];
      const meaning = firstMeaning?.korean || firstMeaning?.english || '';

      onAddVocab(r.word || word, r.reading, meaning);
      setAdded(true);
    } else {
      onAddVocab(word, '', '');
      setAdded(true);
    }
  };

  const jlptColor = (jlpt: string) => {
    const map: Record<string, string> = {
      'jlpt-n1': '#8b3a3a',
      'jlpt-n2': '#8b5e3c',
      'jlpt-n3': '#5a7a5a',
      'jlpt-n4': '#3a5a7a',
      'jlpt-n5': '#7a3a7a',
    };

    return map[jlpt] || '#9d7b6a';
  };

  return (
    <div
      className="popup-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="slide-up"
        style={{
          background: '#fff8f0',
          borderRadius: '16px',
          border: '1px solid #e9d8c2',
          boxShadow: '0 8px 32px rgba(139, 94, 60, 0.25)',
          maxWidth: '440px',
          width: '90%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #8b5e3c, #a67c52)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '36px',
                color: 'white',
                fontFamily: 'Noto Serif JP, serif',
                letterSpacing: '0.05em',
              }}
            >
              {word}
            </span>

            <button
              onClick={() => speakWord(word)}
              title="다시 듣기"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🔊
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9d7b6a' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>☕</div>
              <div style={{ fontSize: '14px' }}>불러오는 중...</div>
            </div>
          ) : error ? (
            <div style={{ color: '#8b3a3a', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              {error}
            </div>
          ) : results.length === 0 ? (
            <div style={{ color: '#9d7b6a', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              검색 결과가 없습니다
            </div>
          ) : (
            results.map((result, i) => (
              <div
                key={`${result.word}-${i}`}
                style={{
                  marginBottom: i < results.length - 1 ? '16px' : '0',
                  paddingBottom: i < results.length - 1 ? '16px' : '0',
                  borderBottom: i < results.length - 1 ? '1px solid #e9d8c2' : 'none',
                }}
              >
                {/* Reading */}
                {result.reading && (
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '18px',
                        color: '#8b5e3c',
                        fontFamily: 'Noto Serif JP, serif',
                      }}
                    >
                      {result.reading}
                    </span>

                    {result.jlpt && (
                      <span
                        style={{
                          fontSize: '11px',
                          background: jlptColor(result.jlpt),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        {result.jlpt.replace('jlpt-', '').toUpperCase()}
                      </span>
                    )}

                    {result.common && (
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#5a7a5a',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        일상 단어
                      </span>
                    )}
                  </div>
                )}

                {/* Meanings */}
                {result.meanings.map((m, j) => {
                  const partOfSpeech = m.partsOfSpeechKo || m.partsOfSpeech;
                  const meaning = m.korean || m.english;

                  return (
                    <div key={`${result.word}-meaning-${j}`} style={{ marginBottom: '6px' }}>
                      {partOfSpeech && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#9d7b6a',
                            background: '#f0e8d8',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginRight: '6px',
                          }}
                        >
                          {partOfSpeech}
                        </span>
                      )}

                      <span style={{ fontSize: '14px', color: '#3d2b1f' }}>
                        {meaning}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f5ece0',
            borderTop: '1px solid #e9d8c2',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleAddVocab}
            disabled={added}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: added ? '#5a7a5a' : '#8b5e3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: added ? 'default' : 'pointer',
              fontWeight: 'bold',
              transition: 'background 0.2s ease',
            }}
          >
            {added ? '✓ 단어장에 추가됨' : '📖 단어장에 추가'}
          </button>

          <button
            onClick={() => {
              onReadFrom();
              onClose();
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#d4a373',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ▶ 여기서부터 읽기
          </button>
        </div>
      </div>
    </div>
  );
}
