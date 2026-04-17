import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createSlot,
  deleteSlot,
  listSlots,
  renameSlot,
} from '../utils/saveRepository.js';
import './SaveSlotsPage.css';

const formatTime = (value) => {
  if (!value) return '未进入';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '未知';
  }
};

const SaveSlotsPage = ({ onBack, onLoadSlot, onCreateAndStart }) => {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const refreshSlots = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await listSlots();
      setSlots(list);
    } catch {
      setError('读取存档失败，请确认本地存档服务已启动。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  const handleCreateOnly = useCallback(async () => {
    setIsCreating(true);
    setError('');
    try {
      await createSlot();
      await refreshSlots();
    } catch {
      setError('创建存档失败，请稍后重试。');
    } finally {
      setIsCreating(false);
    }
  }, [refreshSlots]);

  const handleRename = useCallback(async (slot) => {
    const nextName = window.prompt('输入新的存档名：', slot.name || '');
    if (!nextName || !nextName.trim()) return;

    try {
      await renameSlot(slot.slotId, nextName.trim());
      await refreshSlots();
    } catch {
      setError('重命名失败。');
    }
  }, [refreshSlots]);

  const handleDelete = useCallback(async (slot) => {
    const confirmed = window.confirm(`确定删除存档「${slot.name || slot.slotId}」吗？此操作不可恢复。`);
    if (!confirmed) return;

    try {
      await deleteSlot(slot.slotId);
      await refreshSlots();
    } catch {
      setError('删除失败。');
    }
  }, [refreshSlots]);

  const content = useMemo(() => {
    if (isLoading) {
      return <div className="save-slots-empty">正在读取存档...</div>;
    }

    if (slots.length === 0) {
      return (
        <div className="save-slots-empty">
          <p>当前没有可读取的存档。</p>
          <button className="save-slots-primary" onClick={onCreateAndStart}>创建新存档并开始</button>
        </div>
      );
    }

    return (
      <div className="save-slots-list">
        {slots.map((slot) => (
          <article key={slot.slotId} className="save-slot-card">
            <div className="save-slot-main">
              <h3>{slot.name || slot.slotId}</h3>
              <p>天数：{slot.summary?.day || 1}</p>
              <p>最近更新：{formatTime(slot.updatedAt || slot.summary?.updatedAt)}</p>
            </div>
            <div className="save-slot-actions">
              <button onClick={() => onLoadSlot(slot.slotId)}>读取</button>
              <button onClick={() => handleRename(slot)}>重命名</button>
              <button className="danger" onClick={() => handleDelete(slot)}>删除</button>
            </div>
          </article>
        ))}
      </div>
    );
  }, [isLoading, slots, onCreateAndStart, onLoadSlot, handleRename, handleDelete]);

  return (
    <div className="save-slots-page">
      <header className="save-slots-header">
        <button className="save-slots-back" onClick={onBack}>返回</button>
        <h1>读取存档</h1>
        <button className="save-slots-primary" disabled={isCreating} onClick={handleCreateOnly}>
          {isCreating ? '创建中...' : '新建存档'}
        </button>
      </header>

      {error && <div className="save-slots-error">{error}</div>}

      {content}
    </div>
  );
};

export default SaveSlotsPage;
