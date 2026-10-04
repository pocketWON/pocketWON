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
  function fitHero() {
    const hero = content.querySelector('.pw-home-hero');
    const stage = hero?.querySelector('.pw-home-character-stage'), sprite = stage?.querySelector('.pw-sprite');
    if (!sprite) return;
    const box = hero.getBoundingClientRect(), style = getComputedStyle(hero);
    const scale = box.width / parseFloat(style.width), unit = parseFloat(style.borderTopLeftRadius) / 15;
    if (!(scale > 0 && unit > 0)) return;
    // Union of every balance action/idle frame: [105,100,297,319] in a 384px cell.
    const alphaWidth = 192 / 384, alphaHeight = 219 / 384, gap = 8;
    const obstacles = [...hero.querySelectorAll('.pw-home-hero-title,.pw-home-money,.pw-home-status')].map(node => node.getBoundingClientRect());
    const right = box.right - Math.max(gap, 18 * unit * scale);
    const bottom = hero.querySelector('.pw-home-breakdown').getBoundingClientRect().top - gap;
    const areas = [
      { left: Math.max(box.left, ...obstacles.map(rect => rect.right)) + gap, top: box.top + gap },
      { left: box.left + gap, top: Math.max(box.top, ...obstacles.map(rect => rect.bottom)) + gap },
    ];
    const size = Math.max(0, ...areas.map(area => Math.min(250 * unit * scale, (right - area.left) / alphaWidth, (bottom - area.top) / alphaHeight)));
    stage.style.left = ((right - size * 297 / 384 - box.left) / scale) + 'px';
    stage.style.top = ((bottom - size * 319 / 384 - box.top) / scale) + 'px';
    stage.style.right = 'auto'; stage.style.bottom = 'auto';
    stage.style.width = stage.style.height = (size / scale) + 'px';
    sprite.style.width = sprite.style.height = '100%';
    sprite.style.left = sprite.style.top = '0'; sprite.style.translate = 'none';
  }
  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
    fit();
    fitHero();
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
