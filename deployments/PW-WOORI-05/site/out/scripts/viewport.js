/* Fit content to the viewport independently of the persistent navigation. */
window.PWViewport = (() => {
  let frame;
  const content = document.getElementById('pw-content');
  const dialogs = new Map();
  function fit() {
    const root = content.firstElementChild;
    if (!root) return;
    if (root.classList.contains('pw-home') && !document.documentElement.classList.contains('pw-accessible')) {
      for (const name of ['position','top','left','width','height','max-width','transform','transform-origin']) root.style.removeProperty(name);
      delete root.dataset.viewportScale;
      return;
    }
    fitStage(root, content);
  }
  function fitStage(root, container) {
    const width = Math.min(container.clientWidth, 960), height = container.clientHeight;
    if (width < 1 || height < 1) return;
    let scale = 1;
    root.style.position = 'absolute'; root.style.top = '0'; root.style.left = '50%';
    root.style.transformOrigin = 'top center'; root.style.transform = 'translateX(-50%)';
    root.style.maxWidth = 'none';
    for (let i = 0; i < 5; i++) {
      root.style.width = width / scale + 'px';
      root.style.height = height / scale + 'px';
      const ratio = Math.min(1, (height / scale) / Math.max(root.clientHeight, root.scrollHeight), (width / scale) / Math.max(root.clientWidth, root.scrollWidth));
      if (ratio >= .998) break;
      scale *= ratio * .99;
    }
    root.style.width = width / scale + 'px';
    root.style.height = height / scale + 'px';
    root.style.transform = `translateX(-50%) scale(${scale})`;
    root.dataset.viewportScale = String(scale);
  }
  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
    fit();
    for (const [dialog, stage] of dialogs) if (dialog.open) {
      fitStage(stage.body, stage.container);
      dialog.scrollTop = 0;
      stage.body.scrollTop = 0;
    }
  }); }
  function observeDialog(dialog, container, body) {
    dialogs.set(dialog, { container, body });
    const resize = new ResizeObserver(schedule), mutation = new MutationObserver(schedule);
    resize.observe(container);
    mutation.observe(dialog, { childList:true, subtree:true, characterData:true });
    dialog.addEventListener('focusin', schedule);
    schedule();
    return () => { resize.disconnect(); mutation.disconnect(); dialog.removeEventListener('focusin', schedule); dialogs.delete(dialog); };
  }
  new ResizeObserver(schedule).observe(content);
  new MutationObserver(schedule).observe(content, { childList:true, subtree:true, characterData:true });
  document.fonts.ready.then(schedule);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  async function fullscreen(hint) {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI:'hide' });
      else throw new Error('unavailable');
      if (hint) hint.textContent = '';
    } catch (_) {
      if (hint) hint.textContent = '이 브라우저에서는 공유 메뉴의 ‘홈 화면에 추가’로 앱을 열어주세요.';
    }
  }
  return Object.freeze({ schedule, fullscreen, observeDialog });
})();
