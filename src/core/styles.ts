// The island's stylesheet. Injected once at mount, or import `buoy-ui/styles.css` and pass injectStyles={false}.
// Public custom properties (set them anywhere above the island, e.g. on :root):
//   --buoy-accent         progress color on dark surfaces   (default #2DD4BF)
//   --buoy-accent-strong  progress color on light surfaces  (default #0F766E)
//   --buoy-ink            fill of the Ink and Notch themes  (default #0B0B0C)
//   --buoy-font           font stack                        (default system UI)
//   --buoy-offset         distance from the screen edge     (default 12px)
//   --buoy-z              stacking order                    (default 2147483000)

const INK_DARK = '--a-edge:rgba(255,255,255,.14);--a-shadow:0 14px 30px -14px rgba(0,0,0,.9),0 2px 6px -2px rgba(0,0,0,.5);';

const FROST_LIGHT = '--a-bg:rgba(255,255,255,.66);--a-fg:#0B0B0C;--a-fg2:#3F3F46;--a-edge:rgba(255,255,255,.7);--a-shadow:0 12px 30px -14px rgba(0,0,0,.4);--a-chip:rgba(11,11,12,.08);--a-chip-2:rgba(11,11,12,.14);--a-primary:#0B0B0C;--a-primary-fg:#fff;--a-track:rgba(11,11,12,.14);--a-row:rgba(11,11,12,.05);--a-row-2:rgba(11,11,12,.09);--a-accent:var(--buoy-accent-strong,#0F766E);--a-blur:blur(20px) saturate(1.6);--a-success:#047857;--a-error:#B91C1C;--a-warn:#B45309;--a-info:#1D4ED8;';
const FROST_DARK = '--a-bg:rgba(32,32,37,.62);--a-fg:#F4F4F5;--a-fg2:#C8C8CE;--a-edge:rgba(255,255,255,.12);--a-chip:rgba(255,255,255,.1);--a-chip-2:rgba(255,255,255,.16);--a-primary:#F4F4F5;--a-primary-fg:#0B0B0C;--a-track:rgba(255,255,255,.16);--a-row:rgba(255,255,255,.05);--a-row-2:rgba(255,255,255,.09);--a-accent:var(--buoy-accent,#2DD4BF);--a-success:#34D399;--a-error:#F87171;--a-warn:#FBBF24;--a-info:#60A5FA;';

const PAPER_LIGHT = '--a-bg:#fff;--a-fg:#111113;--a-fg2:#52525B;--a-edge:#E4E4E7;--a-shadow:0 12px 28px -16px rgba(0,0,0,.3),0 1px 2px rgba(0,0,0,.06);--a-chip:#F4F4F5;--a-chip-2:#EAEAEC;--a-primary:#0B0B0C;--a-primary-fg:#fff;--a-track:#E4E4E7;--a-row:#F7F7F8;--a-row-2:#F0F0F2;--a-accent:var(--buoy-accent-strong,#0F766E);--a-blur:none;--a-success:#047857;--a-error:#B91C1C;--a-warn:#B45309;--a-info:#1D4ED8;';
const PAPER_DARK = '--a-bg:#18181B;--a-fg:#F4F4F5;--a-fg2:#A1A1AA;--a-edge:#2E2E34;--a-shadow:0 14px 30px -14px rgba(0,0,0,.9),0 2px 6px -2px rgba(0,0,0,.5);--a-chip:#232328;--a-chip-2:#2C2C32;--a-primary:#F4F4F5;--a-primary-fg:#0B0B0C;--a-track:#2E2E34;--a-row:#1F1F23;--a-row-2:#26262B;--a-accent:var(--buoy-accent,#2DD4BF);--a-success:#34D399;--a-error:#F87171;--a-warn:#FBBF24;--a-info:#60A5FA;';

const SOLID = '.buoy:is([data-buoy-theme="ink"],[data-buoy-theme="notch"])';
const FROST = '.buoy[data-buoy-theme="frost"]';
const PAPER = '.buoy[data-buoy-theme="paper"]';
const NOTCH = '.buoy[data-buoy-theme="notch"]';
const BOTTOM = '.buoy[data-position="bottom"]';

const rich = (type: string, tone: string) =>
  `.buoy[data-rich="true"][data-type="${type}"]{--a-fill:color-mix(in srgb,var(${tone}) 20%,var(--a-bg));--a-edge:color-mix(in srgb,var(${tone}) 32%,transparent)}`;

