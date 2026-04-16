import React, { Suspense, lazy, startTransition, useCallback, useEffect, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import { createDevActions } from './components/DevMode/devActions.js';
import {
  getGameProgress,
  getActiveCharacterIds,
  getUnlockedItems,
  saveGameProgress,
  saveUnlockedItems,
} from './utils/storage.js';
import { pickRandom } from './data/aiCustomers.js';
import { getActiveAPIConfig, getActiveAPIType } from './config/api.js';
import {
  createSlot,
  hydrateLegacyStorageFromGameState,
  loadSlotGameState,
  migrateFromLocalStorage,
  setActiveSlotId as setActiveSlotInRepository,
  shouldRunMigration,
  syncActiveSlotGameState,
} from './utils/saveRepository.js';
import './App.css';

const GamePage = lazy(() => import('./pages/GamePage.jsx'));
const EncyclopediaPage = lazy(() => import('./pages/EncyclopediaPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const SaveSlotsPage = lazy(() => import('./pages/SaveSlotsPage.jsx'));
const NewGameSetupPage = lazy(() => import('./pages/NewGameSetupPage.jsx'));
const DevPanel = lazy(() => import('./components/DevMode/DevPanel.jsx'));

const ENCYCLOPEDIA_ENABLED = false;

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedAI, setSelectedAI] = useState('workplace');
  const [money, setMoney] = useState(() => {
    const progress = getGameProgress();
    return progress?.money || 0;
  });
  const [unlockedItems, setUnlockedItems] = useState(() => getUnlockedItems());
  const [preloadedFirstCustomer, setPreloadedFirstCustomer] = useState(null);
  const [isPreloadingCustomer, setIsPreloadingCustomer] = useState(false);
  const [devModeVisible, setDevModeVisible] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [isEnteringGame, setIsEnteringGame] = useState(false);
  const devActions = createDevActions();

  useEffect(() => {
    const runMigration = async () => {
      try {
        const shouldMigrate = await shouldRunMigration();
        if (!shouldMigrate) return;
        await migrateFromLocalStorage('迁移存档');
      } catch (error) {
        console.warn('自动迁移跳过:', error?.message || error);
      }
    };

    runMigration();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setDevModeVisible((prev) => !prev);
        console.log('🔧 开发者模式:', !devModeVisible ? '开启' : '关闭');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [devModeVisible]);

  useEffect(() => {
    if (currentPage !== 'home' || preloadedFirstCustomer || isPreloadingCustomer) {
      return;
    }

    setIsPreloadingCustomer(true);

    Promise.all([
      import('./utils/aiService.js'),
      import('./data/aiCustomers.js'),
    ])
      .then(async ([aiService, customerData]) => {
        const activeCharacterIds = getActiveCharacterIds();
        if (activeCharacterIds.length > 0) {
          const roleId = pickRandom(activeCharacterIds);
          return aiService.generateCustomerFromCharacterId(roleId);
        }
        return aiService.generateCustomer(customerData.pickRandom(customerData.ALL_CATEGORY_IDS));
      })
      .then((customer) => {
        setPreloadedFirstCustomer(customer);
        console.log('✅ 第一个顾客预加载完成:', customer.name);
      })
      .catch((error) => {
        console.error('❌ 预加载顾客失败:', error);
        setPreloadedFirstCustomer(null);
      })
      .finally(() => {
        setIsPreloadingCustomer(false);
      });
  }, [currentPage, isPreloadingCustomer, preloadedFirstCustomer]);

  useEffect(() => {
    const progress = getGameProgress() || {};
    saveGameProgress({ ...progress, money });
    if (activeSlotId) {
      syncActiveSlotGameState('money_changed').catch(() => {});
    }
  }, [money, activeSlotId]);

  useEffect(() => {
    saveUnlockedItems(unlockedItems);
    if (activeSlotId) {
      syncActiveSlotGameState('unlocked_changed').catch(() => {});
    }
  }, [unlockedItems, activeSlotId]);

  const checkAIConnectivity = useCallback(async () => {
    const apiType = getActiveAPIType();
    const config = getActiveAPIConfig();

    if (apiType === 'mock') {
      return true;
    }

    try {
      let response;

      if (apiType === 'deepseek') {
        response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: 'Reply with OK.' }],
            max_tokens: 16,
          }),
        });
      } else {
        const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;

        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'hi' }] }],
            generationConfig: { maxOutputTokens: 16 },
          }),
        });
      }

      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const enterGameWithSlot = useCallback(async (slotId) => {
    if (!slotId) return false;
    setIsEnteringGame(true);

    try {
      const isApiReady = await checkAIConnectivity();
      if (!isApiReady) {
        window.alert('AI 连接失败，请检查 API 设置后重试。');
        return false;
      }

      const gameState = await loadSlotGameState(slotId);
      hydrateLegacyStorageFromGameState(gameState);

      const progress = getGameProgress() || {};
      setMoney(progress.money || 0);
      setUnlockedItems(getUnlockedItems());

      setActiveSlotInRepository(slotId);
      setActiveSlotId(slotId);
      setSelectedAI('workplace');
      startTransition(() => {
        setCurrentPage('game');
      });
      return true;
    } catch (error) {
      window.alert(`读取存档失败：${error?.message || '未知错误'}`);
      return false;
    } finally {
      setIsEnteringGame(false);
    }
  }, [checkAIConnectivity]);

  const handleOpenNewGameSetup = useCallback(() => {
    if (isEnteringGame) return;
    startTransition(() => {
      setCurrentPage('new_game_setup');
    });
  }, [isEnteringGame]);

  const handleStartNewGame = useCallback(async () => {
    if (isEnteringGame) return;

    try {
      setIsEnteringGame(true);
      const created = await createSlot();
      const slotId = created?.slotId;
      if (!slotId) {
        window.alert('新建存档失败。');
        return;
      }

      await enterGameWithSlot(slotId);
    } catch (error) {
      window.alert(`新建存档失败：${error?.message || '未知错误'}`);
    } finally {
      setIsEnteringGame(false);
    }
  }, [enterGameWithSlot, isEnteringGame]);

  const handleBackToHome = () => {
    if (activeSlotId) {
      syncActiveSlotGameState('back_to_home').catch(() => {});
    }
    startTransition(() => {
      setCurrentPage('home');
    });
    setSelectedAI('workplace');
    setPreloadedFirstCustomer(null);
  };

  const handleNavigate = (page) => {
    startTransition(() => {
      setCurrentPage(page);
    });
  };

  const handleToggleDevMode = useCallback(() => {
    setDevModeVisible((prev) => !prev);
    console.log('🔧 开发者模式:', !devModeVisible ? '开启' : '关闭');
  }, [devModeVisible]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onNewGame={handleOpenNewGameSetup}
            onLoadGame={() => handleNavigate('save_slots')}
            onNavigate={handleNavigate}
            money={money}
            onToggleDevMode={handleToggleDevMode}
          />
        );
      case 'new_game_setup':
        return (
          <NewGameSetupPage
            onBack={handleBackToHome}
            onConfirmStart={handleStartNewGame}
            loading={isEnteringGame}
          />
        );
      case 'save_slots':
        return (
          <SaveSlotsPage
            onBack={handleBackToHome}
            onLoadSlot={(slotId) => enterGameWithSlot(slotId)}
            onCreateAndStart={handleOpenNewGameSetup}
          />
        );
      case 'game':
        return (
          <GamePage
            aiType={selectedAI}
            activeSlotId={activeSlotId}
            onBack={handleBackToHome}
            money={money}
            setMoney={setMoney}
            unlockedItems={unlockedItems}
            setUnlockedItems={setUnlockedItems}
            devModeVisible={devModeVisible}
            setDevModeVisible={setDevModeVisible}
            devActions={devActions}
            preloadedFirstCustomer={preloadedFirstCustomer}
            onCustomerUsed={() => setPreloadedFirstCustomer(null)}
          />
        );
      case 'encyclopedia':
        return ENCYCLOPEDIA_ENABLED
          ? <EncyclopediaPage onBack={handleBackToHome} />
          : (
            <HomePage
              onNewGame={handleOpenNewGameSetup}
              onLoadGame={() => handleNavigate('save_slots')}
              onNavigate={handleNavigate}
              money={money}
              onToggleDevMode={handleToggleDevMode}
            />
          );
      case 'settings':
        return <SettingsPage onBack={handleBackToHome} />;
      default:
        return (
          <HomePage
            onNewGame={handleOpenNewGameSetup}
            onLoadGame={() => handleNavigate('save_slots')}
            onNavigate={handleNavigate}
            money={money}
            onToggleDevMode={handleToggleDevMode}
          />
        );
    }
  };

  return (
    <div className="app">
      <Suspense
        fallback={(
          <div className="app-loading">
            <div className="app-loading__panel">加载中...</div>
          </div>
        )}
      >
        {renderPage()}

        {currentPage !== 'game' && devModeVisible && (
          <DevPanel
            isVisible={devModeVisible}
            onClose={() => setDevModeVisible(false)}
            money={money}
            setMoney={setMoney}
            unlockedItems={unlockedItems}
            setUnlockedItems={setUnlockedItems}
            devActions={devActions}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
