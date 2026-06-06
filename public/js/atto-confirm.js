(function () {
  if (document.getElementById('atto-confirm-styles')) return;

  const style = document.createElement('style');
  style.id = 'atto-confirm-styles';
  style.textContent = `
    .atto-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.22s ease;
    }
    .atto-overlay.atto-show {
      opacity: 1;
    }
    .atto-overlay.atto-show .atto-modal {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    .atto-modal {
      background: linear-gradient(155deg, #1c0636 0%, #0d001f 100%);
      border: 1px solid rgba(186, 1, 255, 0.28);
      border-radius: 22px;
      padding: 38px 32px 30px;
      max-width: 400px;
      width: 100%;
      box-shadow:
        0 0 0 1px rgba(90, 24, 154, 0.2),
        0 24px 64px rgba(0, 0, 0, 0.75),
        0 0 50px rgba(90, 24, 154, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
      transform: scale(0.86) translateY(-24px);
      opacity: 0;
      transition:
        transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 0.22s ease;
      text-align: center;
      position: relative;
      overflow: hidden;
      font-family: inherit;
    }
    .atto-modal::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(186,1,255,0.6), rgba(0,223,252,0.4), transparent);
    }
    .atto-modal::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 0%, rgba(186,1,255,0.07) 0%, transparent 65%);
      pointer-events: none;
    }
    .atto-icon {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      position: relative;
      z-index: 1;
    }
    .atto-icon.atto-warning {
      background: rgba(186, 1, 255, 0.12);
      border: 2px solid rgba(186, 1, 255, 0.45);
      box-shadow: 0 0 18px rgba(186, 1, 255, 0.2);
      color: #ba01ff;
    }
    .atto-icon.atto-danger {
      background: rgba(239, 68, 68, 0.12);
      border: 2px solid rgba(239, 68, 68, 0.45);
      box-shadow: 0 0 18px rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    .atto-icon.atto-info {
      background: rgba(0, 223, 252, 0.1);
      border: 2px solid rgba(0, 223, 252, 0.4);
      box-shadow: 0 0 18px rgba(0, 223, 252, 0.15);
      color: #00dffc;
    }
    .atto-icon svg {
      width: 28px;
      height: 28px;
    }
    .atto-title {
      color: #ffffff;
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0 0 10px;
      letter-spacing: -0.01em;
      position: relative;
      z-index: 1;
    }
    .atto-message {
      color: rgba(255, 255, 255, 0.68);
      font-size: 0.92rem;
      line-height: 1.65;
      margin: 0 0 28px;
      position: relative;
      z-index: 1;
    }
    .atto-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
      position: relative;
      z-index: 1;
    }
    .atto-btn {
      flex: 1;
      padding: 11px 18px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
      border: none;
      font-family: inherit;
      outline: none;
      letter-spacing: 0.01em;
    }
    .atto-btn-cancel {
      background: rgba(255, 255, 255, 0.05);
      border: 1.5px solid rgba(186, 1, 255, 0.35);
      color: rgba(255, 255, 255, 0.75);
    }
    .atto-btn-cancel:hover {
      background: rgba(186, 1, 255, 0.1);
      border-color: rgba(186, 1, 255, 0.6);
      color: #fff;
    }
    .atto-btn-cancel:active {
      transform: scale(0.97);
    }
    .atto-btn-ok {
      background: linear-gradient(135deg, #5a189a 0%, #ba01ff 100%);
      color: #fff;
      box-shadow: 0 4px 18px rgba(186, 1, 255, 0.4);
    }
    .atto-btn-ok:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(186, 1, 255, 0.55);
    }
    .atto-btn-ok:active {
      transform: scale(0.97) translateY(0);
    }
    .atto-btn-ok.atto-danger-btn {
      background: linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%);
      box-shadow: 0 4px 18px rgba(239, 68, 68, 0.4);
    }
    .atto-btn-ok.atto-danger-btn:hover {
      box-shadow: 0 6px 24px rgba(239, 68, 68, 0.55);
    }
  `;
  document.head.appendChild(style);

  const ICONS = {
    warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
      <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
      <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
    </svg>`,
    danger: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
      <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
      <path d="m9.708 6.075-3.024.379-.108.502.595.108c.387.093.464.232.38.619l-.975 4.577c-.255 1.183.14 1.74 1.067 1.74.72 0 1.554-.332 1.933-.789l.116-.549c-.263.232-.65.325-.905.325-.363 0-.494-.255-.402-.704zm.091-2.755a1.32 1.32 0 1 1-2.64 0 1.32 1.32 0 0 1 2.64 0"/>
    </svg>`
  };

  window.attoConfirm = function (message, options) {
    const opts = Object.assign({
      title: '¿Confirmar acción?',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      icon: 'warning'
    }, options || {});

    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'atto-overlay';

      const iconClass = opts.icon === 'danger' ? 'atto-danger' : opts.icon === 'info' ? 'atto-info' : 'atto-warning';
      const okBtnExtra = opts.icon === 'danger' ? ' atto-danger-btn' : '';

      overlay.innerHTML = `
        <div class="atto-modal" role="dialog" aria-modal="true">
          <div class="atto-icon ${iconClass}">${ICONS[opts.icon] || ICONS.warning}</div>
          <div class="atto-title">${opts.title}</div>
          <div class="atto-message">${message}</div>
          <div class="atto-buttons">
            <button class="atto-btn atto-btn-cancel" data-action="cancel">${opts.cancelText}</button>
            <button class="atto-btn atto-btn-ok${okBtnExtra}" data-action="confirm">${opts.confirmText}</button>
          </div>
        </div>
      `;

      function cleanup(value) {
        overlay.classList.remove('atto-show');
        setTimeout(function () { overlay.remove(); }, 320);
        resolve(value);
      }

      overlay.addEventListener('click', function (e) {
        const action = e.target.dataset.action;
        if (action === 'confirm') cleanup(true);
        else if (action === 'cancel') cleanup(false);
        else if (e.target === overlay) cleanup(false);
      });

      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escHandler);
          cleanup(false);
        }
      });

      document.body.appendChild(overlay);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          overlay.classList.add('atto-show');
        });
      });
    });
  };
})();
