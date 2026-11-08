// The island's stylesheet. Injected once at mount, or import `atoll-ui/styles.css` and pass injectStyles={false}.
// Public custom properties (set them anywhere above the island, e.g. on :root):
//   --atoll-accent         progress color on dark surfaces   (default #2DD4BF)
//   --atoll-accent-strong  progress color on light surfaces  (default #0F766E)
//   --atoll-ink            fill of the Ink and Notch themes  (default #0B0B0C)
//   --atoll-font           font stack                        (default system UI)
//   --atoll-offset         distance from the screen edge     (default 12px)
//   --atoll-z              stacking order                    (default 2147483000)

const INK_DARK = '--a-edge:rgba(255,255,255,.14);--a-shadow:0 14px 30px -14px rgba(0,0,0,.9),0 2px 6px -2px rgba(0,0,0,.5);';

const FROST_LIGHT = '--a-bg:rgba(255,255,255,.66);--a-fg:#0B0B0C;--a-fg2:#3F3F46;--a-edge:rgba(255,255,255,.7);--a-shadow:0 12px 30px -14px rgba(0,0,0,.4);--a-chip:rgba(11,11,12,.08);--a-chip-2:rgba(11,11,12,.14);--a-primary:#0B0B0C;--a-primary-fg:#fff;--a-track:rgba(11,11,12,.14);--a-row:rgba(11,11,12,.05);--a-row-2:rgba(11,11,12,.09);--a-accent:var(--atoll-accent-strong,#0F766E);--a-blur:blur(20px) saturate(1.6);--a-success:#047857;--a-error:#B91C1C;--a-warn:#B45309;--a-info:#1D4ED8;';
const FROST_DARK = '--a-bg:rgba(32,32,37,.62);--a-fg:#F4F4F5;--a-fg2:#C8C8CE;--a-edge:rgba(255,255,255,.12);--a-chip:rgba(255,255,255,.1);--a-chip-2:rgba(255,255,255,.16);--a-primary:#F4F4F5;--a-primary-fg:#0B0B0C;--a-track:rgba(255,255,255,.16);--a-row:rgba(255,255,255,.05);--a-row-2:rgba(255,255,255,.09);--a-accent:var(--atoll-accent,#2DD4BF);--a-success:#34D399;--a-error:#F87171;--a-warn:#FBBF24;--a-info:#60A5FA;';

const PAPER_LIGHT = '--a-bg:#fff;--a-fg:#111113;--a-fg2:#52525B;--a-edge:#E4E4E7;--a-shadow:0 12px 28px -16px rgba(0,0,0,.3),0 1px 2px rgba(0,0,0,.06);--a-chip:#F4F4F5;--a-chip-2:#EAEAEC;--a-primary:#0B0B0C;--a-primary-fg:#fff;--a-track:#E4E4E7;--a-row:#F7F7F8;--a-row-2:#F0F0F2;--a-accent:var(--atoll-accent-strong,#0F766E);--a-blur:none;--a-success:#047857;--a-error:#B91C1C;--a-warn:#B45309;--a-info:#1D4ED8;';
const PAPER_DARK = '--a-bg:#18181B;--a-fg:#F4F4F5;--a-fg2:#A1A1AA;--a-edge:#2E2E34;--a-shadow:0 14px 30px -14px rgba(0,0,0,.9),0 2px 6px -2px rgba(0,0,0,.5);--a-chip:#232328;--a-chip-2:#2C2C32;--a-primary:#F4F4F5;--a-primary-fg:#0B0B0C;--a-track:#2E2E34;--a-row:#1F1F23;--a-row-2:#26262B;--a-accent:var(--atoll-accent,#2DD4BF);--a-success:#34D399;--a-error:#F87171;--a-warn:#FBBF24;--a-info:#60A5FA;';

