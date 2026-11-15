const MahjongNavigation = (() => {
  const switchKey = 'your-move-mahjong-board-switch';
  let table = null;
  let mayNavigate = () => true;

  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-mahjong-board], a[data-mahjong-home]');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!mayNavigate()) {
      event.preventDefault();
      return;
    }
    try {
      sessionStorage.removeItem(switchKey);
      if (table && link.hasAttribute('data-mahjong-board')) {
        sessionStorage.setItem(switchKey, JSON.stringify({
          ...table,
          destination: link.dataset.mahjongBoard
        }));
      }
    } catch {}
  });

  function inviteCode(normalize) {
    return normalize(new URLSearchParams(location.hash.slice(1)).get('room'));
  }

  function incoming(board, normalize) {
    let transfer = null;
    try {
      transfer = JSON.parse(sessionStorage.getItem(switchKey));
      sessionStorage.removeItem(switchKey);
    } catch {}
    if (transfer?.destination === board && normalize(transfer.code)) return transfer;
    return null;
  }

  async function joinOrCreate(request, fields) {
    try {
      return await request('join', fields);
    } catch (error) {
      if (error.status !== 404) throw error;
      try {
        return await request('create', fields);
      } catch (createError) {
        if (createError.status !== 409) throw createError;
        return await request('join', fields);
      }
    }
  }

  return {
    incoming,
    inviteCode,
    joinOrCreate,
    setTable(code, name) { table = code ? { code, name } : null; },
    guard(callback) { mayNavigate = callback; }
  };
})();
