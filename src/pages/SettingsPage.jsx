import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, clearAllCache, getStorageUsage } from '../utils/storage.js';
import { DEBUG_CONFIG, getActiveAPIConfig, getActiveAPIName, getActiveAPIType } from '../config/api.js';
import { clearAvatarCache, getAvatarCacheStats } from '../utils/avatarCache.js';
import './SettingsPage.css';

/**
 * 设置页
 * 功能：音效开关、缓存清理、API配置、调试选项
 */
const SettingsPage = ({ onBack }) => {
  const [settings, setSettings] = useState(getSettings());
  const [storageInfo, setStorageInfo] = useState(getStorageUsage());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [avatarCacheStats, setAvatarCacheStats] = useState({ count: 0, maxSize: 50 });

  // 🆕 加载头像缓存统计
  useEffect(() => {
    getAvatarCacheStats().then(setAvatarCacheStats);
  }, []);

  // 更新设置
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // 清除缓存
  const handleClearCache = () => {
    if (showClearConfirm) {
      clearAllCache();
      setStorageInfo(getStorageUsage());
      setShowClearConfirm(false);
      // 刷新页面以重置所有状态
      window.location.reload();
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1>⚙️ 设置</h1>
      </div>

      <div className="settings-content">
        {/* 音效设置 */}
        <section className="settings-section">
          <h2>🔊 音效设置</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>音效开关</label>
              <p className="setting-description">启用/禁用游戏音效</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>音乐音量</label>
              <p className="setting-description">背景音乐音量</p>
            </div>
            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.musicVolume}
                onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))}
                disabled={!settings.soundEnabled}
              />
              <span className="volume-value">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>音效音量</label>
              <p className="setting-description">按钮、操作音效音量</p>
            </div>
            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.sfxVolume}
                onChange={(e) => updateSetting('sfxVolume', parseFloat(e.target.value))}
                disabled={!settings.soundEnabled}
              />
              <span className="volume-value">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
          </div>
        </section>

        {/* 🆕 背景特效 */}
        <section className="settings-section">
          <h2>✨ 背景特效</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>特效等级</label>
              <p className="setting-description">游戏页面背景动画强度</p>
            </div>
            <select
              className="effects-select"
              value={localStorage.getItem('bartender_effects_level') || 'full'}
              onChange={(e) => {
                localStorage.setItem('bartender_effects_level', e.target.value);
                // 强制组件刷新
                updateSetting('effectsLevel', e.target.value);
              }}
            >
              <option value="full">完整</option>
              <option value="reduced">精简（仅光晕）</option>
              <option value="off">关闭</option>
            </select>
          </div>
        </section>

        {/* 存储管理 */}
        <section className="settings-section">
          <h2>💾 存储管理</h2>
          
          <div className="storage-info">
            <div className="storage-item">
              <span className="storage-label">已使用存储</span>
              <span className="storage-value">{storageInfo?.usedKB} KB</span>
            </div>
            <div className="storage-item">
              <span className="storage-label">约 {storageInfo?.usedMB} MB</span>
            </div>
          </div>

          {/* 🆕 头像设置 */}
          <div className="setting-item" style={{ marginBottom: '12px' }}>
            <div className="setting-info">
              <label>AI 头像生成</label>
              <p className="setting-description">为每位顾客生成赛博朋克风格头像（需要网络）</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.avatarEnabled !== false}
                onChange={(e) => updateSetting('avatarEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="storage-info" style={{ marginBottom: '12px' }}>
            <div className="storage-item">
              <span className="storage-label">头像缓存</span>
              <span className="storage-value">{avatarCacheStats.count} / {avatarCacheStats.maxSize} 张</span>
            </div>
            <button
              className="clear-cache-button"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={async () => {
                await clearAvatarCache();
                setAvatarCacheStats({ count: 0, maxSize: avatarCacheStats.maxSize });
              }}
            >
              清空头像缓存
            </button>
          </div>

          <button 
            className={`clear-cache-button ${showClearConfirm ? 'confirm' : ''}`}
            onClick={handleClearCache}
          >
            {showClearConfirm ? '⚠️ 再次点击确认清除' : '🗑️ 清除所有缓存'}
          </button>
          
          <p className="cache-warning">
            ⚠️ 清除缓存将删除所有游戏进度、对话记录和解锁内容
          </p>
        </section>

        {/* API配置（仅调试模式显示） */}
        {import.meta.env.VITE_DEBUG_MODE === 'true' && (
        <section className="settings-section">
          <h2>🤖 AI配置</h2>

          <div className="api-status">
            <div className="status-item">
              <span className="status-label">当前模式</span>
              <span className={`status-badge ${getActiveAPIType() === 'none' ? 'mock' : 'gemini'}`}>
                {getActiveAPIType() === 'none' ? '未配置' : getActiveAPIName()}
              </span>
            </div>
            {getActiveAPIType() !== 'none' && (
              <div className="status-item">
                <span className="status-label">模型</span>
                <span className="status-badge gemini">
                  {getActiveAPIConfig()?.model || '-'}
                </span>
              </div>
            )}
          </div>

          <p className="api-info">
            {getActiveAPIType() !== 'none'
              ? <>✅ 当前使用 <strong>{getActiveAPIName()}</strong>（{getActiveAPIConfig()?.model || '-'}）。</>
              : <>⚠️ 未配置可用 API Key，请在 <strong>.env.local</strong> 中配置后重启。</>}
            <br />
            AI回应将由真实的大语言模型生成，体验更加智能自然。
          </p>
        </section>
        )}

        {/* 调试选项（仅调试模式显示） */}
        {import.meta.env.VITE_DEBUG_MODE === 'true' && (
        <section className="settings-section">
          <h2>🐛 调试选项</h2>

          <div className="debug-info">
            <div className="debug-item">
              <span>显示情绪参数</span>
              <span className="debug-status">{DEBUG_CONFIG.showEmotionParams ? '✓' : '×'}</span>
            </div>
            <div className="debug-item">
              <span>显示信任度</span>
              <span className="debug-status">{DEBUG_CONFIG.showTrustLevel ? '✓' : '×'}</span>
            </div>
            <div className="debug-item">
              <span>显示配方适配性</span>
              <span className="debug-status">{DEBUG_CONFIG.showCompatibility ? '✓' : '×'}</span>
            </div>
            <div className="debug-item">
              <span>控制台打印Prompt</span>
              <span className="debug-status">{DEBUG_CONFIG.logPrompts ? '✓' : '×'}</span>
            </div>
          </div>

          <p className="debug-info-text">
            💡 调试选项可在 <code>src/config/api.js</code> 中修改
          </p>
        </section>
        )}

        {/* 关于 */}
        <section className="settings-section">
          <h2>ℹ️ 关于游戏</h2>
          
          <div className="about-info">
            <p><strong>Mixologist</strong></p>
            <p>版本：1.1.0</p>
            <p className="about-description">
              通过与AI顾客的多轮对话，识别其真实情绪，
              为TA调制专属鸡尾酒，改变情绪状态。
            </p>
            <p className="tech-stack">
              技术栈：React 18 · Vite · LocalStorage
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
