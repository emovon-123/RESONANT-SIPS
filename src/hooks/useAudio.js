import { useState, useEffect, useCallback } from 'react';
import audioManager from '../utils/audioManager.js';

/**
 * 音频控制 Hook
 * 提供背景音乐和音效的播放控制
 */
export const useAudio = () => {
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [bgmVolume, setBgmVolumeState] = useState(0.15); // 调小默认 BGM 音量
  const [sfxVolume, setSfxVolumeState] = useState(0.5);

  // 初始化
  useEffect(() => {
    // 从本地存储恢复设置
    const savedSettings = localStorage.getItem('bartender_audio_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setBgmVolumeState(settings.bgmVolume ?? 0.15);
        setSfxVolumeState(settings.sfxVolume ?? 0.5);
        setIsMuted(settings.isMuted ?? false);
        
        audioManager.setBGMVolume(settings.bgmVolume ?? 0.15);
        audioManager.setSFXVolume(settings.sfxVolume ?? 0.5);
        audioManager.setMuted(settings.isMuted ?? false);
      } catch (e) {
        console.error('加载音频设置失败:', e);
      }
    }
  }, []);

  // 保存设置
  const saveSettings = useCallback((settings) => {
    localStorage.setItem('bartender_audio_settings', JSON.stringify(settings));
  }, []);

  // 初始化音频（需要用户交互）
  const initAudio = useCallback(() => {
    audioManager.init();
  }, []);

  // 播放背景音乐
  const playBGM = useCallback(() => {
    audioManager.init();
    audioManager.playBGM();
    setIsBgmPlaying(true);
  }, []);

  // 停止背景音乐
  const stopBGM = useCallback(() => {
    audioManager.stopBGM();
    setIsBgmPlaying(false);
  }, []);

  // 切换背景音乐
  const toggleBGM = useCallback(() => {
    audioManager.init();
    const isPlaying = audioManager.toggleBGM();
    setIsBgmPlaying(isPlaying);
    return isPlaying;
  }, []);

  // 播放音效
  const playSFX = useCallback((type) => {
    audioManager.init();
    audioManager.playSFX(type);
  }, []);

  // 设置背景音乐音量
  const setBgmVolume = useCallback((volume) => {
    setBgmVolumeState(volume);
    audioManager.setBGMVolume(volume);
    saveSettings({ bgmVolume: volume, sfxVolume, isMuted });
  }, [sfxVolume, isMuted, saveSettings]);

  // 设置音效音量
  const setSfxVolume = useCallback((volume) => {
    setSfxVolumeState(volume);
    audioManager.setSFXVolume(volume);
    saveSettings({ bgmVolume, sfxVolume: volume, isMuted });
  }, [bgmVolume, isMuted, saveSettings]);

  // 设置静音
  const setMuted = useCallback((muted) => {
    setIsMuted(muted);
    audioManager.setMuted(muted);
    if (muted) {
      setIsBgmPlaying(false);
    }
    saveSettings({ bgmVolume, sfxVolume, isMuted: muted });
  }, [bgmVolume, sfxVolume, saveSettings]);

  // 切换静音
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setMuted(newMuted);
    return newMuted;
  }, [isMuted, setMuted]);

  return {
    // 状态
    isBgmPlaying,
    isMuted,
    bgmVolume,
    sfxVolume,
    
    // 方法
    initAudio,
    playBGM,
    stopBGM,
    toggleBGM,
    playSFX,
    setBgmVolume,
    setSfxVolume,
    setMuted,
    toggleMute
  };
};

export default useAudio;
