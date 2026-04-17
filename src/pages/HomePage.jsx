import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Toast from '../components/Common/Toast.jsx';
import PrologueScreen from '../components/Prologue/PrologueScreen.jsx';
import { getAchievements } from '../utils/storage.js';
import audioManager from '../utils/audioManager.js';
import './HomePage.css';

const ENCYCLOPEDIA_ENABLED = false;

const COPY = {
  titleIcon: '\u{1F378}',
  startIcon: '\u{1F378}',
  loadIcon: '\u{1F4BE}',
  encyclopediaIcon: '\u{1F4D6}',
  settingsIcon: '\u2699\uFE0F',
  headphoneIcon: '\u{1F3A7}',
  musicIcon: '\u{1F3B5}',
  description: '\u901A\u8FC7\u5BF9\u8BDD\u4E86\u89E3\u987E\u5BA2\u7684\u771F\u5B9E\u60C5\u7EEA\uFF0C\u8C03\u5236\u4E13\u5C5E\u9E21\u5C3E\u9152',
  newGame: '\u65B0\u7684\u6E38\u620F',
  loadGame: '\u8BFB\u53D6\u5B58\u6863',
  encyclopedia: '\u56FE\u9274',
  settings: '\u8BBE\u7F6E',
  headphoneHint: '\u5EFA\u8BAE\u4F69\u6234\u8033\u673A',
  musicQuestion: '\u662F\u5426\u6253\u5F00\u97F3\u4E50\uFF1F',
  open: '\u6253\u5F00',
  close: '\u5173\u95ED',
  apiError: 'AI \u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 API \u8BBE\u7F6E',
};

