import React, { useEffect, useRef } from 'react';
import { createAmbientPixiScene, getEffectsLevel } from './createAmbientPixiScene.js';
import './AmbientGameCanvas.css';

const AmbientGameCanvas = ({ viewModel }) => {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const latestViewModelRef = useRef(viewModel);

  latestViewModelRef.current = viewModel;

  useEffect(() => {
    if (getEffectsLevel() === 'off') {
      return undefined;
    }

    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    let disposed = false;

    const mountScene = async () => {
      try {
        const scene = await createAmbientPixiScene({
          host,
          viewModel: latestViewModelRef.current,
        });

        if (disposed) {
          scene.destroy();
          return;
        }

        sceneRef.current = scene;
        scene.update(latestViewModelRef.current);
      } catch (error) {
        console.error('Failed to initialize Pixi ambient scene.', error);
      }
    };

    mountScene();

    return () => {
      disposed = true;

      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.update(viewModel);
    }
  }, [viewModel]);

  if (getEffectsLevel() === 'off') {
    return null;
  }

  return <div ref={hostRef} className="pixi-game-canvas" aria-hidden="true" />;
};

export default AmbientGameCanvas;