export const css = [
  /* Root and tokens */
  '.buoy{position:fixed;left:50%;top:calc(var(--buoy-offset,12px) + env(safe-area-inset-top,0px));width:0;height:0;z-index:var(--buoy-z,2147483000);font-family:var(--buoy-font,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif);font-size:14px;font-weight:400;line-height:1.25;letter-spacing:normal;text-align:left;text-transform:none;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;'
    + '--a-bg:var(--buoy-ink,#0B0B0C);--a-fg:#fff;--a-fg2:rgba(255,255,255,.62);--a-edge:rgba(255,255,255,.07);--a-shadow:0 14px 30px -14px rgba(0,0,0,.55),0 2px 6px -2px rgba(0,0,0,.25);--a-chip:rgba(255,255,255,.1);--a-chip-2:rgba(255,255,255,.16);--a-primary:#fff;--a-primary-fg:#0B0B0C;--a-track:rgba(255,255,255,.16);--a-row:rgba(255,255,255,.05);--a-row-2:rgba(255,255,255,.09);--a-accent:var(--buoy-accent,#2DD4BF);--a-blur:none;--a-success:#34D399;--a-error:#F87171;--a-warn:#FBBF24;--a-info:#60A5FA;--a-fill:var(--a-bg)}',
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
  ':where(.buoy) *,:where(.buoy) *::before,:where(.buoy) *::after{box-sizing:border-box}',
  ':where(.buoy) button{margin:0;font:inherit;color:inherit;letter-spacing:inherit;text-transform:none;-webkit-appearance:none;appearance:none}',
  '.buoy [hidden]{display:none!important}',

  /* Geometry layers */
  `${NOTCH}{top:env(safe-area-inset-top,0px)}`,
  `${BOTTOM}{top:auto;bottom:calc(var(--buoy-offset,12px) + env(safe-area-inset-bottom,0px))}`,
  `${NOTCH}[data-position="bottom"]{top:auto;bottom:env(safe-area-inset-bottom,0px)}`,
  '.buoy-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}',
  '.buoy-stage,.buoy-drag,.buoy-goo{position:absolute;left:0;top:0;width:0;height:0}',
  '.buoy-shadow,.buoy-bshadow,.buoy-fill,.buoy-bfill,.buoy-shell,.buoy-bubble{position:absolute;left:0;top:0}',
  `${BOTTOM} :is(.buoy-stage,.buoy-drag,.buoy-goo,.buoy-shadow,.buoy-bshadow,.buoy-fill,.buoy-bfill,.buoy-shell,.buoy-bubble){top:auto;bottom:0}`,
  '.buoy-bshadow,.buoy-bfill,.buoy-bubble{width:44px;height:44px}',
  '.buoy-shadow,.buoy-bshadow{box-shadow:var(--a-shadow);pointer-events:none}',
  '.buoy-fill,.buoy-bfill{background-color:var(--a-fill);-webkit-backdrop-filter:var(--a-blur);backdrop-filter:var(--a-blur);pointer-events:none;transition:background-color .25s ease}',
  '.buoy-goo.is-gooey{filter:url(#buoy-goo)}',
  '.buoy-shell{overflow:hidden;color:var(--a-fg);box-shadow:inset 0 0 0 1px var(--a-edge);isolation:isolate;touch-action:none;transition:box-shadow .25s ease}',
  '.buoy-bubble{padding:0;border:0;background:transparent;box-shadow:inset 0 0 0 1px var(--a-edge);color:var(--a-fg);display:grid;place-items:center;cursor:pointer}',
  '.buoy-bub-ic{display:grid;color:var(--a-error)}',
  '.buoy-bub-ic svg{width:20px;height:20px}',
  '.buoy-layer{position:absolute;left:50%;top:0;translate:-50% 0;width:max-content}',
  `${BOTTOM} .buoy-layer{top:auto;bottom:0}`,

  /* Notch shoulders */
  `${NOTCH} :is(.buoy-fill,.buoy-bfill)::before,${NOTCH} :is(.buoy-fill,.buoy-bfill)::after{content:"";position:absolute;top:0;width:16px;height:16px;pointer-events:none}`,
  `${NOTCH} :is(.buoy-fill,.buoy-bfill)::before{left:-16px;background:radial-gradient(circle at 0 100%,transparent 15.5px,var(--a-fill) 16px)}`,
  `${NOTCH} :is(.buoy-fill,.buoy-bfill)::after{right:-16px;background:radial-gradient(circle at 100% 100%,transparent 15.5px,var(--a-fill) 16px)}`,
  `${NOTCH}[data-position="bottom"] :is(.buoy-fill,.buoy-bfill)::before{top:auto;bottom:0;background:radial-gradient(circle at 0 0,transparent 15.5px,var(--a-fill) 16px)}`,
  `${NOTCH}[data-position="bottom"] :is(.buoy-fill,.buoy-bfill)::after{top:auto;bottom:0;background:radial-gradient(circle at 100% 0,transparent 15.5px,var(--a-fill) 16px)}`,

  /* Tones */
  '.buoy [data-tone="success"]{--tone:var(--a-success)}',
  '.buoy [data-tone="error"]{--tone:var(--a-error)}',
  '.buoy [data-tone="warn"]{--tone:var(--a-warn)}',
  '.buoy [data-tone="info"]{--tone:var(--a-info)}',
  '.buoy [data-tone="accent"]{--tone:var(--a-accent)}',

  /* Compact row */
  '.buoy-row{display:flex;align-items:center;gap:10px;height:44px;padding:0 18px 0 6px;white-space:nowrap;font-size:14px;font-weight:500;letter-spacing:-.005em;color:var(--a-fg)}',
  '.buoy-row.no-icon{padding-left:18px}',
  '.buoy-row.end-action{padding-right:4px}',
  '.buoy-row.end-ring{padding-right:8px}',
  '.buoy-row.end-badge{padding-right:10px}',
  'button.buoy-row{border:0;background:none;cursor:pointer;text-align:left}',
  '.buoy-ic{width:32px;height:32px;flex:none;border-radius:999px;background:var(--a-chip);color:var(--a-fg);display:grid;place-items:center}',
  '.buoy-ic svg{width:18px;height:18px}',
  '.buoy-ic[data-tone]:not([data-tone=""]),.buoy-tile[data-tone]:not([data-tone=""]){background:color-mix(in srgb,var(--tone) 17%,transparent);color:var(--tone)}',
  '.buoy-title{overflow:hidden;text-overflow:ellipsis;max-width:min(260px,calc(100vw - 170px))}',
  '.buoy-pct{margin-left:2px;min-width:3.4ch;text-align:right;font-size:13px;color:var(--a-fg2);font-variant-numeric:tabular-nums}',
  '.buoy-badge{height:24px;padding:0 8px;border-radius:999px;background:var(--a-chip-2);font-size:12px;font-weight:600;display:inline-flex;align-items:center;font-variant-numeric:tabular-nums}',
  '.buoy-act{flex:none;height:44px;padding:0 0 0 4px;border:0;background:none;display:flex;align-items:center;cursor:pointer}',
  '.buoy-act>span{height:32px;padding:0 14px;border-radius:999px;background:var(--a-chip);font-size:13px;font-weight:600;display:flex;align-items:center;transition:background-color .15s ease}',
  '.buoy-act:hover>span{background:var(--a-chip-2)}',
  '.buoy-link{padding:0;border:0;background:none;cursor:pointer}',
  '.buoy-rest{display:block;width:104px;height:30px;padding:0;border:0;background:none}',
  'button.buoy-rest{cursor:pointer}',
  '.buoy-ring{width:28px;height:28px;flex:none;transform:rotate(-90deg)}',
  '.buoy-ring circle{fill:none;stroke-width:3.5}',
  '.buoy-ring .trk{stroke:var(--a-track)}',
  '.buoy-ring .val{stroke:var(--a-accent);stroke-linecap:round;transition:stroke-dashoffset .35s ease,opacity .2s ease}',
  '.buoy-ring.is-muted .val{stroke:var(--a-fg2)}',
  '.buoy-spin{animation:buoy-spin .9s linear infinite}',
  '@keyframes buoy-spin{to{transform:rotate(360deg)}}',
  '.buoy-ic .draw{stroke-dasharray:20;stroke-dashoffset:20;animation:buoy-draw .36s .1s cubic-bezier(.2,.8,.2,1) forwards}',
  '@keyframes buoy-draw{to{stroke-dashoffset:0}}',

  /* Expanded message */
  '.buoy-exp{width:min(380px,calc(100vw - 24px));padding:14px;display:flex;flex-direction:column;gap:12px;white-space:normal;color:var(--a-fg)}',
  '.buoy-exp-head{display:flex;align-items:center;gap:12px}',
  '.buoy-tile{width:44px;height:44px;flex:none;border-radius:14px;background:var(--a-chip);color:var(--a-fg);display:grid;place-items:center}',
  '.buoy-tile svg{width:22px;height:22px}',
  '.buoy-exp-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
  '.buoy-exp-title{font-size:15px;font-weight:600;letter-spacing:-.01em}',
  '.buoy-exp-desc{font-size:13px;color:var(--a-fg2)}',
  '.buoy-x{width:44px;height:44px;flex:none;padding:0;border:0;border-radius:999px;background:transparent;color:var(--a-fg2);display:grid;place-items:center;cursor:pointer}',
  '.buoy-x:hover{color:var(--a-fg)}',
  '.buoy-x svg{width:16px;height:16px}',
  '.buoy-actions{display:flex;gap:8px}',
  '.buoy-btn{flex:1;height:44px;border:0;border-radius:999px;background:var(--a-chip);color:var(--a-fg);font-size:14px;font-weight:600;line-height:1;cursor:pointer;transition:background-color .15s ease}',
  '.buoy-btn:hover{background:var(--a-chip-2)}',
  '.buoy-btn.is-primary{background:var(--a-primary);color:var(--a-primary-fg)}',
  '.buoy-btn.is-primary:hover{background:var(--a-primary);opacity:.9}',

  /* Tray */
  '.buoy-tray{width:min(420px,calc(100vw - 16px));padding:8px;display:flex;flex-direction:column;gap:4px;white-space:normal;color:var(--a-fg)}',
  '.buoy-tray-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 2px 14px}',
  '.buoy-tray-titles{display:flex;flex-direction:column;gap:2px;min-width:0}',
  '.buoy-tray-title{font-size:15px;font-weight:600;letter-spacing:-.01em}',
  '.buoy-tray-sub{font-size:12px;color:var(--a-fg2)}',
  '.buoy-tray-tools{display:flex;align-items:center;flex:none}',
  '.buoy-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;max-height:min(52vh,420px);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}',
  '.buoy-task{display:flex;align-items:center;gap:12px;padding:10px 2px 10px 10px;border-radius:22px;background:var(--a-row)}',
  '.buoy-task:hover,.buoy-task:focus-within{background:var(--a-row-2)}',
  '.buoy-task[data-status="failed"]{background:color-mix(in srgb,var(--a-error) 9%,transparent)}',
  '.buoy-tile.sm{width:40px;height:40px;border-radius:12px}',
  '.buoy-tile.sm svg{width:20px;height:20px}',
  '.buoy-task-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}',
  '.buoy-task-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}',
  '.buoy-task-name{font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.buoy-task-state{flex:none;font-size:12px;font-weight:500;color:var(--a-fg2);font-variant-numeric:tabular-nums}',
  '.buoy-task-state.is-error{color:var(--a-error);font-weight:600}',
  '.buoy-bar{height:4px;border-radius:999px;background:var(--a-track);overflow:hidden}',
  '.buoy-bar>i{display:block;height:100%;border-radius:inherit;background:var(--a-accent);transition:width .3s ease}',
  '.buoy-task[data-status="paused"] .buoy-bar>i{background:var(--a-fg2)}',
  '.buoy-task[data-status="failed"] .buoy-bar>i{background:var(--a-error)}',
  '.buoy-task-meta{font-size:12px;color:var(--a-fg2);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.buoy-task-actions{display:flex;flex:none}',
  '.buoy-ib{width:44px;height:44px;padding:0;border:0;background:transparent;color:var(--a-fg);display:grid;place-items:center;cursor:pointer}',
  '.buoy-ib>span{width:32px;height:32px;border-radius:999px;background:var(--a-chip);display:grid;place-items:center;transition:background-color .15s ease}',
  '.buoy-ib:hover>span{background:var(--a-chip-2)}',
  '.buoy-ib svg{width:14px;height:14px}',
  '.buoy-task-actions .buoy-ib+.buoy-ib{margin-left:-8px}',
  '.buoy-reveal{display:none}',
  '.buoy-task:hover .buoy-reveal,.buoy-task:focus-within .buoy-reveal{display:grid}',
  '@media (hover:none){.buoy-reveal{display:grid}}',
  '.buoy-tray-foot{display:flex;align-items:center;gap:10px;padding:2px 2px 0 14px;font-size:12px;color:var(--a-fg2)}',
  '.buoy-tray-foot>svg{width:16px;height:16px;flex:none}',
  '.buoy-tray-foot>span{flex:1}',
  '.buoy-empty{margin:0;padding:14px;font-size:13px;color:var(--a-fg2)}',

  /* Focus */
  '.buoy button:focus-visible{outline:none}',
  '.buoy button:focus-visible>span,.buoy .buoy-btn:focus-visible,.buoy .buoy-x:focus-visible,.buoy .buoy-link:focus-visible,.buoy .buoy-bubble:focus-visible,.buoy button.buoy-rest:focus-visible{outline:2px solid var(--a-accent);outline-offset:2px}',
  '.buoy button.buoy-live:focus-visible{outline:2px solid var(--a-accent);outline-offset:-3px;border-radius:999px}',

  /* Motion preferences */
  '@media (prefers-reduced-motion:reduce){.buoy-spin{animation-duration:1.8s}.buoy-ic .draw{animation:none;stroke-dashoffset:0}.buoy-ring .val,.buoy-bar>i{transition:none}}',
].join('\n');
