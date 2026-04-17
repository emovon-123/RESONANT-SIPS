import React, { useEffect, useState } from 'react';
import Toast from '../components/Common/Toast.jsx';
import {
  addCustomCharacterId,
  canDisableCharacter,
  getActiveCharacterIds,
  getCustomCharacterIds,
  removeCustomCharacterId,
  saveActiveCharacterIds,
} from '../utils/storage.js';
import { isPresetCharacterId } from '../config/defaultCharacters/index.js';
import { ensureStoryworldCharacterCached } from '../utils/storyworldRepository.js';
import './NewGameSetupPage.css';

const NewGameSetupPage = ({ onBack, onConfirmStart, onCharacterPoolChange, loading = false }) => {
  const [customCharacterInput, setCustomCharacterInput] = useState('');
  const [customCharacterIds, setCustomCharacterIds] = useState([]);
  const [activeCharacterIds, setActiveCharacterIds] = useState([]);
  const [toastList, setToastList] = useState([]);
  const hasActiveCharacters = activeCharacterIds.length > 0;

  useEffect(() => {
    setCustomCharacterIds(getCustomCharacterIds());
    setActiveCharacterIds(getActiveCharacterIds());
  }, []);

  const pushToast = (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToastList((prev) => [...prev, { id, message, type }]);
  };

  const handleAddCharacter = async () => {
    const candidateId = String(customCharacterInput || '').trim();
    if (!candidateId) {
      pushToast('请输入角色ID', 'warning');
      return;
    }

    if (customCharacterIds.includes(candidateId)) {
      pushToast('该角色已添加', 'warning');
      return;
    }

    try {
      await ensureStoryworldCharacterCached(candidateId);
    } catch (error) {
      const reason = String(error?.message || '');
      if (reason.includes('character_not_found')) {
        pushToast('未找到该角色ID，请确认后重试', 'warning');
      } else {
        pushToast(`角色读取失败：${reason || '未知错误'}`, 'error');
      }
      return;
    }

    const result = addCustomCharacterId(candidateId);
    if (!result.ok) {
      if (result.reason === 'invalid_format') {
        pushToast('角色ID仅允许字母、数字、下划线和短横线', 'warning');
      } else if (result.reason === 'duplicate') {
        pushToast('该角色已添加', 'warning');
      } else {
        pushToast('添加角色失败', 'error');
      }
      return;
    }

    setCustomCharacterIds(getCustomCharacterIds());
    setActiveCharacterIds(getActiveCharacterIds());
    setCustomCharacterInput('');
    onCharacterPoolChange?.();
    pushToast('角色已添加并默认启用', 'success');
  };

  const handleRemoveCharacter = (id) => {
    if (!canDisableCharacter(id, customCharacterIds)) {
      pushToast('请先添加至少一个非预置角色，再取消默认角色。', 'warning');
      return;
    }
    removeCustomCharacterId(id);
    setCustomCharacterIds(getCustomCharacterIds());
    setActiveCharacterIds(getActiveCharacterIds());
    onCharacterPoolChange?.();
    pushToast(`已移除角色 ${id}`, 'info');
  };

  const handleToggleCharacter = (id, checked) => {
    if (!checked && !canDisableCharacter(id, customCharacterIds)) {
      pushToast('请先添加至少一个非预置角色，再取消默认角色。', 'warning');
      return;
    }
    const current = getActiveCharacterIds();
    const next = checked
      ? Array.from(new Set([...current, id]))
      : current.filter((item) => item !== id);
    const saved = saveActiveCharacterIds(next);
    setActiveCharacterIds(saved);
    onCharacterPoolChange?.();
  };

  const handleConfirmStart = () => {
    if (!hasActiveCharacters) {
      pushToast('请至少启用一个角色ID后再开始。', 'warning');
      return;
    }
    onConfirmStart?.();
  };

  return (
    <div className="newgame-setup-page">
      <div className="newgame-setup-panel">
        <h1 className="newgame-setup-title">新游戏配置</h1>
        <p className="newgame-setup-desc">先配置可出现角色，再开始新游戏。当前为仅自定义角色模式。</p>

        <section className="newgame-role-panel">
          <div className="newgame-role-title">角色池管理</div>
          <p className="newgame-role-hint">输入角色ID（例如 5738g），可勾选是否允许在当日出现。</p>

          <div className="newgame-role-input-row">
            <input
              className="newgame-role-input"
              value={customCharacterInput}
              onChange={(event) => setCustomCharacterInput(event.target.value)}
              placeholder="输入角色ID"
              maxLength={64}
            />
            <button className="newgame-role-add-btn" onClick={handleAddCharacter} disabled={loading}>添加</button>
          </div>

          <div className="newgame-role-list">
            {customCharacterIds.length === 0 && (
              <div className="newgame-role-empty">暂无已添加角色。请先添加至少一个角色ID。</div>
            )}
            {customCharacterIds.map((id) => {
              const locked = !canDisableCharacter(id, customCharacterIds);
              const isPreset = isPresetCharacterId(id);
              return (
                <div className="newgame-role-item" key={id}>
                  <label className="newgame-role-main">
                    <input
                      type="checkbox"
                      checked={activeCharacterIds.includes(id)}
                      onChange={(event) => handleToggleCharacter(id, event.target.checked)}
                      disabled={loading || (locked && activeCharacterIds.includes(id))}
                    />
                    <span>{id}{isPreset ? '（默认）' : ''}</span>
                  </label>
                  <button
                    className="newgame-role-remove-btn"
                    onClick={() => handleRemoveCharacter(id)}
                    disabled={loading || locked}
                  >
                    移除
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <div className="newgame-actions">
          <button className="newgame-back-btn" onClick={onBack} disabled={loading}>返回</button>
          <button className="newgame-start-btn" onClick={handleConfirmStart} disabled={loading || !hasActiveCharacters}>
            {loading ? '创建中...' : '开始新游戏'}
          </button>
        </div>
      </div>

      {toastList.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToastList((prev) => prev.filter((item) => item.id !== toast.id))}
        />
      ))}
    </div>
  );
};

export default NewGameSetupPage;
