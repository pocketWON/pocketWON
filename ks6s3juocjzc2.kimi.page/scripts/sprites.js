/* Frame art is packed offline. The runtime only selects clips and schedules CSS. */
(() => {
  'use strict';
  const controllers = new WeakMap();
  const sessions = new WeakMap();
  const activeSessions = new Set();
  const assets = new Map();
  const keyframes = new Map();
  const celebratedGoals = new Set();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reportedReduced = media.matches;
  const mediaSubscribers = new Set();
  // Keep one native subscription alive across screen teardown/remount. Player
  // callbacks are removed from this set, never left on detached DOM nodes.
  media.addEventListener('change', event => {
    reportedReduced = event.matches;
    for (const notify of [...mediaSubscribers]) notify();
  });
  const registry = () => typeof PW_SPRITE_PROFILES !== 'undefined' ? PW_SPRITE_PROFILES : (window.PW_SPRITE_PROFILES || {});
  const priorityValue = { idle: 0, entrance: 1, interaction: 2, success: 3 };
  const now = () => performance.now();
  const hash = value => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17);
  const rest = (id, cycle) => 1500 + hash(`${id}:${cycle}`) % 2501;

  function loadAsset(src) {
    if (!src) return Promise.resolve(false);
    if (assets.has(src)) return assets.get(src);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try { if (image.decode) await image.decode(); } catch (_) { /* onload already established image availability. */ }
        resolve(image.naturalWidth > 0);
      };
      image.onerror = () => resolve(false);
      image.src = src;
    });
    assets.set(src, promise);
    return promise;
  }

  function animationFor(count) {
    if (keyframes.has(count)) return keyframes.get(count);
    const name = `pw-sprite-${count}-cells`;
    const position = index => count === 1 ? 0 : index / (count - 1) * 100;
    const rules = Array.from({ length: count }, (_, index) => `${index / count * 100}%{background-position:${position(index)}% 0}`);
    rules.push(`100%{background-position:${position(count - 1)}% 0}`);
    const style = document.createElement('style');
    style.dataset.spriteKeyframes = String(count);
    style.textContent = `@keyframes ${name}{${rules.join('')}}`;
    document.head.append(style);
    keyframes.set(count, name);
    return name;
  }

  window.createPocketWONSprite = function createPocketWONSprite(profileName, options = {}) {
    const profile = typeof profileName === 'string' ? registry()[profileName] : profileName;
    const name = typeof profileName === 'string' ? profileName : (profileName.name || 'custom');
    const element = document.createElement('span');
    element.className = ['pw-sprite', options.className].filter(Boolean).join(' ');
    element.dataset.sprite = name;
    element.dataset.spriteState = 'static';
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('role', 'presentation');
    const poster = document.createElement('img');
    poster.className = 'pw-sprite-poster';
    poster.alt = '';
    poster.setAttribute('aria-hidden', 'true');
    poster.width = 384;
    poster.height = 384;
    poster.loading = options.loading || (name === 'balance' ? 'eager' : 'lazy');
    poster.decoding = 'async';
    let fallbackUsed = false;
    poster.addEventListener('error', () => {
      if (!fallbackUsed && profile?.fallback) {
        fallbackUsed = true;
        poster.src = profile.fallback;
        element.dataset.spriteFallback = 'true';
      } else poster.hidden = true;
    });
    if (profile?.poster || profile?.fallback) poster.src = profile.poster || profile.fallback;
    else poster.hidden = true;
    const layer = document.createElement('span');
    layer.className = 'pw-sprite-frames';
    element.append(poster, layer);
    let disposed = false;
    let serial = 0;
    let run = null;
    let externalPaused = !!options.paused;
    let endedListener = null;
    let state = 'static';

    const setState = value => { state = value; element.dataset.spriteState = value; };
    function removeAnimation() {
      if (endedListener) layer.removeEventListener('animationend', endedListener);
      endedListener = null;
      layer.style.animation = 'none';
      element.classList.remove('pw-sprite--ready');
    }
    function stop() {
      serial += 1;
      removeAnimation();
      run = null;
      if (!disposed) setState('static');
    }
    function clipFor(clip) {
      return clip === 'success' ? registry().success?.clips?.action : profile?.clips?.[clip];
    }
    function pause() {
      externalPaused = true;
      if (run) { layer.style.animationPlayState = 'paused'; setState('paused'); }
    }
    function resume() {
      externalPaused = false;
      if (run && run.ready && !media.matches && !document.hidden) {
        layer.style.animationPlayState = 'running';
        setState('playing');
      }
    }
    async function play(clip = 'action', playOptions = {}) {
      if (disposed || media.matches) return false;
      const metadata = clipFor(clip);
      if (!metadata || !Number.isInteger(metadata.frameCount) || metadata.frameCount < 1 || metadata.fps <= 0) return false;
      stop();
      const token = serial;
      const current = { clip, token, ready: false, loop: playOptions.loop ?? options.loop ?? metadata.loop ?? false };
      run = current;
      setState(externalPaused ? 'paused' : 'loading');
      const loaded = await loadAsset(metadata.src);
      if (disposed || serial !== token || media.matches) return false;
      if (!loaded) { stop(); element.dataset.spriteAssetError = clip; return false; }
      delete element.dataset.spriteAssetError;
      const count = metadata.frameCount;
      current.ready = true;
      layer.style.backgroundImage = `url(${JSON.stringify(metadata.src)})`;
      layer.style.backgroundSize = `${count * 100}% 100%`;
      layer.style.backgroundPosition = '0% 0';
      // One style flush starts a fresh CSS timeline; no per-frame JS is used.
      void layer.offsetWidth;
      layer.style.animation = `${animationFor(count)} ${count / metadata.fps}s steps(1, end) ${current.loop ? 'infinite' : '1'} both`;
      layer.style.animationPlayState = externalPaused || document.hidden ? 'paused' : 'running';
      endedListener = event => {
        if (event.target !== layer || event.animationName !== animationFor(count) || serial !== token || current.loop) return;
        const complete = playOptions.onComplete || options.onComplete;
        stop();
        if (typeof complete === 'function') complete({ profile: name, clip });
      };
      layer.addEventListener('animationend', endedListener);
      element.classList.add('pw-sprite--ready');
      element.dataset.spriteClip = clip;
      setState(externalPaused || document.hidden ? 'paused' : 'playing');
      return true;
    }
    function visibilityChanged() {
      if (!run) return;
      if (document.hidden) { layer.style.animationPlayState = 'paused'; setState('paused'); }
      else if (!externalPaused) resume();
    }
    function reducedChanged() { if (media.matches) stop(); }
    document.addEventListener('visibilitychange', visibilityChanged);
    mediaSubscribers.add(reducedChanged);
    const controller = {
      element, play, pause, resume, stop,
      prepare: (clip = 'action') => loadAsset(clipFor(clip)?.src),
      inspect: () => Object.freeze({ profile: name, state, clip: run?.clip || null, ready: !!run?.ready, paused: state === 'paused', reduced: reportedReduced }),
      dispose() {
        if (disposed) return;
        stop();
        disposed = true;
        setState('disposed');
        document.removeEventListener('visibilitychange', visibilityChanged);
        mediaSubscribers.delete(reducedChanged);
        controllers.delete(element);
      },
    };
    controllers.set(element, controller);
    if (options.autoplay) queueMicrotask(() => { if (!disposed) play(options.clip || (profile?.clips?.idle ? 'idle' : 'action')); });
    return controller;
  };

  function mount(viewRoot, options = {}) {
    sessions.get(viewRoot)?.dispose();
    const records = new Map();
    const scrollRoot = document.getElementById('pw-content');
    let disposed = false;
    let timer = null;
    let refreshPending = false;
    let blocked = false;
    let reduced = media.matches;
    let strong = null;
    let subtle = null;
    let strongRestUntil = 0;
    let strongRestRemaining = 0;
    let entryMotion = typeof options.entryMotion === 'string' ? { profile: options.entryMotion } : options.entryMotion;
    if (reduced) entryMotion = null;

    const isBlocked = () => document.hidden || media.matches || !!document.querySelector('dialog[open]');
    function schedule() {
      clearTimeout(timer);
      timer = null;
      if (disposed || blocked) return;
      const current = now();
      const due = subtle ? [] : [...records.values()].filter(record => record.visible && !record.run && record.idleAllowed).map(record => record.idleAt);
      if (!strong && strongRestUntil > current && [...records.values()].some(record => record.visible && !record.run && record.entrancePending)) due.push(strongRestUntil);
      if (due.length) timer = setTimeout(pump, Math.max(30, Math.min(...due) - current));
    }
    function release(record) {
      if (strong === record) strong = null;
      if (subtle === record) subtle = null;
    }
    function freeze(record) {
      record.idleRemaining = Math.max(0, record.idleAt - now());
      if (record.run) { record.player.pause(); record.suspended = true; release(record); }
    }
    function thaw(record) {
      record.idleAt = now() + record.idleRemaining;
    }
    function finish(record, run) {
      if (disposed || record.run !== run) return;
      release(record);
      record.run = null;
      record.suspended = false;
      record.cycle += 1;
      record.idleRemaining = rest(record.id, record.cycle);
      record.idleAt = now() + record.idleRemaining;
      if (run.priority === 'entrance') strongRestUntil = now() + 240;
      pump();
    }
    function cancel(record) {
      if (!record) return;
      release(record);
      record.player.stop();
      record.run = null;
      record.suspended = false;
      record.idleRemaining = rest(record.id, ++record.cycle);
      record.idleAt = now() + record.idleRemaining;
    }
    function start(record, clip, priority, goalKey) {
      if (!record || !record.visible || blocked || disposed) return false;
      if (record.run && priorityValue[record.run.priority] > priorityValue[priority]) return false;
      const isIdle = priority === 'idle';
      const occupied = isIdle ? subtle : strong;
      if (occupied && occupied !== record) {
        if (priorityValue[priority] <= priorityValue[occupied.run.priority]) return false;
        cancel(occupied);
      }
      if (record.run) cancel(record);
      const run = { clip, priority };
      record.run = run;
      record.suspended = false;
      record.player.resume();
      if (isIdle) subtle = record;
      else strong = record;
      record.player.play(clip, { loop: false, onComplete: () => finish(record, run) }).then(played => {
        if (played && record.run === run && goalKey) celebratedGoals.add(goalKey);
        if (!played && record.run === run) finish(record, run);
      });
      return true;
    }
    function pump() {
      if (disposed || blocked) { schedule(); return; }
      // A paused action keeps its frame but yields its budget while offscreen.
      const waiting = [...records.values()].filter(record => record.visible && record.suspended).sort((a, b) => priorityValue[b.run.priority] - priorityValue[a.run.priority]);
      for (const record of waiting) {
        const slot = record.run.priority === 'idle' ? subtle : strong;
        if (slot) continue;
        if (record.run.priority === 'idle') subtle = record;
        else strong = record;
        record.suspended = false;
        record.player.resume();
      }
      if (!strong) {
        const pending = [...records.values()].find(record => record.visible && !record.run && record.successPending);
        if (pending) {
          const intent = pending.successPending;
          pending.successPending = null;
          if ((intent.saved || !celebratedGoals.has(intent.goalKey)) && start(pending, 'success', 'success', intent.goalKey)) {
            pending.entrancePending = false;
          }
        }
      }
      if (!strong && entryMotion) {
        const target = [...records.values()].find(record => record.visible && record.element.dataset.sprite === entryMotion.profile);
        if (target) { const clip = entryMotion.clip || 'action'; entryMotion = null; target.entrancePending = false; start(target, clip, 'interaction'); }
      }
      if (!strong && now() >= strongRestUntil) {
        const target = [...records.values()].find(record => record.visible && !record.run && record.entrancePending);
        if (target) { target.entrancePending = false; start(target, 'action', 'entrance'); }
      }
      if (!subtle) {
        const target = [...records.values()].find(record => record.visible && !record.run && record.idleAllowed && record.idleAt <= now());
        if (target) start(target, 'idle', 'idle');
      }
      schedule();
    }
    function visibility(entries) {
      for (const entry of entries) {
        const record = records.get(entry.target);
        if (!record) continue;
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        if (visible === record.visible) continue;
        if (!visible && !blocked) freeze(record);
        record.visible = visible;
        if (visible && !blocked) thaw(record);
        if (visible && !record.entered) {
          record.entered = true;
          record.entrancePending = record.ambientAllowed && !media.matches;
          const wrapper = record.element.closest('[data-pw-motion-card], .pw-motion-enter');
          if (wrapper) wrapper.classList.add('pw-motion-enter--visible');
        }
      }
      pump();
    }
    const visibleObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(visibility, { root: scrollRoot, threshold: [0, 0.15] }) : null;
    const proximityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const record = records.get(entry.target);
        if (!record) continue;
        if (!media.matches) {
          record.player.prepare('idle');
          record.player.prepare('action');
        }
        proximityObserver.unobserve(entry.target);
      }
    }, { root: scrollRoot, rootMargin: '180px 0px' }) : null;

    function refresh() {
      if (disposed) return;
      for (const [element, record] of records) {
        if (viewRoot.contains(element)) continue;
        visibleObserver?.unobserve(element);
        proximityObserver?.unobserve(element);
        release(record);
        record.player.dispose();
        records.delete(element);
      }
      const elements = [...viewRoot.querySelectorAll('.pw-sprite')];
      if (viewRoot.matches?.('.pw-sprite')) elements.unshift(viewRoot);
      for (const element of elements) {
        if (records.has(element)) continue;
        const player = controllers.get(element);
        if (!player) continue;
        const id = `${element.dataset.sprite}:${records.size}`;
        const idleRemaining = rest(id, 0);
        const goalKey = element.dataset.spriteGoalKey;
        const record = { element, player, id, visible: false, entered: false, ambientAllowed: element.dataset.spriteAmbient !== 'false', idleAllowed: element.dataset.spriteIdle !== 'false' && !!registry()[element.dataset.sprite]?.clips?.idle, entrancePending: false, successPending: goalKey && !media.matches && !celebratedGoals.has(goalKey) ? { goalKey, saved: false } : null, idleAt: now() + idleRemaining, idleRemaining, cycle: 0, run: null, suspended: false };
        records.set(element, record);
        const card = element.closest('[data-pw-motion-card]');
        if (card) card.style.setProperty('--motion-enter-delay', `${Math.min(records.size - 1, 4) * 60}ms`);
        if (visibleObserver) visibleObserver.observe(element);
        else { record.visible = true; record.entered = true; record.entrancePending = record.ambientAllowed && !media.matches; }
        if (proximityObserver) proximityObserver.observe(element);
        else { player.prepare('idle'); player.prepare('action'); }
      }
      pump();
    }
    function syncBlocked() {
      const next = isBlocked();
      const enteringReduced = media.matches && !reduced;
      reduced = media.matches;
      if (next === blocked && !enteringReduced) return;
      const wasBlocked = blocked;
      blocked = next;
      if (blocked && !wasBlocked) {
        strongRestRemaining = Math.max(0, strongRestUntil - now());
        for (const record of records.values()) if (record.visible) freeze(record);
      }
      // Reduced motion invalidates every timeline even when another reason
      // (a modal or a hidden document) had already paused the session.
      if (enteringReduced) {
        for (const record of records.values()) {
          cancel(record);
          record.entrancePending = false;
          record.successPending = null;
        }
        entryMotion = null;
        viewRoot.querySelectorAll('.pw-motion-enter--visible').forEach(card => card.classList.remove('pw-motion-enter--visible'));
      }
      if (!blocked && wasBlocked) {
        strongRestUntil = now() + strongRestRemaining;
        for (const record of records.values()) if (record.visible) thaw(record);
      }
      pump();
    }
    function findRecord(target) {
      if (typeof target === 'string') return [...records.values()].find(record => record.element.dataset.sprite === target && record.visible) || [...records.values()].find(record => record.element.dataset.sprite === target);
      return records.get(target) || records.get(target?.querySelector?.('.pw-sprite'));
    }
    function syncTargetVisibility(record) {
      if (!record || !record.element.isConnected) return;
      const rect = record.element.getBoundingClientRect();
      const root = scrollRoot?.getBoundingClientRect() || { top: 0, left: 0, bottom: innerHeight, right: innerWidth };
      const width = Math.max(0, Math.min(rect.right, root.right) - Math.max(rect.left, root.left));
      const height = Math.max(0, Math.min(rect.bottom, root.bottom) - Math.max(rect.top, root.top));
      const visible = rect.width > 0 && rect.height > 0 && width * height / (rect.width * rect.height) >= 0.15;
      if (record.visible && !visible && !blocked) freeze(record);
      if (!record.visible && visible && !blocked) thaw(record);
      record.visible = visible;
      if (visible) record.entered = true;
    }
    const session = {
      refresh,
      request(target, clip = 'action', priority = 'interaction') {
        refresh();
        syncBlocked();
        const record = findRecord(target);
        syncTargetVisibility(record);
        if (!record || record.run?.priority === priority && record.run?.clip === clip) return false;
        record.entrancePending = false;
        return start(record, clip, priorityValue[priority] === undefined ? 'interaction' : priority);
      },
      prepareSuccess: () => reportedReduced ? Promise.resolve(false) : loadAsset(registry().success?.clips?.action?.src),
      success(target, { goalKey, saved = false } = {}) {
        refresh();
        syncBlocked();
        if (!saved && goalKey && celebratedGoals.has(goalKey)) return false;
        const record = findRecord(target);
        if (!record) return false;
        record.successPending = null;
        record.entrancePending = false;
        syncTargetVisibility(record);
        if (blocked || !record.visible) {
          if (!reportedReduced) record.successPending = { goalKey, saved };
          return false;
        }
        return start(record, 'success', 'success', goalKey);
      },
      inspect: () => Object.freeze({ blocked, reduced: reportedReduced, strong: strong ? 1 : 0, idle: subtle ? 1 : 0, players: [...records.values()].map(record => ({ ...record.player.inspect(), visible: record.visible, suspended: record.suspended, priority: record.run?.priority || null, element: record.element })) }),
      dispose() {
        if (disposed) return;
        disposed = true;
        clearTimeout(timer);
        visibleObserver?.disconnect();
        proximityObserver?.disconnect();
        mutationObserver.disconnect();
        modalObserver.disconnect();
        document.removeEventListener('visibilitychange', syncBlocked);
        document.removeEventListener('close', syncBlocked, true);
        mediaSubscribers.delete(syncBlocked);
        viewRoot.removeEventListener('pointerover', hover);
        for (const [element, record] of records) {
          record.player.dispose();
          records.delete(element);
        }
        strong = null;
        subtle = null;
        sessions.delete(viewRoot);
        activeSessions.delete(session);
      },
    };
    const mutationObserver = new MutationObserver(() => {
      if (refreshPending) return;
      refreshPending = true;
      queueMicrotask(() => { refreshPending = false; refresh(); });
    });
    mutationObserver.observe(viewRoot, { childList: true, subtree: true });
    const modalObserver = new MutationObserver(() => {
      if (document.querySelector('dialog[open]')) session.prepareSuccess();
      syncBlocked();
    });
    function hover(event) {
      if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const card = event.target.closest?.('[data-pw-motion-card]');
      if (!card || card.contains(event.relatedTarget)) return;
      const sprite = card.querySelector('.pw-sprite');
      if (sprite) session.request(sprite, 'action', 'interaction');
    }
    modalObserver.observe(document.body, { attributes: true, attributeFilter: ['open'], childList: true, subtree: true });
    document.addEventListener('visibilitychange', syncBlocked);
    document.addEventListener('close', syncBlocked, true);
    mediaSubscribers.add(syncBlocked);
    if (options.hover !== false) viewRoot.addEventListener('pointerover', hover);
    sessions.set(viewRoot, session);
    activeSessions.add(session);
    blocked = isBlocked();
    refresh();
    return session;
  }

  window.PocketWONMotion = Object.freeze({
    mount,
    controllerFor: element => controllers.get(element) || sessions.get(element),
    prepareSuccess: () => reportedReduced ? Promise.resolve(false) : loadAsset(registry().success?.clips?.action?.src),
    requestSuccess(root, profile, goalKey) {
      const session = sessions.get(root);
      // This helper is called only after a confirmed storage save. An explicit
      // save celebrates once even if its completed goal was displayed before.
      return session ? session.success(profile, { goalKey, saved: true }) : false;
    },
    inspect: () => [...activeSessions].map(session => session.inspect()),
  });
})();