const HomePage = ({
  onNewGame,
  onLoadGame,
  onNavigate,
  money = 0,
  onToggleDevMode,
}) => {
  const [toastList, setToastList] = useState([]);
  const controlsRef = useRef(null);

  const isFirstVisit = !localStorage.getItem('bartender_has_seen_prologue');
  const [showTransition, setShowTransition] = useState(isFirstVisit);
  const [transitionPhase, setTransitionPhase] = useState('headphone');
  const [showPrologue, setShowPrologue] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !isFirstVisit);
  const [splashPhase, setSplashPhase] = useState(showSplash ? 'intro' : null);
  const [splashLift, setSplashLift] = useState(0);

  const unseenAchievements = ENCYCLOPEDIA_ENABLED
    ? Object.values(getAchievements()).filter((achievement) => !achievement.seen).length
    : 0;

  useEffect(() => {
    if (!showTransition) return undefined;

    const timer = setTimeout(() => {
      setTransitionPhase('music');
    }, 2000);

    return () => clearTimeout(timer);
  }, [showTransition]);

  useEffect(() => {
    if (!showPrologue && !showTransition) {
      audioManager.init();
      audioManager.playBGM('home');
    }
  }, [showPrologue, showTransition]);

  useEffect(() => {
    if (!showSplash) return undefined;

    const revealTimer = setTimeout(() => setSplashPhase('reveal'), 1800);
    const removeTimer = setTimeout(() => {
      setSplashPhase(null);
      setShowSplash(false);
    }, 4200);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(removeTimer);
    };
  }, [showSplash]);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;

    const measureLift = () => {
      const nextLift = Math.ceil(controls.getBoundingClientRect().height);
      setSplashLift((prevLift) => (prevLift === nextLift ? prevLift : nextLift));
    };

    measureLift();

    let frameId = window.requestAnimationFrame(measureLift);
    let observer;

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measureLift);
      observer.observe(controls);
    }

    window.addEventListener('resize', measureLift);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measureLift);
      if (observer) observer.disconnect();
    };
  }, [unseenAchievements]);

  const handleMusicChoice = (enableMusic) => {
    audioManager.init();

    if (enableMusic) {
      audioManager.setMuted(false);
    } else {
      audioManager.setMuted(true);
      audioManager.stopBGM();
    }

    setShowTransition(false);
    setShowPrologue(true);
  };

  const handleRemoveToast = (id) => {
    setToastList((prev) => prev.filter((toast) => toast.id !== id));
  };

  const isSplashHiding = splashPhase === 'intro';
  const isSplashRevealing = splashPhase === 'reveal';
  const headerClassName = [
    'home-header',
    showSplash ? 'home-header-splash' : '',
    showSplash && isSplashRevealing ? 'phase-reveal' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="home-page">
      <div className="home-bg-layer">
        <div className="neon-line" />
        <div className="neon-line" />
        <div className="neon-line" />

        <div className="home-rain">
          {Array.from({ length: 35 }).map((_, index) => (
            <div
              key={index}
              className="home-raindrop"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${0.7 + Math.random() * 0.8}s`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: 0.08 + Math.random() * 0.15,
              }}
            />
          ))}
        </div>

        <div className="home-particles">
          {Array.from({ length: 25 }).map((_, index) => (
            <div
              key={index}
              className="home-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${4 + Math.random() * 6}s`,
                animationDelay: `${Math.random() * 4}s`,
                width: `${1.5 + Math.random() * 2.5}px`,
                height: `${1.5 + Math.random() * 2.5}px`,
              }}
            />
          ))}
        </div>

        <div className="home-scanlines" />
        <div className="home-glow home-glow-1" />
        <div className="home-glow home-glow-2" />
        <div className="home-glow home-glow-3" />
      </div>

      {showSplash && (
        <div className={`splash-overlay ${isSplashRevealing ? 'phase-reveal' : ''}`} />
      )}

      <div className="home-center">
        <div
          className={headerClassName}
          style={showSplash ? { '--splash-lift': `${splashLift}px` } : undefined}
        >
          <div className="title-icon">{COPY.titleIcon}</div>
          <h1 className="game-title">Resonant Sips</h1>
          <p className="game-description">{COPY.description}</p>
        </div>

        <div className="home-controls" ref={controlsRef}>
            <button
              className={`start-button ${isSplashHiding ? 'splash-hidden' : isSplashRevealing ? 'splash-reveal-delay1' : ''}`}
              onClick={onNewGame}
            >
              <span className="start-icon">{COPY.startIcon}</span>
              <span className="start-text">{COPY.newGame}</span>
            </button>

            <button
              className={`start-button ${isSplashHiding ? 'splash-hidden' : isSplashRevealing ? 'splash-reveal-delay1' : ''}`}
              onClick={onLoadGame}
            >
              <span className="start-icon">{COPY.loadIcon}</span>
              <span className="start-text">{COPY.loadGame}</span>
            </button>

          <div className={`home-nav-buttons ${isSplashHiding ? 'splash-hidden' : isSplashRevealing ? 'splash-reveal-delay2' : ''}`}>
            {ENCYCLOPEDIA_ENABLED && (
              <button
                className="nav-button encyclopedia"
                onClick={() => onNavigate && onNavigate('encyclopedia')}
              >
                <span className="nav-icon">{COPY.encyclopediaIcon}</span>
                <span className="nav-text">{COPY.encyclopedia}</span>
                {unseenAchievements > 0 && <span className="nav-badge">{unseenAchievements}</span>}
              </button>
            )}
            <button
              className="nav-button settings"
              onClick={() => onNavigate && onNavigate('settings')}
            >
              <span className="nav-icon">{COPY.settingsIcon}</span>
              <span className="nav-text">{COPY.settings}</span>
            </button>
          </div>
        </div>
      </div>

      {toastList.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => handleRemoveToast(toast.id)}
        />
      ))}

      {showPrologue && (
        <PrologueScreen
          onComplete={() => {
            localStorage.setItem('bartender_has_seen_prologue', 'true');
            setShowPrologue(false);
            setShowSplash(true);
            setSplashPhase('intro');
          }}
        />
      )}

      {showTransition && (
        <div className="transition-overlay">
          <div className={`transition-headphone ${transitionPhase === 'music' ? 'fade-out' : ''}`}>
            <div className="headphone-icon">{COPY.headphoneIcon}</div>
            <p className="headphone-text">{COPY.headphoneHint}</p>
          </div>

          {transitionPhase === 'music' && (
            <div className="music-dialog">
              <div className="music-dialog-content">
                <div className="music-dialog-icon">{COPY.musicIcon}</div>
                <p className="music-dialog-title">{COPY.musicQuestion}</p>
                <div className="music-dialog-buttons">
                  <button className="music-btn music-btn-yes" onClick={() => handleMusicChoice(true)}>
                    {COPY.open}
                  </button>
                  <button className="music-btn music-btn-no" onClick={() => handleMusicChoice(false)}>
                    {COPY.close}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;
