import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Toast from '../components/Common/Toast.jsx';
import PrologueScreen from '../components/Prologue/PrologueScreen.jsx';
import audioManager from '../utils/audioManager.js';
import { getSettings, saveSettings } from '../utils/storage.js';
import './HomePage.css';

const ENCYCLOPEDIA_ENABLED = false;
const HOME_INTRO_SEEN_SESSION_KEY = 'bartender_home_intro_seen_session';

const hasSeenHomeIntroThisSession = () => {
  try {
    return sessionStorage.getItem(HOME_INTRO_SEEN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
};

const markHomeIntroSeenThisSession = () => {
  try {
    sessionStorage.setItem(HOME_INTRO_SEEN_SESSION_KEY, 'true');
  } catch {
    // ignore session storage failures
  }
};

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

  const shouldPlayHomeIntro = !hasSeenHomeIntroThisSession();
  const [showTransition, setShowTransition] = useState(shouldPlayHomeIntro);
  const [transitionPhase, setTransitionPhase] = useState('headphone');
  const [showPrologue, setShowPrologue] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !shouldPlayHomeIntro);
  const [splashPhase, setSplashPhase] = useState(showSplash ? 'intro' : null);
  const [splashLift, setSplashLift] = useState(0);

  const unseenAchievements = 0;

  useEffect(() => {
    if (!showTransition) return undefined;

    const timer = setTimeout(() => {
      setTransitionPhase('music');
    }, 2000);

    return () => clearTimeout(timer);
  }, [showTransition]);

  useEffect(() => {
    if (!showPrologue && !showTransition) {
      const settings = getSettings();
      audioManager.setBGMVolume(settings?.musicVolume ?? 0.5);
      audioManager.setSFXVolume(settings?.sfxVolume ?? 0.7);
      audioManager.setMuted(settings?.soundEnabled === false);
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
    const currentSettings = getSettings();
    saveSettings({
      ...currentSettings,
      soundEnabled: enableMusic
    });

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
  const controlsClassName = [
    'home-controls',
    isSplashHiding ? 'home-controls-splash-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const controlsStyle = isSplashHiding
    ? { opacity: 0, visibility: 'hidden', pointerEvents: 'none' }
    : undefined;

  return (
    <div className="home-page">
      <div className="home-video-background" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0 }}>
          <video 
            src="/asset/场景/外景（开始界面）.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div className="home-content-layer" style={{ position: "relative", zIndex: 50, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

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

        <div className={controlsClassName} ref={controlsRef} style={controlsStyle}>
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
            markHomeIntroSeenThisSession();
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
      </div>
  );
};

export default HomePage;
