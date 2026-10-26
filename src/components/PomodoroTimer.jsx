import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Volume2, VolumeX, X, Flame } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { pushService } from '../lib/pushNotificationService';

export const PomodoroTimer = ({ currentTask = null, onLogStudyTime = null, onClose = null }) => {
  const { addToast, triggerConfetti } = useToast();

  const [mode, setMode] = useState('focus'); // 'focus' (25 min) or 'break' (5 min)
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  useEffect(() => {
    let timer = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (mode === 'focus') {
        triggerConfetti();
        addToast('🎉 25-minute study focus session completed! Take a 5-minute breather.', 'success');
        pushService.notifyPomodoroFinished(currentTask?.title || 'Academic Study Session');
        setCompletedSessions((prev) => prev + 1);
        if (currentTask && onLogStudyTime) {
          onLogStudyTime(currentTask.id, 25);
        }
        setMode('break');
        setTimeLeft(5 * 60);
        setIsRunning(false);
      } else {
        addToast('☕ Break over! Ready for the next focus sprint?', 'info');
        pushService.sendNotification('☕ Break Time Over!', {
          body: 'Ready for your next 25-minute study sprint? Jump back in!',
          tag: 'pomodoro_break_over',
        });
        setMode('focus');
        setTimeLeft(25 * 60);
        setIsRunning(false);
      }
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft, mode, currentTask]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = mode === 'focus' ? 25 * 60 : 5 * 60;
  const progressPct = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-xl)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative gradient glow */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: mode === 'focus' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(20, 184, 166, 0.25)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: mode === 'focus' ? '#4F46E5' : '#0D9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mode === 'focus' ? <Flame size={18} color="#FFD700" /> : <Coffee size={18} color="#A7F3D0" />}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              Pomodoro Study Focus
            </div>
            <div style={{ fontSize: '0.725rem', color: '#C7D2FE' }}>
              {currentTask ? `Task: ${currentTask.title}` : 'Select a to-do item to track study time'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            🔥 {completedSessions} sessions done
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', padding: '4px', display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Mode Switches */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => switchMode('focus')}
          style={{
            background: mode === 'focus' ? '#4F46E5' : 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: `1px solid ${mode === 'focus' ? '#818CF8' : 'transparent'}`,
            padding: '5px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <BookOpen size={14} />
          <span>25 Min Focus</span>
        </button>

        <button
          type="button"
          onClick={() => switchMode('break')}
          style={{
            background: mode === 'break' ? '#0D9488' : 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: `1px solid ${mode === 'break' ? '#2DD4BF' : 'transparent'}`,
            padding: '5px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Coffee size={14} />
          <span>5 Min Break</span>
        </button>
      </div>

      {/* Timer Display */}
      <div style={{ textAlign: 'center', margin: '14px 0' }}>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '3.5rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            lineHeight: 1,
            color: '#FFFFFF',
            textShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          {formattedTime}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#A5B4FC', marginTop: '6px' }}>
          {isRunning
            ? mode === 'focus'
              ? 'Deep study mode activated... Keep your phone away!'
              : 'Relax your eyes, stretch, take a sip of water!'
            : 'Press Start when you are ready to study'}
        </div>
      </div>

      {/* Progress Line */}
      <div
        style={{
          width: '100%',
          height: 6,
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '999px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: '100%',
            background: mode === 'focus' ? 'linear-gradient(90deg, #818CF8, #C084FC)' : '#2DD4BF',
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Timer Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          style={{
            background: isRunning ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            padding: '10px 24px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.925rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'transform 0.1s ease',
          }}
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
          <span>{isRunning ? 'Pause Session' : 'Start Focus Sprint'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
          title="Reset Timer"
        >
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