const SOLID = '.atoll:is([data-atoll-theme="ink"],[data-atoll-theme="notch"])';
const FROST = '.atoll[data-atoll-theme="frost"]';
const PAPER = '.atoll[data-atoll-theme="paper"]';
const NOTCH = '.atoll[data-atoll-theme="notch"]';
const BOTTOM = '.atoll[data-position="bottom"]';

const rich = (type: string, tone: string) =>
  `.atoll[data-rich="true"][data-type="${type}"]{--a-fill:color-mix(in srgb,var(${tone}) 20%,var(--a-bg));--a-edge:color-mix(in srgb,var(${tone}) 32%,transparent)}`;

export const css = [
  /* Root and tokens */
  '.atoll{position:fixed;left:50%;top:calc(var(--atoll-offset,12px) + env(safe-area-inset-top,0px));width:0;height:0;z-index:var(--atoll-z,2147483000);font-family:var(--atoll-font,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif);font-size:14px;font-weight:400;line-height:1.25;letter-spacing:normal;text-align:left;text-transform:none;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;'
    + '--a-bg:var(--atoll-ink,#0B0B0C);--a-fg:#fff;--a-fg2:rgba(255,255,255,.62);--a-edge:rgba(255,255,255,.07);--a-shadow:0 14px 30px -14px rgba(0,0,0,.55),0 2px 6px -2px rgba(0,0,0,.25);--a-chip:rgba(255,255,255,.1);--a-chip-2:rgba(255,255,255,.16);--a-primary:#fff;--a-primary-fg:#0B0B0C;--a-track:rgba(255,255,255,.16);--a-row:rgba(255,255,255,.05);--a-row-2:rgba(255,255,255,.09);--a-accent:var(--atoll-accent,#2DD4BF);--a-blur:none;--a-success:#34D399;--a-error:#F87171;--a-warn:#FBBF24;--a-info:#60A5FA;--a-fill:var(--a-bg)}',
  `${SOLID}[data-scheme="dark"]{${INK_DARK}}`,
  `@media (prefers-color-scheme:dark){${SOLID}[data-scheme="system"]{${INK_DARK}}}`,
  `${FROST}{${FROST_LIGHT}}`,
  `${FROST}[data-scheme="dark"]{${FROST_DARK}}`,
  `@media (prefers-color-scheme:dark){${FROST}[data-scheme="system"]{${FROST_DARK}}}`,
  `${PAPER}{${PAPER_LIGHT}}`,
  `${PAPER}[data-scheme="dark"]{${PAPER_DARK}}`,
  `@media (prefers-color-scheme:dark){${PAPER}[data-scheme="system"]{${PAPER_DARK}}}`,
  rich('success', '--a-success'),
  rich('error', '--a-error'),
  rich('warning', '--a-warn'),
  rich('info', '--a-info'),

  /* Resets with zero specificity so component rules always win */
  ':where(.atoll) *,:where(.atoll) *::before,:where(.atoll) *::after{box-sizing:border-box}',
  ':where(.atoll) button{margin:0;font:inherit;color:inherit;letter-spacing:inherit;text-transform:none;-webkit-appearance:none;appearance:none}',
  '.atoll [hidden]{display:none!important}',

  /* Geometry layers */
  `${NOTCH}{top:env(safe-area-inset-top,0px)}`,
  `${BOTTOM}{top:auto;bottom:calc(var(--atoll-offset,12px) + env(safe-area-inset-bottom,0px))}`,
  `${NOTCH}[data-position="bottom"]{top:auto;bottom:env(safe-area-inset-bottom,0px)}`,
  '.atoll-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}',
  '.atoll-stage,.atoll-drag,.atoll-goo{position:absolute;left:0;top:0;width:0;height:0}',
  '.atoll-shadow,.atoll-bshadow,.atoll-fill,.atoll-bfill,.atoll-shell,.atoll-bubble{position:absolute;left:0;top:0}',
  `${BOTTOM} :is(.atoll-stage,.atoll-drag,.atoll-goo,.atoll-shadow,.atoll-bshadow,.atoll-fill,.atoll-bfill,.atoll-shell,.atoll-bubble){top:auto;bottom:0}`,
  '.atoll-bshadow,.atoll-bfill,.atoll-bubble{width:44px;height:44px}',
  '.atoll-shadow,.atoll-bshadow{box-shadow:var(--a-shadow);pointer-events:none}',
  '.atoll-fill,.atoll-bfill{background-color:var(--a-fill);-webkit-backdrop-filter:var(--a-blur);backdrop-filter:var(--a-blur);pointer-events:none;transition:background-color .25s ease}',
  '.atoll-goo.is-gooey{filter:url(#atoll-goo)}',
  '.atoll-shell{overflow:hidden;color:var(--a-fg);box-shadow:inset 0 0 0 1px var(--a-edge);isolation:isolate;touch-action:none;transition:box-shadow .25s ease}',
  '.atoll-bubble{padding:0;border:0;background:transparent;box-shadow:inset 0 0 0 1px var(--a-edge);color:var(--a-fg);display:grid;place-items:center;cursor:pointer}',
  '.atoll-bub-ic{display:grid;color:var(--a-error)}',
  '.atoll-bub-ic svg{width:20px;height:20px}',
  '.atoll-layer{position:absolute;left:50%;top:0;translate:-50% 0;width:max-content}',
  `${BOTTOM} .atoll-layer{top:auto;bottom:0}`,

  /* Notch shoulders */
  `${NOTCH} :is(.atoll-fill,.atoll-bfill)::before,${NOTCH} :is(.atoll-fill,.atoll-bfill)::after{content:"";position:absolute;top:0;width:16px;height:16px;pointer-events:none}`,
  `${NOTCH} :is(.atoll-fill,.atoll-bfill)::before{left:-16px;background:radial-gradient(circle at 0 100%,transparent 15.5px,var(--a-fill) 16px)}`,
  `${NOTCH} :is(.atoll-fill,.atoll-bfill)::after{right:-16px;background:radial-gradient(circle at 100% 100%,transparent 15.5px,var(--a-fill) 16px)}`,
  `${NOTCH}[data-position="bottom"] :is(.atoll-fill,.atoll-bfill)::before{top:auto;bottom:0;background:radial-gradient(circle at 0 0,transparent 15.5px,var(--a-fill) 16px)}`,
  `${NOTCH}[data-position="bottom"] :is(.atoll-fill,.atoll-bfill)::after{top:auto;bottom:0;background:radial-gradient(circle at 100% 0,transparent 15.5px,var(--a-fill) 16px)}`,

  /* Tones */
  '.atoll [data-tone="success"]{--tone:var(--a-success)}',
  '.atoll [data-tone="error"]{--tone:var(--a-error)}',
  '.atoll [data-tone="warn"]{--tone:var(--a-warn)}',
  '.atoll [data-tone="info"]{--tone:var(--a-info)}',
  '.atoll [data-tone="accent"]{--tone:var(--a-accent)}',

  /* Compact row */
  '.atoll-row{display:flex;align-items:center;gap:10px;height:44px;padding:0 18px 0 6px;white-space:nowrap;font-size:14px;font-weight:500;letter-spacing:-.005em;color:var(--a-fg)}',
  '.atoll-row.no-icon{padding-left:18px}',
  '.atoll-row.end-action{padding-right:4px}',
  '.atoll-row.end-ring{padding-right:8px}',
  '.atoll-row.end-badge{padding-right:10px}',
  'button.atoll-row{border:0;background:none;cursor:pointer;text-align:left}',
  '.atoll-ic{width:32px;height:32px;flex:none;border-radius:999px;background:var(--a-chip);color:var(--a-fg);display:grid;place-items:center}',
  '.atoll-ic svg{width:18px;height:18px}',
  '.atoll-ic[data-tone]:not([data-tone=""]),.atoll-tile[data-tone]:not([data-tone=""]){background:color-mix(in srgb,var(--tone) 17%,transparent);color:var(--tone)}',
  '.atoll-title{overflow:hidden;text-overflow:ellipsis;max-width:min(260px,calc(100vw - 170px))}',
  '.atoll-pct{margin-left:2px;min-width:3.4ch;text-align:right;font-size:13px;color:var(--a-fg2);font-variant-numeric:tabular-nums}',
  '.atoll-badge{height:24px;padding:0 8px;border-radius:999px;background:var(--a-chip-2);font-size:12px;font-weight:600;display:inline-flex;align-items:center;font-variant-numeric:tabular-nums}',
  '.atoll-act{flex:none;height:44px;padding:0 0 0 4px;border:0;background:none;display:flex;align-items:center;cursor:pointer}',
  '.atoll-act>span{height:32px;padding:0 14px;border-radius:999px;background:var(--a-chip);font-size:13px;font-weight:600;display:flex;align-items:center;transition:background-color .15s ease}',
  '.atoll-act:hover>span{background:var(--a-chip-2)}',
  '.atoll-link{padding:0;border:0;background:none;cursor:pointer}',
  '.atoll-rest{display:block;width:104px;height:30px;padding:0;border:0;background:none}',
  'button.atoll-rest{cursor:pointer}',
  '.atoll-ring{width:28px;height:28px;flex:none;transform:rotate(-90deg)}',
  '.atoll-ring circle{fill:none;stroke-width:3.5}',
  '.atoll-ring .trk{stroke:var(--a-track)}',
  '.atoll-ring .val{stroke:var(--a-accent);stroke-linecap:round;transition:stroke-dashoffset .35s ease,opacity .2s ease}',
  '.atoll-ring.is-muted .val{stroke:var(--a-fg2)}',
  '.atoll-spin{animation:atoll-spin .9s linear infinite}',
  '@keyframes atoll-spin{to{transform:rotate(360deg)}}',
  '.atoll-ic .draw{stroke-dasharray:20;stroke-dashoffset:20;animation:atoll-draw .36s .1s cubic-bezier(.2,.8,.2,1) forwards}',
  '@keyframes atoll-draw{to{stroke-dashoffset:0}}',

  /* Expanded message */
  '.atoll-exp{width:min(380px,calc(100vw - 24px));padding:14px;display:flex;flex-direction:column;gap:12px;white-space:normal;color:var(--a-fg)}',
  '.atoll-exp-head{display:flex;align-items:center;gap:12px}',
  '.atoll-tile{width:44px;height:44px;flex:none;border-radius:14px;background:var(--a-chip);color:var(--a-fg);display:grid;place-items:center}',
  '.atoll-tile svg{width:22px;height:22px}',
  '.atoll-exp-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
  '.atoll-exp-title{font-size:15px;font-weight:600;letter-spacing:-.01em}',
  '.atoll-exp-desc{font-size:13px;color:var(--a-fg2)}',
  '.atoll-x{width:44px;height:44px;flex:none;padding:0;border:0;border-radius:999px;background:transparent;color:var(--a-fg2);display:grid;place-items:center;cursor:pointer}',
  '.atoll-x:hover{color:var(--a-fg)}',
  '.atoll-x svg{width:16px;height:16px}',
  '.atoll-actions{display:flex;gap:8px}',
  '.atoll-btn{flex:1;height:44px;border:0;border-radius:999px;background:var(--a-chip);color:var(--a-fg);font-size:14px;font-weight:600;line-height:1;cursor:pointer;transition:background-color .15s ease}',
  '.atoll-btn:hover{background:var(--a-chip-2)}',
  '.atoll-btn.is-primary{background:var(--a-primary);color:var(--a-primary-fg)}',
  '.atoll-btn.is-primary:hover{background:var(--a-primary);opacity:.9}',

  /* Tray */
  '.atoll-tray{width:min(420px,calc(100vw - 16px));padding:8px;display:flex;flex-direction:column;gap:4px;white-space:normal;color:var(--a-fg)}',
  '.atoll-tray-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 2px 14px}',
  '.atoll-tray-titles{display:flex;flex-direction:column;gap:2px;min-width:0}',
  '.atoll-tray-title{font-size:15px;font-weight:600;letter-spacing:-.01em}',
  '.atoll-tray-sub{font-size:12px;color:var(--a-fg2)}',
  '.atoll-tray-tools{display:flex;align-items:center;flex:none}',
  '.atoll-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;max-height:min(52vh,420px);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}',
  '.atoll-task{display:flex;align-items:center;gap:12px;padding:10px 2px 10px 10px;border-radius:22px;background:var(--a-row)}',
  '.atoll-task:hover,.atoll-task:focus-within{background:var(--a-row-2)}',
  '.atoll-task[data-status="failed"]{background:color-mix(in srgb,var(--a-error) 9%,transparent)}',
  '.atoll-tile.sm{width:40px;height:40px;border-radius:12px}',
  '.atoll-tile.sm svg{width:20px;height:20px}',
  '.atoll-task-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}',
  '.atoll-task-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}',
  '.atoll-task-name{font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.atoll-task-state{flex:none;font-size:12px;font-weight:500;color:var(--a-fg2);font-variant-numeric:tabular-nums}',
  '.atoll-task-state.is-error{color:var(--a-error);font-weight:600}',
  '.atoll-bar{height:4px;border-radius:999px;background:var(--a-track);overflow:hidden}',
  '.atoll-bar>i{display:block;height:100%;border-radius:inherit;background:var(--a-accent);transition:width .3s ease}',
  '.atoll-task[data-status="paused"] .atoll-bar>i{background:var(--a-fg2)}',
  '.atoll-task[data-status="failed"] .atoll-bar>i{background:var(--a-error)}',
  '.atoll-task-meta{font-size:12px;color:var(--a-fg2);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.atoll-task-actions{display:flex;flex:none}',
  '.atoll-ib{width:44px;height:44px;padding:0;border:0;background:transparent;color:var(--a-fg);display:grid;place-items:center;cursor:pointer}',
  '.atoll-ib>span{width:32px;height:32px;border-radius:999px;background:var(--a-chip);display:grid;place-items:center;transition:background-color .15s ease}',
  '.atoll-ib:hover>span{background:var(--a-chip-2)}',
  '.atoll-ib svg{width:14px;height:14px}',
  '.atoll-task-actions .atoll-ib+.atoll-ib{margin-left:-8px}',
  '.atoll-reveal{display:none}',
  '.atoll-task:hover .atoll-reveal,.atoll-task:focus-within .atoll-reveal{display:grid}',
  '@media (hover:none){.atoll-reveal{display:grid}}',
  '.atoll-tray-foot{display:flex;align-items:center;gap:10px;padding:2px 2px 0 14px;font-size:12px;color:var(--a-fg2)}',
  '.atoll-tray-foot>svg{width:16px;height:16px;flex:none}',
  '.atoll-tray-foot>span{flex:1}',
  '.atoll-empty{margin:0;padding:14px;font-size:13px;color:var(--a-fg2)}',

  /* Focus */
  '.atoll button:focus-visible{outline:none}',
  '.atoll button:focus-visible>span,.atoll .atoll-btn:focus-visible,.atoll .atoll-x:focus-visible,.atoll .atoll-link:focus-visible,.atoll .atoll-bubble:focus-visible,.atoll button.atoll-rest:focus-visible{outline:2px solid var(--a-accent);outline-offset:2px}',
  '.atoll button.atoll-live:focus-visible{outline:2px solid var(--a-accent);outline-offset:-3px;border-radius:999px}',

  /* Motion preferences */
  '@media (prefers-reduced-motion:reduce){.atoll-spin{animation-duration:1.8s}.atoll-ic .draw{animation:none;stroke-dashoffset:0}.atoll-ring .val,.atoll-bar>i{transition:none}}',
].join('\n');
