// Board Module (Whiteboard)
// Adapted from Miro-style infinite whiteboard for 装修指挥官
(function() {
  'use strict';

  // ============ DOM refs (populated in init) ============
  let boardContainer = null;
  let area = null;
  let transform = null;
  let grid = null;
  let connSvg = null;
  let drawSvg = null;
  let zoomPctEl = null;
  let fmtToolbar = null;
  let ctxMenu = null;
  let searchInput = null;
  let drawToolbar = null;
  let mmFloatBar = null;
  let shortcutHint = null;
  let toolbarEl = null;

  // ============ STATE ============
  let scale = 1, panX = 0, panY = 0;
  let isPanning = false, panStartX = 0, panStartY = 0;
  let maxZ = 10;
  let cardIdCounter = 0;
  let currentTool = 'select'; // select | sticky | text | image | draw | mindmap
  let nextStickyColor = 'yellow';
  let highlighterMode = false;

  const cards = new Map();
  let connections = [];
  let connIdCounter = 0;
  let drawStrokes = [];
  let drawIdCounter = 0;
  let groups = [];
  let groupIdCounter = 0;
  const mindmapNodes = new Map();

  const undoStack = [], redoStack = [];
  const UNDO_MAX = 80;

  let dragCard = null, dragStartX = 0, dragStartY = 0, dragCardX = 0, dragCardY = 0, dragMoved = false;
  let dragGroupCards = [];
  let dragGroupStartPositions = [];
  let resizeCard = null, resizeStartW = 0, resizeStartH = 0, resizeMouseX = 0, resizeMouseY = 0;
  let anchorDragFrom = null;
  let connectTempLine = null;
  let snapTarget = null;
  let selectedCardId = null;
  let selectedConnId = null;
  let multiSelectedIds = new Set();
  let editingCardId = null;
  let suppressSave = false;
  let isDrawing = false, currentDrawPoints = [], drawColor = '#2B7FD8', drawWidth = 3;
  let eraserMode = false;
  let selectedStrokeId = null;
  let alignGuides = [];
  let isBoxSelecting = false, boxSelectStart = null, boxSelectEl = null;
  let isCreatingCard = false, creationStart = null, creationPreviewEl = null;

  const DEFAULT_FONT = "-apple-system,BlinkMacSystemFont,'Noto Sans SC',sans-serif";
  const ALIGN_SNAP_THRESHOLD = 6;

  // ============ CSS ============
  const BOARD_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
    @import url('https://cdn.jsdelivr.net/npm/cn-fontsource-hui-wen-ming-chao-ti-regular/font.css');
    @import url('https://cdn.jsdelivr.net/npm/cn-fontsource-lxgw-wen-kai-screen-regular/font.css');
    @import url('https://cdn.jsdelivr.net/npm/cn-fontsource-xiao-lai-ti-regular/font.css');
    @import url('https://cdn.jsdelivr.net/npm/cn-fontsource-you-zai-ti-regular/font.css');
    @import url('https://fonts.googleapis.com/css2?family=Kaisei+Decol&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=New+Tegomin&display=swap');

    .board-module { width:100%; height:100%; position:relative; overflow:hidden; background:#fefcf6; color:#2a2a2a; user-select:none; -webkit-user-select:none; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans SC',sans-serif; }
    .board-module * { margin:0; padding:0; box-sizing:border-box; }

    :root {
      --board-bg:#fefcf6; --board-toolbar-bg:#fefcf6; --board-toolbar-border:rgba(43,127,216,0.18);
      --board-card-bg:#fff; --board-card-shadow:0 2px 8px rgba(43,127,216,0.08);
      --board-card-shadow-hover:0 4px 16px rgba(43,127,216,0.14);
      --board-accent:#2B7FD8; --board-accent-dark:#1e5fa6; --board-accent-light:rgba(43,127,216,0.10);
      --board-accent-border:rgba(43,127,216,0.35);
      --board-blue:#2B7FD8; --board-yellow:#FFD93D;
      --board-text:#2a2a2a; --board-text-sub:#555; --board-text-muted:#888;
      --board-grid-dot:rgba(43,127,216,0.13);
      --board-sticky-yellow:#FFF3B0; --board-sticky-pink:#FCE4EC;
      --board-sticky-blue:#B3E5FC; --board-sticky-green:#C8E6C9;
      --board-sticky-purple:#E1BEE7; --board-sticky-orange:#FFE0B2;
      --board-radius:10px;
      --board-anchor-color:#2B7FD8;
      --board-anchor-size:10px;
    }

    /* Toolbar */
    .board-toolbar { position:absolute; top:0; left:0; right:0; height:48px; background:var(--board-toolbar-bg); display:flex; align-items:center; padding:0 14px; z-index:1000; border-bottom:2px dashed var(--board-toolbar-border); gap:4px; }
    .board-tb-sep { width:1px; height:24px; background:var(--board-toolbar-border); margin:0 4px; flex-shrink:0; }
    .board-tb-btn { display:flex; align-items:center; justify-content:center; gap:5px; height:34px; padding:0 12px; border-radius:10px; border:2px dashed var(--board-accent-border); background:transparent; color:var(--board-accent); font-size:13px; font-weight:600; cursor:pointer; transition:all .18s; white-space:nowrap; font-family:'Inter',-apple-system,'Noto Sans SC',sans-serif; box-shadow:none; }
    .board-tb-btn:hover { background:var(--board-accent-light); border-color:var(--board-blue); border-style:solid; }
    .board-tb-btn.active { background:var(--board-accent); color:#fff; border-color:var(--board-accent); border-style:solid; box-shadow:0 2px 6px rgba(43,127,216,0.25); }
    .board-tb-btn.active:hover { background:var(--board-accent-dark); }
    .board-tb-btn svg { width:16px; height:16px; flex-shrink:0; }
    .board-tb-btn.danger { border-color:rgba(220,38,38,0.3); color:#dc2626; }
    .board-tb-btn.danger:hover { background:rgba(220,38,38,0.08); color:#dc2626; border-color:#dc2626; border-style:solid; }
    .board-tb-spacer { flex:1; }
    .board-tb-btn.disabled { opacity:.35; pointer-events:none; }
    .board-tb-btn.icon-only { padding:0 8px; }

    /* Search */
    .board-search-bar { display:flex; align-items:center; gap:4px; height:34px; border:2px dashed var(--board-accent-border); border-radius:10px; padding:0 10px; transition:all .18s; background:transparent; }
    .board-search-bar:focus-within { border-color:var(--board-blue); border-style:solid; background:var(--board-accent-light); }
    .board-search-bar svg { width:14px; height:14px; color:var(--board-text-muted); flex-shrink:0; }
    .board-search-bar input { border:none; outline:none; background:transparent; font-size:12px; width:110px; color:var(--board-text); font-family:inherit; }
    .board-search-bar input::placeholder { color:var(--board-text-muted); }

    /* Canvas */
    .board-canvas-area { position:absolute; top:48px; left:0; right:0; bottom:0; overflow:hidden; background:var(--board-bg); cursor:grab; }
    .board-canvas-area:active { cursor:grabbing; }
    .board-canvas-area.tool-sticky, .board-canvas-area.tool-text { cursor:crosshair; }
    .board-canvas-area.tool-draw { cursor:crosshair; }
    .board-canvas-area.tool-mindmap { cursor:crosshair; }
    .board-canvas-area.tool-highlighter { cursor:crosshair; }
    .board-canvas-grid { position:absolute; inset:0; background-image:radial-gradient(circle,var(--board-grid-dot) 1px,transparent 1px); background-size:24px 24px; pointer-events:none; transform-origin:0 0; }
    .board-canvas-transform { position:absolute; top:0; left:0; transform-origin:0 0; will-change:transform; }

    /* Alignment guides */
    .board-align-guide { position:fixed; z-index:999; pointer-events:none; background:var(--board-accent); }
    .board-align-guide-h { left:0; right:0; height:1px; }
    .board-align-guide-v { top:48px; bottom:0; width:1px; }

    /* Cards */
    .board-card { position:absolute; border-radius:var(--board-radius); box-shadow:var(--board-card-shadow); transition:box-shadow .2s; overflow:visible; cursor:grab; min-width:60px; min-height:40px; }
    .board-card:hover { box-shadow:var(--board-card-shadow-hover); }
    .board-card.selected { box-shadow:0 0 0 2.5px var(--board-accent),var(--board-card-shadow-hover); }
    .board-card.dragging { box-shadow:0 8px 24px rgba(43,127,216,0.18),0 0 0 2.5px var(--board-accent)!important; z-index:9999!important; cursor:grabbing; opacity:.92; }
    .board-card.removing { opacity:0; transform:scale(.92); pointer-events:none; transition:all .25s; }
    .board-card.locked { border:2px dashed #aaa!important; cursor:default!important; }
    .board-card.locked .board-card-resize { display:none!important; }
    .board-card.locked .board-anchor-point { display:none!important; }
    .board-card .board-lock-icon { position:absolute; top:4px; left:4px; font-size:12px; z-index:13; display:none; pointer-events:none; }
    .board-card.locked .board-lock-icon { display:block; }
    .board-card.search-dim { opacity:0.2; transition:opacity .2s; }
    .board-card.search-hit { box-shadow:0 0 0 3px #FFD93D,var(--board-card-shadow-hover); transition:box-shadow .2s; }
    .board-card.multi-selected { box-shadow:0 0 0 2.5px var(--board-accent),var(--board-card-shadow-hover); }

    /* Anchor points */
    .board-anchor-point { position:absolute; width:var(--board-anchor-size); height:var(--board-anchor-size); border-radius:50%; background:var(--board-anchor-color); border:2px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.18); cursor:crosshair; z-index:12; opacity:0; transition:opacity .18s,transform .15s; pointer-events:none; transform:scale(0.6); }
    .board-card:hover .board-anchor-point, .board-card.dragging-anchor .board-anchor-point, .board-card.anchor-target .board-anchor-point { opacity:1; pointer-events:auto; transform:scale(1); }
    .board-anchor-point:hover, .board-anchor-point.active { background:#FFD93D; transform:scale(1.3); box-shadow:0 0 0 3px rgba(43,127,216,0.25),0 1px 4px rgba(0,0,0,0.18); }
    .board-anchor-point.snap-highlight { background:#FFD93D; transform:scale(1.4); opacity:1; pointer-events:auto; box-shadow:0 0 0 4px rgba(255,217,61,0.4),0 1px 4px rgba(0,0,0,0.18); }
    .board-anchor-top { left:50%; top:0; transform:translate(-50%,-50%) scale(0.6); }
    .board-card:hover .board-anchor-top, .board-card.dragging-anchor .board-anchor-top, .board-card.anchor-target .board-anchor-top { transform:translate(-50%,-50%) scale(1); }
    .board-anchor-top:hover, .board-anchor-top.active, .board-anchor-top.snap-highlight { transform:translate(-50%,-50%) scale(1.3); }
    .board-anchor-bottom { left:50%; bottom:0; transform:translate(-50%,50%) scale(0.6); }
    .board-card:hover .board-anchor-bottom, .board-card.dragging-anchor .board-anchor-bottom, .board-card.anchor-target .board-anchor-bottom { transform:translate(-50%,50%) scale(1); }
    .board-anchor-bottom:hover, .board-anchor-bottom.active, .board-anchor-bottom.snap-highlight { transform:translate(-50%,50%) scale(1.3); }
    .board-anchor-left { top:50%; left:0; transform:translate(-50%,-50%) scale(0.6); }
    .board-card:hover .board-anchor-left, .board-card.dragging-anchor .board-anchor-left, .board-card.anchor-target .board-anchor-left { transform:translate(-50%,-50%) scale(1); }
    .board-anchor-left:hover, .board-anchor-left.active, .board-anchor-left.snap-highlight { transform:translate(-50%,-50%) scale(1.3); }
    .board-anchor-right { top:50%; right:0; transform:translate(50%,-50%) scale(0.6); }
    .board-card:hover .board-anchor-right, .board-card.dragging-anchor .board-anchor-right, .board-card.anchor-target .board-anchor-right { transform:translate(50%,-50%) scale(1); }
    .board-anchor-right:hover, .board-anchor-right.active, .board-anchor-right.snap-highlight { transform:translate(50%,-50%) scale(1.3); }

    /* Sticky */
    .board-card-sticky { padding:10px 12px; font-size:16px; line-height:1.3; border:none; min-width:160px; min-height:100px; border-radius:var(--board-radius); box-shadow:0 2px 8px rgba(0,0,0,0.06); font-family:'Caveat','Xiaolai','Yozai',cursive!important; box-shadow:2px 4px 12px rgba(0,0,0,0.13),0 1px 3px rgba(0,0,0,0.06)!important; position:relative; background-image:repeating-linear-gradient(135deg,transparent,transparent 10px,rgba(0,0,0,0.012) 10px,rgba(0,0,0,0.012) 11px); }
    .board-card-sticky.yellow { background:var(--board-sticky-yellow); }
    .board-card-sticky.pink { background:var(--board-sticky-pink); }
    .board-card-sticky.blue { background:var(--board-sticky-blue); }
    .board-card-sticky.green { background:var(--board-sticky-green); }
    .board-card-sticky.purple { background:var(--board-sticky-purple); }
    .board-card-sticky.orange { background:var(--board-sticky-orange); }
    .board-card-sticky .board-card-content { outline:none; min-height:40px; word-break:break-word; width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; font-family:inherit!important; }
    .board-card-sticky::before { content:'📌'; position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-size:16px; z-index:13; pointer-events:none; filter:drop-shadow(0 1px 1px rgba(0,0,0,0.18)); }
    .board-card-sticky::after { content:''; position:absolute; bottom:0; right:0; width:0; height:0; border-style:solid; border-width:0 0 22px 22px; border-color:transparent transparent rgba(0,0,0,0.08) transparent; border-radius:0 0 var(--board-radius) 0; pointer-events:none; }

    /* Text box */
    .board-card-textbox { background:var(--board-card-bg); border:1px solid var(--board-toolbar-border); padding:10px 12px; font-size:15px; line-height:1.3; min-width:180px; min-height:60px; }
    .board-card-textbox.yellow { background:var(--board-sticky-yellow); border-color:transparent; }
    .board-card-textbox.pink { background:var(--board-sticky-pink); border-color:transparent; }
    .board-card-textbox.blue { background:var(--board-sticky-blue); border-color:transparent; }
    .board-card-textbox.green { background:var(--board-sticky-green); border-color:transparent; }
    .board-card-textbox.purple { background:var(--board-sticky-purple); border-color:transparent; }
    .board-card-textbox.orange { background:var(--board-sticky-orange); border-color:transparent; }
    .board-card-textbox .board-card-content { outline:none; min-height:30px; word-break:break-word; width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; }

    /* Image card */
    .board-card-image { background:var(--board-card-bg); border:1px solid var(--board-toolbar-border); min-width:100px; overflow:hidden; }
    .board-card-image .board-img-zone { min-height:60px; display:flex; align-items:center; justify-content:center; background:#fafafa; position:relative; }
    .board-card-image .board-img-zone.empty { cursor:pointer; border:2px dashed #b8c8e0; margin:8px; border-radius:6px; min-height:80px; }
    .board-card-image .board-img-zone.empty:hover { border-color:var(--board-accent); background:var(--board-accent-light); }
    .board-card-image .board-img-zone img { width:100%; display:block; }
    .board-card-image .board-img-caption { padding:10px 14px; font-size:13px; color:var(--board-text-sub); outline:none; min-height:20px; word-break:break-word; }

    /* Resize handle */
    .board-card-resize { position:absolute; bottom:0; right:0; width:16px; height:16px; cursor:nwse-resize; z-index:11; opacity:0; transition:opacity .2s; }
    .board-card:hover .board-card-resize { opacity:.5; }
    .board-card-resize:hover { opacity:1!important; }
    .board-card-resize::after { content:''; position:absolute; bottom:2px; right:2px; width:8px; height:8px; border-right:2px solid #999; border-bottom:2px solid #999; }

    /* Group */
    .board-group-rect { position:absolute; border:2px dashed var(--board-accent-border); border-radius:12px; pointer-events:none; background:rgba(43,127,216,0.03); }

    /* Creation preview */
    .board-creation-preview { position:absolute; border:2px dashed var(--board-accent); background:rgba(43,127,216,0.08); border-radius:var(--board-radius); pointer-events:none; z-index:9998; }

    /* Selection box */
    .board-selection-box { position:absolute; border:2px dashed var(--board-accent); background:rgba(43,127,216,0.05); pointer-events:none; z-index:9998; }

    /* Connection lines */
    .board-connections-svg { position:absolute; top:0; left:0; pointer-events:none; overflow:visible; }
    .board-conn-hit { fill:none; stroke:transparent; stroke-width:16; pointer-events:stroke; cursor:pointer; }
    .board-conn-line { fill:none; stroke:var(--board-accent); stroke-width:2; stroke-linecap:round; stroke-dasharray:8 4; }
    .board-conn-line.style-solid { stroke-dasharray:none; }
    .board-conn-line.style-dashed { stroke-dasharray:8 4; }
    .board-conn-line.style-arrow { stroke-dasharray:none; }
    .board-conn-line.selected { stroke:var(--board-accent-dark); stroke-width:3; }
    .board-connect-line-temp { stroke:var(--board-accent); stroke-width:2; stroke-dasharray:6 4; fill:none; pointer-events:none; }

    /* Drawing strokes */
    .board-draw-stroke { fill:none; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }
    .board-draw-stroke.interactive { pointer-events:stroke; cursor:pointer; }
    .board-draw-stroke.eraser-hover { filter:drop-shadow(0 0 4px #dc2626); opacity:0.5; }
    .board-draw-stroke.stroke-selected { filter:drop-shadow(0 0 3px var(--board-accent)); stroke-opacity:0.8; }
    .board-canvas-area.tool-eraser { cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='none' stroke='%23dc2626' stroke-width='2'/%3E%3Cline x1='6' y1='6' x2='18' y2='18' stroke='%23dc2626' stroke-width='2'/%3E%3C/svg%3E") 12 12, crosshair; }

    /* Zoom controls */
    .board-zoom-controls { position:absolute; bottom:16px; right:16px; display:flex; align-items:center; gap:2px; background:var(--board-toolbar-bg); border-radius:10px; border:2px dashed var(--board-toolbar-border); padding:3px; z-index:1000; }
    .board-zoom-btn { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:8px; color:var(--board-text-sub); cursor:pointer; transition:all .15s; font-size:14px; border:none; background:transparent; font-family:inherit; }
    .board-zoom-btn:hover { background:var(--board-accent-light); color:var(--board-accent); }
    .board-zoom-pct { font-size:11px; font-family:'SF Mono',Menlo,monospace; min-width:40px; text-align:center; color:var(--board-text-muted); }

    /* Formatting toolbar */
    .board-fmt-toolbar { position:absolute; display:none; align-items:center; gap:2px; background:var(--board-toolbar-bg); border:2px dashed var(--board-toolbar-border); border-radius:10px; padding:4px 6px; z-index:2000; box-shadow:0 4px 16px rgba(43,127,216,0.10); white-space:nowrap; }
    .board-fmt-toolbar.show { display:flex; }
    .board-fmt-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; border:none; background:transparent; color:var(--board-text-sub); transition:all .12s; font-family:inherit; }
    .board-fmt-btn:hover { background:var(--board-accent-light); color:var(--board-accent); }
    .board-fmt-btn.active { background:var(--board-accent); color:#fff; }
    .board-fmt-select { height:28px; border:1px solid var(--board-toolbar-border); border-radius:6px; font-size:12px; padding:0 4px; background:var(--board-toolbar-bg); color:var(--board-text); cursor:pointer; font-family:inherit; outline:none; }
    .board-fmt-select:focus { border-color:var(--board-accent); }
    .board-fmt-select option { padding:4px 8px; }
    .board-fmt-sep { width:1px; height:20px; background:var(--board-toolbar-border); margin:0 2px; }

    /* Draw toolbar */
    .board-draw-toolbar { position:absolute; bottom:60px; left:50%; transform:translateX(-50%); display:none; align-items:center; gap:6px; background:var(--board-toolbar-bg); border:2px dashed var(--board-toolbar-border); border-radius:10px; padding:6px 12px; z-index:1001; box-shadow:0 4px 16px rgba(43,127,216,0.10); }
    .board-draw-toolbar.show { display:flex; }
    .board-draw-toolbar label { font-size:11px; color:var(--board-text-muted); }
    .board-draw-toolbar input[type=range] { width:60px; accent-color:var(--board-accent); }
    .board-draw-color-dot { width:20px; height:20px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all .12s; }
    .board-draw-color-dot:hover { transform:scale(1.15); }
    .board-draw-color-dot.active { border-color:var(--board-text); box-shadow:0 0 0 2px var(--board-accent-light); }

    /* Shortcut hints */
    .board-shortcut-hint { position:absolute; bottom:16px; left:16px; background:var(--board-toolbar-bg); border:2px dashed var(--board-toolbar-border); border-radius:10px; padding:8px 12px; z-index:1000; font-size:11px; color:var(--board-text-muted); line-height:1.7; max-height:36px; overflow:hidden; transition:max-height .25s ease,padding .25s; cursor:pointer; }
    .board-shortcut-hint.expanded { max-height:400px; padding:10px 14px; cursor:default; }
    .board-shortcut-hint kbd { background:#edf2fa; border:1px solid #d4dce8; border-radius:4px; padding:1px 5px; font-family:'SF Mono',Menlo,monospace; font-size:10px; color:var(--board-text-sub); }
    .board-shortcut-hint .board-hint-toggle { font-weight:600; color:var(--board-accent); cursor:pointer; }

    /* Context menu */
    .board-ctx-menu { position:fixed; display:none; background:var(--board-toolbar-bg); border:2px dashed var(--board-toolbar-border); border-radius:10px; padding:4px; z-index:3000; box-shadow:0 4px 16px rgba(43,127,216,0.10); min-width:170px; }
    .board-ctx-menu.show { display:block; }
    .board-ctx-item { display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:6px; font-size:13px; color:var(--board-text); cursor:pointer; transition:background .1s; }
    .board-ctx-item:hover { background:var(--board-accent-light); color:var(--board-accent); }
    .board-ctx-item.danger { color:#dc2626; }
    .board-ctx-item.danger:hover { background:rgba(220,38,38,0.08); }
    .board-ctx-sep { height:1px; background:var(--board-toolbar-border); margin:3px 8px; }
    .board-ctx-item .board-ctx-shortcut { margin-left:auto; font-size:10px; color:var(--board-text-muted); font-family:'SF Mono',Menlo,monospace; }

    /* Color picker */
    .board-color-row { display:flex; gap:4px; margin:2px 0; flex-wrap:wrap; }
    .board-color-dot { width:20px; height:20px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all .12s; }
    .board-color-dot:hover { transform:scale(1.15); }
    .board-color-dot.active { border-color:var(--board-accent); box-shadow:0 0 0 2px var(--board-accent-light); }
    .board-color-dot.c-yellow { background:var(--board-sticky-yellow); }
    .board-color-dot.c-pink { background:var(--board-sticky-pink); }
    .board-color-dot.c-blue { background:var(--board-sticky-blue); }
    .board-color-dot.c-green { background:var(--board-sticky-green); }
    .board-color-dot.c-purple { background:var(--board-sticky-purple); }
    .board-color-dot.c-orange { background:var(--board-sticky-orange); }
    .board-color-dot.c-black { background:#333; }
    .board-color-dot.c-white { background:#fff; border-color:#ccc; }
    .board-color-dot.c-red { background:#e74c3c; }
    .board-color-dot.c-darkblue { background:#2c3e95; }
    .board-color-dot.c-teal { background:#1abc9c; }
    .board-color-dot.c-gray { background:#95a5a6; }
    .board-text-color-label { font-size:11px; color:#888; margin-right:2px; }

    /* Sticky color picker dropdown */
    .board-sticky-color-picker { position:absolute; top:100%; left:0; margin-top:4px; background:var(--board-toolbar-bg); border:2px dashed var(--board-toolbar-border); border-radius:10px; padding:8px; display:none; gap:6px; z-index:1001; box-shadow:0 4px 16px rgba(43,127,216,0.10); }
    .board-sticky-color-picker.show { display:flex; }
    .board-scp-dot { width:28px; height:28px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all .12s; }
    .board-scp-dot:hover { transform:scale(1.15); border-color:var(--board-accent); }

    /* Font picker */
    .board-font-picker { position:relative; display:inline-block; vertical-align:middle; }
    .board-font-picker-display { height:28px; border:1px solid var(--board-toolbar-border); border-radius:6px; font-size:12px; padding:0 8px; background:var(--board-toolbar-bg); color:var(--board-text); cursor:pointer; font-family:inherit; outline:none; display:flex; align-items:center; gap:4px; white-space:nowrap; min-width:100px; user-select:none; -webkit-user-select:none; transition:border-color .12s; }
    .board-font-picker-display:hover { border-color:var(--board-accent); }
    .board-font-picker.open .board-font-picker-display { border-color:var(--board-accent); }
    .board-font-picker-dropdown { display:none; position:absolute; top:100%; left:0; margin-top:4px; background:var(--board-toolbar-bg); border-radius:8px; box-shadow:0 6px 24px rgba(43,127,216,0.15); z-index:3000; min-width:180px; max-height:320px; overflow-y:auto; padding:4px 0; }
    .board-font-picker.open .board-font-picker-dropdown { display:block; }
    .board-font-picker-option { padding:8px 12px; cursor:pointer; font-size:14px; color:var(--board-text); transition:background .1s; white-space:nowrap; }
    .board-font-picker-option:hover { background:var(--board-accent-light); color:var(--board-accent); }
    .board-font-picker-option.selected { background:var(--board-accent); color:#fff; }

    /* Mindmap nodes */
    .board-card-mindmap { border-radius:24px; padding:10px 20px; font-size:15px; display:flex; align-items:center; justify-content:center; text-align:center; white-space:nowrap; min-width:100px; min-height:44px; border:2px solid transparent; }
    .board-card-mindmap .board-card-content { outline:none; word-break:break-word; width:100%; display:flex; align-items:center; justify-content:center; text-align:center; white-space:nowrap; }
    .board-card-mindmap.mm-level-0 { background:#2B7FD8; color:#fff; font-size:18px; font-weight:700; min-width:140px; min-height:56px; border-radius:50%; padding:14px 28px; box-shadow:0 4px 16px rgba(43,127,216,0.25); }
    .board-card-mindmap.mm-level-1 { background:#dce8f7; color:#2a2a2a; font-weight:600; border-radius:16px; min-width:110px; min-height:44px; }
    .board-card-mindmap.mm-level-2, .board-card-mindmap.mm-level-deep { background:#fff; color:#2a2a2a; border:2px solid #2B7FD8; border-radius:12px; min-width:90px; min-height:38px; font-size:14px; }
    .board-card-mindmap .board-card-resize { display:none; }

    /* Mindmap floating toolbar */
    .board-mm-float-bar { position:absolute; bottom:60px; left:50%; transform:translateX(-50%); display:none; align-items:center; gap:6px; background:var(--board-toolbar-bg); border:2px dashed var(--board-toolbar-border); border-radius:10px; padding:6px 12px; z-index:1001; box-shadow:0 4px 16px rgba(43,127,216,0.10); }
    .board-mm-float-bar.show { display:flex; }

    /* Scrollbar */
    .board-module ::-webkit-scrollbar { width:6px; }
    .board-module ::-webkit-scrollbar-track { background:transparent; }
    .board-module ::-webkit-scrollbar-thumb { background:#b8c8e0; border-radius:3px; }
  `;

  // ============ INIT DOM ============
  function initBoard() {
    boardContainer = document.getElementById('boardContainer');
    if (!boardContainer) {
      console.error('boardContainer not found');
      return;
    }
    boardContainer.classList.add('board-module');

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = BOARD_CSS;
    boardContainer.appendChild(styleEl);

    // Toolbar
    toolbarEl = document.createElement('div');
    toolbarEl.className = 'board-toolbar';
    toolbarEl.id = 'boardToolbar';
    toolbarEl.innerHTML = `
      <button class="board-tb-btn active" id="boardToolSelect" title="选择 (V)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
        选择
      </button>
      <div style="position:relative;display:inline-flex">
        <button class="board-tb-btn" id="boardToolSticky" title="便签 (N)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M14 3v6a2 2 0 0 0 2 2h6"/></svg>
          便签
        </button>
        <button class="board-tb-btn icon-only" id="boardStickyColorToggle" title="选择便签颜色" style="padding:0 6px;margin-left:-2px;border-left:none;border-top-left-radius:0;border-bottom-left-radius:0">▾</button>
        <div class="board-sticky-color-picker" id="boardStickyColorPicker">
          <div class="board-scp-dot" data-color="yellow" style="background:var(--board-sticky-yellow)" title="黄色"></div>
          <div class="board-scp-dot" data-color="blue" style="background:var(--board-sticky-blue)" title="浅蓝"></div>
          <div class="board-scp-dot" data-color="pink" style="background:var(--board-sticky-pink)" title="浅粉"></div>
          <div class="board-scp-dot" data-color="green" style="background:var(--board-sticky-green)" title="浅绿"></div>
          <div class="board-scp-dot" data-color="purple" style="background:var(--board-sticky-purple)" title="浅紫"></div>
          <div class="board-scp-dot" data-color="orange" style="background:var(--board-sticky-orange)" title="浅橙"></div>
        </div>
      </div>
      <button class="board-tb-btn" id="boardToolText" title="文本框 (T)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        文本
      </button>
      <button class="board-tb-btn" id="boardToolImage" title="图片 (I)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        图片
      </button>
      <button class="board-tb-btn" id="boardToolDraw" title="画笔 (P)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        画笔
      </button>
      <button class="board-tb-btn" id="boardToolMindmap" title="导图 (M)">🧠 导图</button>
      <div class="board-tb-sep"></div>
      <button class="board-tb-btn disabled" id="boardBtnUndo" title="撤销 (⌘Z)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      </button>
      <button class="board-tb-btn disabled" id="boardBtnRedo" title="重做 (⌘⇧Z)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
      </button>
      <div class="board-tb-spacer"></div>
      <div class="board-search-bar" id="boardSearchBar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="boardSearchInput" placeholder="搜索卡片 (/)">
      </div>
      <div class="board-tb-sep"></div>
      <button class="board-tb-btn" id="boardBtnExportPng" title="导出PNG (⌘E)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        导出
      </button>
      <button class="board-tb-btn danger" id="boardBtnClear" title="清空画布">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        清空
      </button>
    `;
    boardContainer.appendChild(toolbarEl);

    // Canvas area
    area = document.createElement('div');
    area.className = 'board-canvas-area';
    area.id = 'boardCanvasArea';
    area.innerHTML = `
      <div class="board-canvas-grid" id="boardCanvasGrid"></div>
      <div class="board-canvas-transform" id="boardCanvasTransform">
        <svg class="board-connections-svg" id="boardConnSvg">
          <defs>
            <marker id="boardArrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#2B7FD8"/></marker>
            <marker id="boardArrowHeadDark" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#1e5fa6"/></marker>
          </defs>
        </svg>
        <svg class="board-connections-svg" id="boardDrawSvg" style="z-index:5"></svg>
      </div>
    `;
    boardContainer.appendChild(area);

    // Refs
    transform = document.getElementById('boardCanvasTransform');
    grid = document.getElementById('boardCanvasGrid');
    connSvg = document.getElementById('boardConnSvg');
    drawSvg = document.getElementById('boardDrawSvg');
    zoomPctEl = document.createElement('span');
    zoomPctEl.className = 'board-zoom-pct';
    zoomPctEl.id = 'boardZoomPct';
    zoomPctEl.textContent = '100%';

    // Formatting toolbar
    fmtToolbar = document.createElement('div');
    fmtToolbar.className = 'board-fmt-toolbar';
    fmtToolbar.id = 'boardFmtToolbar';
    fmtToolbar.innerHTML = `
      <div class="board-font-picker" id="boardFontPicker">
        <div class="board-font-picker-display" id="boardFontPickerDisplay">苹方/默认 ▾</div>
        <div class="board-font-picker-dropdown" id="boardFontPickerDropdown">
          <div class="board-font-picker-option selected" data-value="-apple-system,BlinkMacSystemFont,'Noto Sans SC',sans-serif" style="font-family:-apple-system,BlinkMacSystemFont,'Noto Sans SC',sans-serif">苹方/默认</div>
          <div class="board-font-picker-option" data-value="'STKaiti','KaiTi',serif" style="font-family:'STKaiti','KaiTi',serif">华文楷体</div>
          <div class="board-font-picker-option" data-value="'Songti SC','SimSun',serif" style="font-family:'Songti SC','SimSun',serif">宋体</div>
          <div class="board-font-picker-option" data-value="'Heiti SC','SimHei',sans-serif" style="font-family:'Heiti SC','SimHei',sans-serif">黑体</div>
          <div class="board-font-picker-option" data-value="Inter,-apple-system,sans-serif" style="font-family:Inter,-apple-system,sans-serif">Inter</div>
          <div class="board-font-picker-option" data-value="Georgia,serif" style="font-family:Georgia,serif">Georgia</div>
          <div class="board-font-picker-option" data-value="'Courier New',monospace" style="font-family:'Courier New',monospace">Courier New</div>
          <div class="board-font-picker-option" data-value="'Caveat',cursive" style="font-family:'Caveat',cursive">Caveat</div>
          <div class="board-font-picker-option" data-value="'汇文明朝体',serif" style="font-family:'汇文明朝体',serif">汇文明朝体</div>
          <div class="board-font-picker-option" data-value="'LXGWWenKaiScreen',serif" style="font-family:'LXGWWenKaiScreen',serif">霞鹜文楷</div>
          <div class="board-font-picker-option" data-value="'Xiaolai',sans-serif" style="font-family:'Xiaolai',sans-serif">小赖体</div>
          <div class="board-font-picker-option" data-value="'Yozai',sans-serif" style="font-family:'Yozai',sans-serif">悠哉体</div>
          <div class="board-font-picker-option" data-value="'Kaisei Decol',serif" style="font-family:'Kaisei Decol',serif">Kaisei Decol</div>
          <div class="board-font-picker-option" data-value="'DotGothic16',sans-serif" style="font-family:'DotGothic16',sans-serif">DotGothic16</div>
          <div class="board-font-picker-option" data-value="'New Tegomin',serif" style="font-family:'New Tegomin',serif">New Tegomin</div>
        </div>
      </div>
      <div class="board-fmt-sep"></div>
      <select class="board-fmt-select" id="boardFmtSize" title="字号">
        <option value="12">12</option><option value="14">14</option><option value="16" selected>16</option>
        <option value="18">18</option><option value="20">20</option><option value="24">24</option>
        <option value="28">28</option><option value="32">32</option><option value="40">40</option>
        <option value="48">48</option><option value="56">56</option><option value="64">64</option><option value="72">72</option>
      </select>
      <div class="board-fmt-sep"></div>
      <button class="board-fmt-btn" id="boardFmtBold" title="加粗"><b>B</b></button>
      <button class="board-fmt-btn" id="boardFmtItalic" title="斜体"><i>I</i></button>
      <div class="board-fmt-sep"></div>
      <div class="board-color-row" id="boardFmtColors">
        <div class="board-color-dot c-yellow" data-color="yellow"></div>
        <div class="board-color-dot c-blue" data-color="blue"></div>
        <div class="board-color-dot c-pink" data-color="pink"></div>
        <div class="board-color-dot c-green" data-color="green"></div>
        <div class="board-color-dot c-purple" data-color="purple"></div>
        <div class="board-color-dot c-orange" data-color="orange"></div>
      </div>
      <div class="board-fmt-sep" id="boardFmtTextColorSep"></div>
      <div class="board-color-row" id="boardFmtTextColors">
        <span class="board-text-color-label">A</span>
        <div class="board-color-dot c-black" data-textcolor="#333"></div>
        <div class="board-color-dot c-white" data-textcolor="#ffffff"></div>
        <div class="board-color-dot c-red" data-textcolor="#e74c3c"></div>
        <div class="board-color-dot c-darkblue" data-textcolor="#2c3e95"></div>
        <div class="board-color-dot c-teal" data-textcolor="#1abc9c"></div>
        <div class="board-color-dot c-purple" data-textcolor="#7c3aed"></div>
        <div class="board-color-dot c-orange" data-textcolor="#e67e22"></div>
        <div class="board-color-dot c-gray" data-textcolor="#95a5a6"></div>
      </div>
    `;
    boardContainer.appendChild(fmtToolbar);

    // Draw toolbar
    drawToolbar = document.createElement('div');
    drawToolbar.className = 'board-draw-toolbar';
    drawToolbar.id = 'boardDrawToolbar';
    drawToolbar.innerHTML = `
      <button class="board-tb-btn active" id="boardDrawModePen" title="画笔" style="height:28px;padding:0 8px;font-size:12px">🖊 画笔</button>
      <button class="board-tb-btn" id="boardDrawModeHighlighter" title="荧光笔 (H)" style="height:28px;padding:0 8px;font-size:12px">🖍 荧光笔</button>
      <button class="board-tb-btn" id="boardDrawModeEraser" title="橡皮擦 (E)" style="height:28px;padding:0 8px;font-size:12px">🧹 橡皮擦</button>
      <div class="board-fmt-sep"></div>
      <label>粗细</label>
      <input type="range" id="boardDrawSize" min="1" max="40" value="3">
      <div class="board-fmt-sep"></div>
      <span id="boardPenColorDots">
        <div class="board-draw-color-dot active" data-color="#2B7FD8" style="background:#2B7FD8"></div>
        <div class="board-draw-color-dot" data-color="#2a2a2a" style="background:#2a2a2a"></div>
        <div class="board-draw-color-dot" data-color="#dc2626" style="background:#dc2626"></div>
        <div class="board-draw-color-dot" data-color="#16a34a" style="background:#16a34a"></div>
        <div class="board-draw-color-dot" data-color="#FFD93D" style="background:#FFD93D"></div>
      </span>
      <span id="boardHighlighterColorDots" style="display:none">
        <div class="board-draw-color-dot active" data-color="#FFEB3B" style="background:#FFEB3B"></div>
        <div class="board-draw-color-dot" data-color="#76FF03" style="background:#76FF03"></div>
        <div class="board-draw-color-dot" data-color="#FF80AB" style="background:#FF80AB"></div>
        <div class="board-draw-color-dot" data-color="#40C4FF" style="background:#40C4FF"></div>
        <div class="board-draw-color-dot" data-color="#FFAB40" style="background:#FFAB40"></div>
      </span>
    `;
    boardContainer.appendChild(drawToolbar);

    // Mindmap float bar
    mmFloatBar = document.createElement('div');
    mmFloatBar.className = 'board-mm-float-bar';
    mmFloatBar.id = 'boardMmFloatBar';
    mmFloatBar.innerHTML = `
      <button class="board-tb-btn" id="boardMmAddChild" title="添加子节点 (Tab)" style="height:28px;padding:0 10px;font-size:12px">➕ 子节点</button>
      <button class="board-tb-btn" id="boardMmAddSibling" title="添加同级节点 (Enter)" style="height:28px;padding:0 10px;font-size:12px">➕ 同级</button>
      <div class="board-fmt-sep"></div>
      <button class="board-tb-btn" id="boardMmAutoLayout" title="自动整理" style="height:28px;padding:0 10px;font-size:12px">🔄 整理</button>
    `;
    boardContainer.appendChild(mmFloatBar);

    // Context menu
    ctxMenu = document.createElement('div');
    ctxMenu.className = 'board-ctx-menu';
    ctxMenu.id = 'boardCtxMenu';
    boardContainer.appendChild(ctxMenu);

    // Zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.className = 'board-zoom-controls';
    zoomControls.innerHTML = `
      <button class="board-zoom-btn" id="boardZoomOut" title="缩小">−</button>
      <span class="board-zoom-pct" id="boardZoomPct">100%</span>
      <button class="board-zoom-btn" id="boardZoomIn" title="放大">+</button>
      <button class="board-zoom-btn" id="boardZoomFit" title="适应窗口" style="font-size:11px">⊡</button>
    `;
    boardContainer.appendChild(zoomControls);
    zoomPctEl = document.getElementById('boardZoomPct');

    // Shortcut hints
    shortcutHint = document.createElement('div');
    shortcutHint.className = 'board-shortcut-hint';
    shortcutHint.id = 'boardShortcutHint';
    shortcutHint.innerHTML = `
      <span class="board-hint-toggle" id="boardHintToggle">⌨ 快捷键 (?)</span>
      <div style="margin-top:6px">
      <kbd>V</kbd> 选择 &nbsp; <kbd>N</kbd> 便签 &nbsp; <kbd>T</kbd> 文本 &nbsp; <kbd>I</kbd> 图片 &nbsp; <kbd>P</kbd> 画笔 &nbsp; <kbd>H</kbd> 荧光笔 &nbsp; <kbd>E</kbd> 橡皮擦 &nbsp; <kbd>M</kbd> 导图<br>
      <kbd>Del</kbd> 删除 &nbsp; <kbd>⌘Z</kbd> 撤销 &nbsp; <kbd>⌘⇧Z</kbd> 重做<br>
      <kbd>⌘A</kbd> 全选 &nbsp; <kbd>⌘G</kbd> 分组 &nbsp; <kbd>⌘⇧G</kbd> 解散分组<br>
      <kbd>⌘E</kbd> 导出PNG &nbsp; <kbd>⌘S</kbd> 导出JSON<br>
      <kbd>/</kbd> 或 <kbd>⌘F</kbd> 搜索 &nbsp; <kbd>Esc</kbd> 取消<br>
      <kbd>Tab</kbd> 添加子节点 &nbsp; <kbd>Enter</kbd> 添加同级节点<br>
      滚轮缩放 · 悬停锚点拖拽连线 · 右键菜单操作
      </div>
    `;
    boardContainer.appendChild(shortcutHint);

    searchInput = document.getElementById('boardSearchInput');

    bindEvents();
  }

  // ============ EVENT BINDING ============
  function bindEvents() {
    // Tool switching
    const toolBtns = {
      select: 'boardToolSelect', sticky: 'boardToolSticky', text: 'boardToolText',
      image: 'boardToolImage', draw: 'boardToolDraw', mindmap: 'boardToolMindmap'
    };

    document.getElementById('boardToolSelect').addEventListener('click', () => setTool('select'));
    document.getElementById('boardToolSticky').addEventListener('click', () => setTool('sticky'));
    document.getElementById('boardToolText').addEventListener('click', () => setTool('text'));
    document.getElementById('boardToolImage').addEventListener('click', () => { setTool('select'); imgTargetCard = null; imgInput.click(); });
    document.getElementById('boardToolDraw').addEventListener('click', () => setTool('draw'));
    document.getElementById('boardToolMindmap').addEventListener('click', () => setTool('mindmap'));

    // Sticky color picker
    const stickyColorPicker = document.getElementById('boardStickyColorPicker');
    document.getElementById('boardStickyColorToggle').addEventListener('click', (e) => {
      e.stopPropagation();
      stickyColorPicker.classList.toggle('show');
    });
    stickyColorPicker.addEventListener('click', (e) => {
      const dot = e.target.closest('.board-scp-dot');
      if (!dot) return;
      nextStickyColor = dot.dataset.color;
      stickyColorPicker.classList.remove('show');
      setTool('sticky');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#boardStickyColorToggle') && !e.target.closest('#boardStickyColorPicker'))
        stickyColorPicker.classList.remove('show');
    });

    // Draw toolbar
    document.getElementById('boardDrawSize').addEventListener('input', function() { drawWidth = parseInt(this.value); });
    document.getElementById('boardPenColorDots').querySelectorAll('.board-draw-color-dot').forEach(dot => {
      dot.addEventListener('click', function() {
        document.getElementById('boardPenColorDots').querySelectorAll('.board-draw-color-dot').forEach(d => d.classList.remove('active'));
        this.classList.add('active');
        drawColor = this.dataset.color;
      });
    });
    document.getElementById('boardHighlighterColorDots').querySelectorAll('.board-draw-color-dot').forEach(dot => {
      dot.addEventListener('click', function() {
        document.getElementById('boardHighlighterColorDots').querySelectorAll('.board-draw-color-dot').forEach(d => d.classList.remove('active'));
        this.classList.add('active');
        drawColor = this.dataset.color;
      });
    });
    document.getElementById('boardDrawModePen').addEventListener('click', function() { setDrawSubMode('pen'); });
    document.getElementById('boardDrawModeHighlighter').addEventListener('click', function() { setDrawSubMode('highlighter'); });
    document.getElementById('boardDrawModeEraser').addEventListener('click', function() { setDrawSubMode('eraser'); });

    // Undo/Redo
    document.getElementById('boardBtnUndo').addEventListener('click', performUndo);
    document.getElementById('boardBtnRedo').addEventListener('click', performRedo);

    // Zoom
    document.getElementById('boardZoomIn').addEventListener('click', () => {
      const r = area.getBoundingClientRect(), cx = r.width / 2, cy = r.height / 2, old = scale;
      scale = Math.min(4, scale * 1.25); panX = cx - (cx - panX) * (scale / old); panY = cy - (cy - panY) * (scale / old); applyTransform();
    });
    document.getElementById('boardZoomOut').addEventListener('click', () => {
      const r = area.getBoundingClientRect(), cx = r.width / 2, cy = r.height / 2, old = scale;
      scale = Math.max(0.1, scale * 0.8); panX = cx - (cx - panX) * (scale / old); panY = cy - (cy - panY) * (scale / old); applyTransform();
    });
    document.getElementById('boardZoomFit').addEventListener('click', () => {
      if (cards.size === 0) { scale = 1; panX = 0; panY = 0; applyTransform(); return; }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      cards.forEach(d => { minX = Math.min(minX, d.x); minY = Math.min(minY, d.y); maxX = Math.max(maxX, d.x + (d.w || 200)); maxY = Math.max(maxY, d.y + (d.h || 100)); });
      const r = area.getBoundingClientRect(), cw = maxX - minX + 100, ch = maxY - minY + 100;
      scale = Math.min(r.width / cw, r.height / ch, 2) * 0.9;
      panX = (r.width - cw * scale) / 2 - minX * scale + 50 * scale;
      panY = (r.height - ch * scale) / 2 - minY * scale + 50 * scale;
      applyTransform();
    });

    // Search
    searchInput.addEventListener('input', function() {
      const q = this.value.trim().toLowerCase();
      if (!q) { clearSearch(); return; }
      cards.forEach((d, id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const text = (d.content || '').toLowerCase();
        const match = text.includes(q);
        el.classList.toggle('search-hit', match);
        el.classList.toggle('search-dim', !match);
      });
    });
    searchInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { clearSearch(); searchInput.blur(); }
    });

    // Export
    document.getElementById('boardBtnExportPng').addEventListener('click', exportPNG);

    // Clear
    document.getElementById('boardBtnClear').addEventListener('click', () => {
      if (cards.size === 0 && connections.length === 0 && drawStrokes.length === 0) return;
      if (!confirm('确认清空画布？所有内容将被删除。')) return;
      const items = [];
      connections.forEach(c => items.push({ type: 'disconnect', connId: c.id, from: c.from, to: c.to, fromAnchor: c.fromAnchor, toAnchor: c.toAnchor, style: c.style }));
      cards.forEach((d, id) => items.push({ type: 'delete', cardId: id, data: { ...d }, conns: [] }));
      if (items.length) pushUndo({ type: 'batch', items });
      cards.forEach((_, id) => removeCardDOM(id));
      cards.clear(); connections = []; drawStrokes = []; groups = [];
      updateConnections(); renderDrawStrokes(); renderGroups();
      deselectAll(); scheduleSave();
    });

    // Mindmap float bar
    document.getElementById('boardMmAddChild').addEventListener('click', function() {
      if (selectedCardId && cards.get(selectedCardId)?.type === 'mindmap') addMindmapChild(selectedCardId);
    });
    document.getElementById('boardMmAddSibling').addEventListener('click', function() {
      if (selectedCardId && cards.get(selectedCardId)?.type === 'mindmap') addMindmapSibling(selectedCardId);
    });
    document.getElementById('boardMmAutoLayout').addEventListener('click', function() {
      if (selectedCardId && cards.get(selectedCardId)?.type === 'mindmap') {
        const rootId = findMindmapRoot(selectedCardId);
        autoLayoutMindmap(rootId);
        updateMindmapConnections();
      }
    });

    // Formatting toolbar
    const fontPicker = document.getElementById('boardFontPicker');
    const fontPickerDisplay = document.getElementById('boardFontPickerDisplay');
    const fontPickerDropdown = document.getElementById('boardFontPickerDropdown');
    const fontOptions = fontPickerDropdown.querySelectorAll('.board-font-picker-option');
    const fontLabelMap = {};
    fontOptions.forEach(opt => { fontLabelMap[opt.dataset.value] = opt.textContent; });

    fontPickerDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      fontPicker.classList.toggle('open');
    });
    fontPickerDropdown.addEventListener('click', (e) => {
      const opt = e.target.closest('.board-font-picker-option');
      if (!opt) return;
      e.stopPropagation();
      const val = opt.dataset.value;
      fontOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      fontPickerDisplay.textContent = opt.textContent + ' ▾';
      fontPickerDisplay.style.fontFamily = val;
      fontPicker.classList.remove('open');
      if (!selectedCardId) return;
      const d = cards.get(selectedCardId), old = d.fontFamily;
      pushUndo({ type: 'style', cardId: selectedCardId, props: { fontFamily: old } });
      d.fontFamily = val; syncCardStyle(selectedCardId);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#boardFontPicker')) fontPicker.classList.remove('open');
    });

    document.getElementById('boardFmtSize').addEventListener('change', function() {
      if (!selectedCardId) return;
      const d = cards.get(selectedCardId), old = d.fontSize;
      pushUndo({ type: 'style', cardId: selectedCardId, props: { fontSize: old } });
      d.fontSize = parseInt(this.value); syncCardStyle(selectedCardId);
    });
    document.getElementById('boardFmtBold').addEventListener('click', function() {
      if (!selectedCardId) return;
      const d = cards.get(selectedCardId);
      pushUndo({ type: 'style', cardId: selectedCardId, props: { bold: d.bold } });
      d.bold = !d.bold; this.classList.toggle('active', d.bold); syncCardStyle(selectedCardId);
    });
    document.getElementById('boardFmtItalic').addEventListener('click', function() {
      if (!selectedCardId) return;
      const d = cards.get(selectedCardId);
      pushUndo({ type: 'style', cardId: selectedCardId, props: { italic: d.italic } });
      d.italic = !d.italic; this.classList.toggle('active', d.italic); syncCardStyle(selectedCardId);
    });
    document.getElementById('boardFmtColors').addEventListener('click', function(e) {
      const dot = e.target.closest('.board-color-dot');
      if (!dot || !selectedCardId) return;
      const d = cards.get(selectedCardId);
      if (d.type !== 'sticky' && d.type !== 'textbox') return;
      const old = d.color;
      pushUndo({ type: 'style', cardId: selectedCardId, props: { color: old } });
      d.color = dot.dataset.color; syncCardStyle(selectedCardId); showFmt(selectedCardId);
    });
    document.getElementById('boardFmtTextColors').addEventListener('click', function(e) {
      const dot = e.target.closest('.board-color-dot');
      if (!dot || !selectedCardId) return;
      const d = cards.get(selectedCardId);
      const old = d.textColor || '#333';
      pushUndo({ type: 'style', cardId: selectedCardId, props: { textColor: old } });
      d.textColor = dot.dataset.textcolor; syncCardStyle(selectedCardId); showFmt(selectedCardId);
    });

    // Shortcut hint toggle
    document.getElementById('boardHintToggle').addEventListener('click', (e) => {
      e.stopPropagation();
      shortcutHint.classList.toggle('expanded');
    });
    shortcutHint.addEventListener('click', function() {
      if (!this.classList.contains('expanded')) this.classList.add('expanded');
    });

    // Canvas events
    area.addEventListener('mousedown', onCanvasMouseDown);
    area.addEventListener('wheel', onCanvasWheel, { passive: false });
    area.addEventListener('contextmenu', (e) => e.preventDefault());
    area.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    area.addEventListener('drop', onCanvasDrop);

    // Touch support
    let lastTouchDist = 0;
    area.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && !e.target.closest('.board-card')) {
        isPanning = true; panStartX = e.touches[0].clientX - panX; panStartY = e.touches[0].clientY - panY;
      } else if (e.touches.length === 2) {
        isPanning = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });
    area.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning) {
        panX = e.touches[0].clientX - panStartX; panY = e.touches[0].clientY - panStartY; applyTransform();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDist > 0) {
          const r = area.getBoundingClientRect();
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
          const old = scale;
          scale = Math.min(4, Math.max(0.1, scale * (dist / lastTouchDist)));
          panX = cx - (cx - panX) * (scale / old); panY = cy - (cy - panY) * (scale / old);
          applyTransform();
        }
        lastTouchDist = dist;
      }
    }, { passive: false });
    area.addEventListener('touchend', () => { isPanning = false; lastTouchDist = 0; }, { passive: true });

    // Global mouse events
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    // Keyboard shortcuts
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.board-ctx-menu')) hideCtx();
    });

    // Context menu
    ctxMenu.addEventListener('click', onCtxMenuClick);

    // Image input
    imgInput = document.createElement('input');
    imgInput.type = 'file'; imgInput.accept = 'image/*'; imgInput.style.display = 'none';
    boardContainer.appendChild(imgInput);
    imgInput.addEventListener('change', onImgInputChange);
  }

  // ============ TOOL SWITCHING ============
  function setTool(t) {
    currentTool = t;
    if (t !== 'draw') { eraserMode = false; highlighterMode = false; }
    const toolBtns = {
      select: 'boardToolSelect', sticky: 'boardToolSticky', text: 'boardToolText',
      image: 'boardToolImage', draw: 'boardToolDraw', mindmap: 'boardToolMindmap'
    };
    Object.entries(toolBtns).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', k === t);
    });
    area.className = 'board-canvas-area';
    if (t === 'sticky' || t === 'text') area.classList.add('tool-' + t);
    if (t === 'draw' && !eraserMode && !highlighterMode) area.classList.add('tool-draw');
    if (t === 'draw' && highlighterMode) area.classList.add('tool-highlighter');
    if (t === 'draw' && eraserMode) area.classList.add('tool-eraser');
    if (t === 'mindmap') area.classList.add('tool-mindmap');
    drawToolbar.classList.toggle('show', t === 'draw');
    mmFloatBar.classList.toggle('show', t === 'mindmap' || (t === 'select' && selectedCardId && cards.get(selectedCardId)?.type === 'mindmap'));
    updateDrawModeButtons();
    deselectStroke();
    renderDrawStrokes();
    hideFmt(); hideCtx();
  }

  function updateDrawModeButtons() {
    const penBtn = document.getElementById('boardDrawModePen');
    const hlBtn = document.getElementById('boardDrawModeHighlighter');
    const eraserBtn = document.getElementById('boardDrawModeEraser');
    if (penBtn) penBtn.classList.toggle('active', !eraserMode && !highlighterMode);
    if (hlBtn) hlBtn.classList.toggle('active', highlighterMode);
    if (eraserBtn) eraserBtn.classList.toggle('active', eraserMode);
    document.getElementById('boardPenColorDots').style.display = highlighterMode ? 'none' : '';
    document.getElementById('boardHighlighterColorDots').style.display = highlighterMode ? '' : 'none';
  }

  function setDrawSubMode(mode) {
    eraserMode = (mode === 'eraser');
    highlighterMode = (mode === 'highlighter');
    area.classList.remove('tool-draw', 'tool-eraser', 'tool-highlighter');
    if (eraserMode) area.classList.add('tool-eraser');
    else if (highlighterMode) area.classList.add('tool-highlighter');
    else area.classList.add('tool-draw');
    const sizeSlider = document.getElementById('boardDrawSize');
    if (highlighterMode) {
      sizeSlider.max = '40'; sizeSlider.value = '20'; drawWidth = 20;
      drawColor = '#FFEB3B';
    } else if (!eraserMode) {
      sizeSlider.max = '40'; if (parseInt(sizeSlider.value) > 12) { sizeSlider.value = '3'; drawWidth = 3; }
      drawColor = '#2B7FD8';
    }
    updateDrawModeButtons();
    renderDrawStrokes();
  }

  function deselectStroke() {
    if (selectedStrokeId) {
      selectedStrokeId = null;
      renderDrawStrokes();
    }
  }

  function deleteStroke(strokeId) {
    const stroke = drawStrokes.find(s => s.id === strokeId);
    if (!stroke) return;
    drawStrokes = drawStrokes.filter(s => s.id !== strokeId);
    pushUndo({ type: 'deletestroke', strokeId: stroke.id, strokeData: { ...stroke } });
    if (selectedStrokeId === strokeId) selectedStrokeId = null;
    renderDrawStrokes();
  }

  // ============ TRANSFORM ============
  function applyTransform() {
    transform.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
    grid.style.backgroundSize = `${24 * scale}px ${24 * scale}px`;
    grid.style.backgroundPosition = `${panX % (24 * scale)}px ${panY % (24 * scale)}px`;
    zoomPctEl.textContent = Math.round(scale * 100) + '%';
    const svgSize = 10000;
    [connSvg, drawSvg].forEach(svg => {
      svg.setAttribute('viewBox', `${-svgSize / 2} ${-svgSize / 2} ${svgSize} ${svgSize}`);
      svg.style.width = svgSize + 'px';
      svg.style.height = svgSize + 'px';
      svg.style.left = (-svgSize / 2) + 'px';
      svg.style.top = (-svgSize / 2) + 'px';
    });
  }

  // ============ UNDO / REDO ============
  function pushUndo(entry) {
    if (undoStack.length >= UNDO_MAX) undoStack.shift();
    undoStack.push(entry);
    redoStack.length = 0;
    updateUndoUI();
    scheduleSave();
  }

  function updateUndoUI() {
    document.getElementById('boardBtnUndo').classList.toggle('disabled', undoStack.length === 0);
    document.getElementById('boardBtnRedo').classList.toggle('disabled', redoStack.length === 0);
  }

  function performUndo() {
    if (!undoStack.length) return;
    const e = undoStack.pop();
    redoStack.push(applyUndoEntry(e, false));
    updateUndoUI(); scheduleSave();
  }

  function performRedo() {
    if (!redoStack.length) return;
    const e = redoStack.pop();
    undoStack.push(applyUndoEntry(e, true));
    updateUndoUI(); scheduleSave();
  }

  function applyUndoEntry(e, isRedo) {
    switch (e.type) {
      case 'create': {
        if (!isRedo) { removeCardDOM(e.cardId); cards.delete(e.cardId); }
        else { cards.set(e.cardId, e.data); renderCard(e.cardId); }
        updateConnections();
        return { type: 'create', cardId: e.cardId, data: e.data };
      }
      case 'delete': {
        if (!isRedo) { cards.set(e.cardId, e.data); renderCard(e.cardId);
          if (e.conns) e.conns.forEach(c => { connections.push(c); }); }
        else { removeCardDOM(e.cardId); cards.delete(e.cardId);
          if (e.conns) e.conns.forEach(rc => { connections = connections.filter(c => c.id !== rc.id); }); }
        updateConnections();
        return { type: 'delete', cardId: e.cardId, data: e.data, conns: e.conns };
      }
      case 'move': {
        const d = cards.get(e.cardId);
        const rev = { type: 'move', cardId: e.cardId, oldX: d.x, oldY: d.y };
        d.x = e.oldX; d.y = e.oldY;
        positionCard(e.cardId);
        updateConnections();
        return rev;
      }
      case 'resize': {
        const d = cards.get(e.cardId);
        const rev = { type: 'resize', cardId: e.cardId, oldW: d.w, oldH: d.h };
        d.w = e.oldW; d.h = e.oldH;
        sizeCard(e.cardId);
        updateConnections();
        return rev;
      }
      case 'edit': {
        const d = cards.get(e.cardId);
        const rev = { type: 'edit', cardId: e.cardId, field: e.field, oldVal: d[e.field] };
        d[e.field] = e.oldVal;
        syncCardDOM(e.cardId);
        return rev;
      }
      case 'style': {
        const d = cards.get(e.cardId);
        const rev = { type: 'style', cardId: e.cardId, props: {} };
        Object.entries(e.props).forEach(([k, v]) => { rev.props[k] = d[k]; d[k] = v; });
        syncCardStyle(e.cardId);
        return rev;
      }
      case 'connect': {
        if (!isRedo) { connections = connections.filter(c => c.id !== e.connId); }
        else { connections.push({ id: e.connId, from: e.from, to: e.to, fromAnchor: e.fromAnchor, toAnchor: e.toAnchor, style: e.style || 'dashed' }); }
        updateConnections();
        return { type: 'connect', connId: e.connId, from: e.from, to: e.to, fromAnchor: e.fromAnchor, toAnchor: e.toAnchor, style: e.style || 'dashed' };
      }
      case 'disconnect': {
        if (!isRedo) { connections.push({ id: e.connId, from: e.from, to: e.to, fromAnchor: e.fromAnchor, toAnchor: e.toAnchor, style: e.style || 'dashed' }); }
        else { connections = connections.filter(c => c.id !== e.connId); }
        updateConnections();
        return { type: 'disconnect', connId: e.connId, from: e.from, to: e.to, fromAnchor: e.fromAnchor, toAnchor: e.toAnchor, style: e.style || 'dashed' };
      }
      case 'connstyle': {
        const conn = connections.find(c => c.id === e.connId);
        if (conn) { const rev = { type: 'connstyle', connId: e.connId, oldStyle: conn.style }; conn.style = e.oldStyle; updateConnections(); return rev; }
        return e;
      }
      case 'zorder': {
        const d = cards.get(e.cardId);
        const rev = { type: 'zorder', cardId: e.cardId, oldZ: d.z };
        d.z = e.oldZ;
        const el = document.getElementById(e.cardId);
        if (el) el.style.zIndex = d.z;
        return rev;
      }
      case 'drawstroke': {
        if (!isRedo) { drawStrokes = drawStrokes.filter(s => s.id !== e.strokeId); renderDrawStrokes(); }
        else { drawStrokes.push(e.strokeData); renderDrawStrokes(); }
        return { type: 'drawstroke', strokeId: e.strokeId, strokeData: e.strokeData };
      }
      case 'deletestroke': {
        if (!isRedo) { drawStrokes.push(e.strokeData); renderDrawStrokes(); }
        else { drawStrokes = drawStrokes.filter(s => s.id !== e.strokeId); renderDrawStrokes(); }
        return { type: 'deletestroke', strokeId: e.strokeId, strokeData: e.strokeData };
      }
      case 'batch': {
        const revItems = [];
        const items = isRedo ? e.items : [...e.items].reverse();
        items.forEach(sub => { revItems.push(applyUndoEntry(sub, isRedo)); });
        return { type: 'batch', items: isRedo ? revItems : revItems.reverse() };
      }
    }
    return e;
  }

  // ============ CARD DATA HELPERS ============
  function newCardId() { return 'c' + (++cardIdCounter); }
  function newConnId() { return 'cn' + (++connIdCounter); }
  function newGroupId() { return 'g' + (++groupIdCounter); }

  function createCardData(type, x, y, extra) {
    const id = newCardId();
    const now = new Date().toISOString();
    const user = (typeof App !== 'undefined' && App.currentUser) ? App.currentUser.id : 'user_1';
    const d = {
      id, type, x, y, w: 0, h: 0, content: '', color: 'yellow',
      fontFamily: DEFAULT_FONT, fontSize: 16, bold: false, italic: false,
      textColor: '', imgData: '', imgNatW: 0, imgNatH: 0, z: ++maxZ,
      locked: false, rotation: 0, mmParentId: null, mmChildren: [], mmLevel: 0,
      createdBy: user, createdAt: now,
      ...extra
    };
    if (type === 'sticky') { if (!d.w) d.w = 200; if (!d.h) d.h = 160; d.rotation = 0; d.fontFamily = "'Caveat','Xiaolai','Yozai',cursive"; }
    if (type === 'textbox') { if (!d.w) d.w = 240; if (!d.h) d.h = 80; if (!extra?.color) d.color = ''; }
    if (type === 'image') { if (!d.w) d.w = 280; if (!d.h) d.h = 200; }
    if (type === 'mindmap') { if (!d.w) d.w = 140; if (!d.h) d.h = 56; d.color = ''; }
    cards.set(id, d);
    return id;
  }

  // ============ RENDER CARD DOM ============
  function renderCard(id) {
    const d = cards.get(id);
    if (!d) return;
    const old = document.getElementById(id);
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = id;
    el.className = 'board-card';
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.zIndex = d.z || 1;
    if (d.w) el.style.width = d.w + 'px';
    if (d.h) el.style.height = d.h + 'px';

    const lockIcon = document.createElement('span');
    lockIcon.className = 'board-lock-icon';
    lockIcon.textContent = '🔒';
    el.appendChild(lockIcon);

    if (d.type === 'sticky') {
      el.classList.add('board-card-sticky', d.color || 'yellow');
      const inner = document.createElement('div');
      inner.className = 'board-card-content';
      inner.dataset.field = 'content';
      inner.innerHTML = escHtml(d.content) || '';
      el.appendChild(inner);
      const rh = document.createElement('div');
      rh.className = 'board-card-resize';
      el.appendChild(rh);
      applyTextStyle(el, d);
    } else if (d.type === 'textbox') {
      el.classList.add('board-card-textbox');
      const inner = document.createElement('div');
      inner.className = 'board-card-content';
      inner.dataset.field = 'content';
      inner.innerHTML = escHtml(d.content) || '';
      el.appendChild(inner);
      const rh = document.createElement('div');
      rh.className = 'board-card-resize';
      el.appendChild(rh);
      applyTextStyle(el, d);
    } else if (d.type === 'mindmap') {
      const lvl = d.mmLevel || 0;
      el.classList.add('board-card-mindmap', lvl === 0 ? 'mm-level-0' : lvl === 1 ? 'mm-level-1' : 'mm-level-deep');
      const inner = document.createElement('div');
      inner.className = 'board-card-content';
      inner.dataset.field = 'content';
      inner.innerHTML = escHtml(d.content) || '';
      el.appendChild(inner);
    } else if (d.type === 'image') {
      el.classList.add('board-card-image');
      const hasImg = !!d.imgData;
      const zone = document.createElement('div');
      zone.className = 'board-img-zone ' + (hasImg ? 'has-img' : 'empty');
      zone.innerHTML = hasImg ? `<img src="${d.imgData}">` : '<span style="color:#999;font-size:13px;pointer-events:none">📷 点击或拖拽图片</span>';
      el.appendChild(zone);
      const cap = document.createElement('div');
      cap.className = 'board-card-content board-img-caption';
      cap.dataset.field = 'content';
      cap.innerHTML = escHtml(d.content) || '';
      el.appendChild(cap);
      const rh = document.createElement('div');
      rh.className = 'board-card-resize';
      el.appendChild(rh);
    }

    ['top', 'bottom', 'left', 'right'].forEach(pos => {
      const anchor = document.createElement('div');
      anchor.className = `board-anchor-point board-anchor-${pos}`;
      anchor.dataset.anchor = pos;
      anchor.dataset.cardId = id;
      el.appendChild(anchor);
    });

    if (d.locked) el.classList.add('locked');

    transform.appendChild(el);
    bindCardEvents(el, id);
    bindAnchorEvents(el, id);
    if (id === selectedCardId) el.classList.add('selected');
    if (multiSelectedIds.has(id)) el.classList.add('multi-selected');
  }

  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }

  function applyTextStyle(el, d) {
    const cont = el.querySelector('.board-card-content');
    if (!cont) return;
    cont.style.fontFamily = d.fontFamily || DEFAULT_FONT;
    cont.style.fontSize = (d.fontSize || 16) + 'px';
    cont.style.fontWeight = d.bold ? 'bold' : 'normal';
    cont.style.fontStyle = d.italic ? 'italic' : 'normal';
    if (d.textColor) cont.style.color = d.textColor;
  }

  function positionCard(id) {
    const d = cards.get(id), el = document.getElementById(id);
    if (!d || !el) return;
    el.style.left = d.x + 'px'; el.style.top = d.y + 'px';
  }

  function sizeCard(id) {
    const d = cards.get(id), el = document.getElementById(id);
    if (!d || !el) return;
    if (d.w) el.style.width = d.w + 'px';
    if (d.h) el.style.height = d.h + 'px';
  }

  function syncCardDOM(id) {
    const d = cards.get(id), el = document.getElementById(id);
    if (!d || !el) return;
    const cont = el.querySelector('.board-card-content');
    if (cont && cont !== document.activeElement) cont.innerHTML = escHtml(d.content);
    if (d.type === 'image') {
      const zone = el.querySelector('.board-img-zone');
      if (zone) {
        if (d.imgData) { zone.innerHTML = `<img src="${d.imgData}">`; zone.classList.remove('empty'); zone.classList.add('has-img'); }
        else { zone.innerHTML = '<span style="color:#999;font-size:13px;pointer-events:none">📷 点击或拖拽图片</span>'; zone.classList.add('empty'); zone.classList.remove('has-img'); }
      }
    }
  }

  function syncCardStyle(id) {
    const d = cards.get(id), el = document.getElementById(id);
    if (!d || !el) return;
    if (d.type === 'sticky' || d.type === 'textbox') {
      ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'].forEach(c => el.classList.remove(c));
      if (d.color) el.classList.add(d.color);
    }
    el.classList.toggle('locked', !!d.locked);
    applyTextStyle(el, d);
  }

  function removeCardDOM(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    if (selectedCardId === id) { selectedCardId = null; hideFmt(); }
    multiSelectedIds.delete(id);
  }

  // ============ ANCHOR POINTS ============
  function getAnchorPos(cardId, anchor) {
    const d = cards.get(cardId), el = document.getElementById(cardId);
    if (!d || !el) return { x: 0, y: 0 };
    const w = el.offsetWidth || d.w || 200, h = el.offsetHeight || d.h || 100;
    switch (anchor) {
      case 'top': return { x: d.x + w / 2, y: d.y };
      case 'bottom': return { x: d.x + w / 2, y: d.y + h };
      case 'left': return { x: d.x, y: d.y + h / 2 };
      case 'right': return { x: d.x + w, y: d.y + h / 2 };
    }
    return { x: d.x + w / 2, y: d.y + h / 2 };
  }

  function findNearestAnchor(cx, cy, excludeId, snapDist) {
    snapDist = snapDist || 30;
    let best = null, bestDist = snapDist;
    cards.forEach((d, id) => {
      if (id === excludeId) return;
      ['top', 'bottom', 'left', 'right'].forEach(a => {
        const pos = getAnchorPos(id, a);
        const dist = Math.hypot(pos.x - cx, pos.y - cy);
        if (dist < bestDist) { bestDist = dist; best = { cardId: id, anchor: a, pos }; }
      });
    });
    return best;
  }

  function bindAnchorEvents(el, cardId) {
    el.querySelectorAll('.board-anchor-point').forEach(anchor => {
      anchor.addEventListener('mousedown', (e) => {
        if (cards.get(cardId)?.locked) return;
        e.stopPropagation(); e.preventDefault();
        const anchorName = anchor.dataset.anchor;
        anchorDragFrom = { cardId, anchor: anchorName };
        anchor.classList.add('active');
        el.classList.add('dragging-anchor');
        const pos = getAnchorPos(cardId, anchorName);
        connectTempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        connectTempLine.classList.add('board-connect-line-temp');
        connectTempLine.setAttribute('x1', pos.x); connectTempLine.setAttribute('y1', pos.y);
        connectTempLine.setAttribute('x2', pos.x); connectTempLine.setAttribute('y2', pos.y);
        connSvg.appendChild(connectTempLine);
      });
    });
  }

  // ============ CARD EVENTS ============
  function bindCardEvents(el, id) {
    el.addEventListener('mousedown', (e) => {
      if (e.button === 2) return;
      if (e.target.closest('.board-card-resize')) return;
      if (e.target.closest('.board-anchor-point')) return;
      if (editingCardId === id && e.target.closest('.board-card-content')) return;

      e.stopPropagation(); e.preventDefault();

      const d = cards.get(id);
      if (d.locked) { selectCard(id); return; }

      if (e.shiftKey) {
        toggleMultiSelect(id);
        return;
      }

      selectCard(id);

      dragCard = id;
      dragCardX = d.x; dragCardY = d.y;
      dragStartX = e.clientX; dragStartY = e.clientY;
      dragMoved = false;
      el.classList.add('dragging');
      d.z = ++maxZ;
      el.style.zIndex = d.z;

      dragGroupCards = [];
      dragGroupStartPositions = [];
      if (d.type === 'mindmap') {
        const descendants = collectMindmapDescendants(id).filter(cid => cid !== id);
        descendants.forEach(cid => {
          const cd = cards.get(cid);
          if (cd) {
            dragGroupCards.push(cid);
            dragGroupStartPositions.push({ id: cid, x: cd.x, y: cd.y });
          }
        });
      } else {
        const grp = groups.find(g => g.cardIds.includes(id));
        if (grp) {
          grp.cardIds.forEach(cid => {
            if (cid !== id) {
              const cd = cards.get(cid);
              if (cd) {
                dragGroupCards.push(cid);
                dragGroupStartPositions.push({ id: cid, x: cd.x, y: cd.y });
              }
            }
          });
        }
      }
    });

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const d = cards.get(id);
      if (d.locked) return;
      const cont = el.querySelector('.board-card-content');
      if (cont) startEditing(id, cont);
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      selectCard(id);
      showCardCtx(e.clientX, e.clientY, id);
    });

    const rh = el.querySelector('.board-card-resize');
    if (rh) {
      rh.addEventListener('mousedown', (e) => {
        e.stopPropagation(); e.preventDefault();
        const d = cards.get(id);
        if (d.locked) return;
        resizeCard = id;
        resizeStartW = el.offsetWidth; resizeStartH = el.offsetHeight;
        resizeMouseX = e.clientX; resizeMouseY = e.clientY;
        d.z = ++maxZ; el.style.zIndex = d.z;
      });
    }

    if (cards.get(id)?.type === 'image') {
      const zone = el.querySelector('.board-img-zone');
      if (zone) {
        zone.addEventListener('click', (e) => {
          e.stopPropagation();
          const d = cards.get(id);
          if (d && !d.imgData && !d.locked) { imgTargetCard = id; imgInput.click(); }
        });
        zone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); zone.style.borderColor = 'var(--board-accent)'; });
        zone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); zone.style.borderColor = ''; });
        zone.addEventListener('drop', (e) => {
          e.preventDefault(); e.stopPropagation(); zone.style.borderColor = '';
          const d = cards.get(id);
          if (d && !d.imgData && !d.locked && e.dataTransfer.files?.[0]) loadImageFile(e.dataTransfer.files[0], id);
        });
      }
    }
  }

  // ============ MULTI-SELECTION ============
  function toggleMultiSelect(id) {
    if (multiSelectedIds.has(id)) {
      multiSelectedIds.delete(id);
      document.getElementById(id)?.classList.remove('multi-selected');
    } else {
      multiSelectedIds.add(id);
      document.getElementById(id)?.classList.add('multi-selected');
    }
    if (selectedCardId && selectedCardId !== id) {
      multiSelectedIds.add(selectedCardId);
      document.getElementById(selectedCardId)?.classList.add('multi-selected');
    }
    selectedCardId = null;
    hideFmt();
  }

  function selectAllCards() {
    clearMultiSelection();
    cards.forEach((_, id) => {
      multiSelectedIds.add(id);
      document.getElementById(id)?.classList.add('multi-selected');
    });
  }

  function clearMultiSelection() {
    multiSelectedIds.forEach(id => {
      document.getElementById(id)?.classList.remove('multi-selected');
    });
    multiSelectedIds.clear();
  }

  function selectCard(id) {
    clearMultiSelection();
    if (selectedStrokeId) { selectedStrokeId = null; renderDrawStrokes(); }
    if (selectedCardId && selectedCardId !== id) {
      const prev = document.getElementById(selectedCardId);
      if (prev) prev.classList.remove('selected');
    }
    selectedCardId = id;
    selectedConnId = null;
    const el = document.getElementById(id);
    if (el) el.classList.add('selected');
    showFmt(id);
    hideCtx();
    const d = cards.get(id);
    mmFloatBar.classList.toggle('show', !!(d && d.type === 'mindmap'));
  }

  function deselectAll() {
    if (selectedCardId) {
      document.getElementById(selectedCardId)?.classList.remove('selected');
      selectedCardId = null;
    }
    selectedConnId = null;
    if (selectedStrokeId) { selectedStrokeId = null; renderDrawStrokes(); }
    clearMultiSelection();
    hideFmt(); hideCtx();
    mmFloatBar.classList.remove('show');
    updateConnections();
  }

  // ============ EDITING ============
  function startEditing(id, cont) {
    finishEditing();
    editingCardId = id;
    const d = cards.get(id);
    cont.contentEditable = 'true';
    cont.style.userSelect = 'text';
    cont.style.webkitUserSelect = 'text';
    cont.style.cursor = 'text';
    cont.style.overflow = 'auto';
    cont.focus();
    const range = document.createRange();
    range.selectNodeContents(cont);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
    cont._oldContent = d.content;
    cont._stopPropHandler = (e) => e.stopPropagation();
    cont.addEventListener('input', onEditInput);
    cont.addEventListener('blur', onEditBlur);
    cont.addEventListener('mousedown', cont._stopPropHandler);
    cont.addEventListener('keydown', onEditKeydown);
  }

  function onEditInput() {}

  function onEditKeydown(e) {
    e.stopPropagation();
    if (e.key === 'Escape') e.target.blur();
    if (editingCardId && cards.get(editingCardId)?.type === 'mindmap') {
      if (e.key === 'Enter') {
        e.preventDefault();
        const nodeId = editingCardId;
        e.target.blur();
        setTimeout(() => { if (cards.get(nodeId)?.type === 'mindmap') addMindmapSibling(nodeId); }, 20);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const nodeId = editingCardId;
        e.target.blur();
        setTimeout(() => { if (cards.get(nodeId)?.type === 'mindmap') addMindmapChild(nodeId); }, 20);
        return;
      }
    }
  }

  function onEditBlur(e) {
    const cont = e.target;
    cont.contentEditable = 'false';
    cont.style.userSelect = ''; cont.style.webkitUserSelect = ''; cont.style.cursor = ''; cont.style.overflow = '';
    cont.removeEventListener('input', onEditInput);
    cont.removeEventListener('blur', onEditBlur);
    cont.removeEventListener('keydown', onEditKeydown);
    if (cont._stopPropHandler) { cont.removeEventListener('mousedown', cont._stopPropHandler); cont._stopPropHandler = null; }
    const id = editingCardId; editingCardId = null;
    if (!id) return;
    const d = cards.get(id); if (!d) return;
    const newContent = cont.innerText;
    if (newContent !== cont._oldContent) {
      pushUndo({ type: 'edit', cardId: id, field: 'content', oldVal: cont._oldContent });
      d.content = newContent; scheduleSave();
    }
    delete cont._oldContent;
  }

  function finishEditing() {
    if (editingCardId) {
      const el = document.getElementById(editingCardId);
      if (el) { const cont = el.querySelector('.board-card-content'); if (cont && cont.contentEditable === 'true') cont.blur(); }
      editingCardId = null;
    }
  }

  // ============ FORMATTING TOOLBAR ============
  function showFmt(id) {
    const d = cards.get(id);
    if (!d || d.type === 'image' || d.type === 'mindmap') { hideFmt(); return; }
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const containerRect = boardContainer.getBoundingClientRect();
    fmtToolbar.style.left = Math.max(4, rect.left - containerRect.left) + 'px';
    fmtToolbar.style.top = Math.max(4, rect.top - containerRect.top - 42) + 'px';
    fmtToolbar.classList.add('show');
    setFontPickerValue(d.fontFamily || DEFAULT_FONT);
    document.getElementById('boardFmtSize').value = d.fontSize || 16;
    document.getElementById('boardFmtBold').classList.toggle('active', !!d.bold);
    document.getElementById('boardFmtItalic').classList.toggle('active', !!d.italic);
    const colorRow = document.getElementById('boardFmtColors');
    colorRow.style.display = (d.type === 'sticky' || d.type === 'textbox') ? 'flex' : 'none';
    colorRow.querySelectorAll('.board-color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === d.color);
    });
    const tcRow = document.getElementById('boardFmtTextColors');
    const tcSep = document.getElementById('boardFmtTextColorSep');
    tcRow.style.display = 'flex';
    tcSep.style.display = '';
    tcRow.querySelectorAll('.board-color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.textcolor === (d.textColor || '#333'));
    });
  }

  function hideFmt() { fmtToolbar.classList.remove('show'); }

  function setFontPickerValue(val) {
    const fontOptions = document.getElementById('boardFontPickerDropdown').querySelectorAll('.board-font-picker-option');
    const fontLabelMap = {};
    fontOptions.forEach(opt => { fontLabelMap[opt.dataset.value] = opt.textContent; });
    fontOptions.forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === val);
    });
    const label = fontLabelMap[val] || '苹方/默认';
    const display = document.getElementById('boardFontPickerDisplay');
    display.textContent = label + ' ▾';
    display.style.fontFamily = val;
  }

  // ============ CONTEXT MENU ============
  function buildCardCtxHtml(id) {
    const d = cards.get(id);
    const lockLabel = d.locked ? '🔓 解锁' : '🔒 锁定';
    let html = `<div class="board-ctx-item" data-action="bringFront">置于顶层</div>`;
    html += `<div class="board-ctx-item" data-action="sendBack">置于底层</div>`;
    html += `<div class="board-ctx-sep"></div>`;
    html += `<div class="board-ctx-item" data-action="toggleLock">${lockLabel}</div>`;
    if (d.type === 'sticky') {
      html += `<div class="board-ctx-sep"></div>`;
      html += `<div style="padding:6px 12px"><div class="board-color-row ctx-colors">`;
      ['yellow', 'blue', 'pink', 'green', 'purple', 'orange'].forEach(c => {
        html += `<div class="board-color-dot c-${c}" data-color="${c}"></div>`;
      });
      html += `</div></div>`;
    }
    html += `<div class="board-ctx-sep"></div>`;
    html += `<div class="board-ctx-item" data-action="duplicate">复制</div>`;
    html += `<div class="board-ctx-item danger" data-action="delete">删除 <span class="board-ctx-shortcut">Del</span></div>`;
    return html;
  }

  function showCardCtx(x, y, cardId) {
    ctxMenu.innerHTML = buildCardCtxHtml(cardId);
    ctxMenu.style.left = x + 'px'; ctxMenu.style.top = y + 'px';
    ctxMenu.classList.add('show');
    ctxMenu._cardId = cardId; ctxMenu._connId = null;
    ctxMenu.querySelectorAll('.ctx-colors .board-color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = cards.get(cardId);
        if (d.type !== 'sticky') return;
        const old = d.color;
        pushUndo({ type: 'style', cardId, props: { color: old } });
        d.color = dot.dataset.color;
        syncCardStyle(cardId); hideCtx();
      });
    });
  }

  function showConnCtx(x, y, connId) {
    const conn = connections.find(c => c.id === connId);
    const curStyle = conn?.style || 'dashed';
    let html = `<div class="board-ctx-item" data-action="connStyle" data-style="dashed">${curStyle === 'dashed' ? '✓ ' : ''} 虚线</div>`;
    html += `<div class="board-ctx-item" data-action="connStyle" data-style="solid">${curStyle === 'solid' ? '✓ ' : ''} 实线</div>`;
    html += `<div class="board-ctx-item" data-action="connStyle" data-style="arrow">${curStyle === 'arrow' ? '✓ ' : ''} 箭头</div>`;
    html += `<div class="board-ctx-sep"></div>`;
    html += `<div class="board-ctx-item danger" data-action="deleteConn">删除连线</div>`;
    ctxMenu.innerHTML = html;
    ctxMenu.style.left = x + 'px'; ctxMenu.style.top = y + 'px';
    ctxMenu.classList.add('show');
    ctxMenu._connId = connId; ctxMenu._cardId = null;
  }

  function hideCtx() { ctxMenu.classList.remove('show'); ctxMenu._cardId = null; ctxMenu._connId = null; }

  function onCtxMenuClick(e) {
    const item = e.target.closest('.board-ctx-item');
    if (!item) return;
    const action = item.dataset.action;
    const cardId = ctxMenu._cardId;
    const connId = ctxMenu._connId;
    hideCtx();

    if (connId) {
      if (action === 'deleteConn') deleteConnection(connId);
      if (action === 'connStyle') {
        const newStyle = item.dataset.style;
        const conn = connections.find(c => c.id === connId);
        if (conn && conn.style !== newStyle) {
          pushUndo({ type: 'connstyle', connId, oldStyle: conn.style });
          conn.style = newStyle;
          updateConnections(); scheduleSave();
        }
      }
      return;
    }

    if (!cardId) return;
    const d = cards.get(cardId);
    if (!d) return;

    switch (action) {
      case 'bringFront': { const old = d.z; d.z = ++maxZ; document.getElementById(cardId).style.zIndex = d.z; pushUndo({ type: 'zorder', cardId, oldZ: old }); break; }
      case 'sendBack': { const old = d.z; d.z = 1; document.getElementById(cardId).style.zIndex = d.z; pushUndo({ type: 'zorder', cardId, oldZ: old }); break; }
      case 'toggleLock': {
        pushUndo({ type: 'style', cardId, props: { locked: d.locked } });
        d.locked = !d.locked; syncCardStyle(cardId); scheduleSave();
        break;
      }
      case 'duplicate': duplicateCard(cardId); break;
      case 'delete':
        if (d.locked) return;
        deleteCard(cardId); break;
    }
  }

  function duplicateCard(id) {
    const d = cards.get(id); if (!d) return;
    const nd = { ...d, id: newCardId(), x: d.x + 30, y: d.y + 30, z: ++maxZ, locked: false };
    cards.set(nd.id, nd);
    renderCard(nd.id);
    pushUndo({ type: 'create', cardId: nd.id, data: { ...nd } });
    selectCard(nd.id);
  }

  function deleteCard(id) {
    const d = cards.get(id); if (!d || d.locked) return;
    if (d.type === 'mindmap') {
      const toDelete = collectMindmapDescendants(id);
      const items = [];
      toDelete.forEach(cid => {
        const cd = cards.get(cid); if (!cd) return;
        const relConns = connections.filter(c => c.from === cid || c.to === cid);
        connections = connections.filter(c => c.from !== cid && c.to !== cid);
        items.push({ type: 'delete', cardId: cid, data: { ...cd }, conns: relConns.map(c => ({ ...c })) });
        if (cd.mmParentId) {
          const parentD = cards.get(cd.mmParentId);
          if (parentD) parentD.mmChildren = parentD.mmChildren.filter(c => c !== cid);
        }
        mindmapNodes.delete(cid);
        removeCardDOM(cid); cards.delete(cid);
      });
      if (items.length) pushUndo({ type: 'batch', items });
      updateConnections(); updateMindmapConnections(); renderGroups();
      return;
    }
    const relConns = connections.filter(c => c.from === id || c.to === id);
    connections = connections.filter(c => c.from !== id && c.to !== id);
    groups.forEach(g => { g.cardIds = g.cardIds.filter(cid => cid !== id); });
    groups = groups.filter(g => g.cardIds.length > 1);
    pushUndo({ type: 'delete', cardId: id, data: { ...d }, conns: relConns.map(c => ({ ...c })) });
    removeCardDOM(id); cards.delete(id); updateConnections(); renderGroups();
  }

  function collectMindmapDescendants(id) {
    const result = [id];
    const d = cards.get(id);
    if (d && d.mmChildren) {
      d.mmChildren.forEach(cid => { result.push(...collectMindmapDescendants(cid)); });
    }
    return result;
  }

  // ============ CONNECTIONS ============
  function updateConnections() {
    connSvg.querySelectorAll('.board-conn-group').forEach(g => g.remove());
    connections.forEach(conn => {
      const fromD = cards.get(conn.from), toD = cards.get(conn.to);
      if (!fromD || !toD) return;
      const fromEl = document.getElementById(conn.from), toEl = document.getElementById(conn.to);
      if (!fromEl || !toEl) return;

      const fs = getAnchorPos(conn.from, conn.fromAnchor || 'right');
      const ts = getAnchorPos(conn.to, conn.toAnchor || 'left');
      const style = conn.style || 'dashed';

      const offset = Math.max(40, Math.abs(fs.x - ts.x) * 0.3, Math.abs(fs.y - ts.y) * 0.3);
      const fc = anchorControlPoint(fs, conn.fromAnchor || 'right', offset);
      const tc = anchorControlPoint(ts, conn.toAnchor || 'left', offset);

      let pathD;
      if (style === 'solid' || style === 'arrow') {
        pathD = `M${fs.x},${fs.y} C${fc.x},${fc.y} ${tc.x},${tc.y} ${ts.x},${ts.y}`;
      } else {
        pathD = `M${fs.x},${fs.y} C${fc.x},${fc.y} ${tc.x},${tc.y} ${ts.x},${ts.y}`;
      }

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('board-conn-group'); g.dataset.connId = conn.id;

      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('d', pathD); hit.classList.add('board-conn-hit');
      hit.style.pointerEvents = 'stroke';
      hit.addEventListener('click', (e) => {
        e.stopPropagation(); selectedConnId = conn.id; selectedCardId = null; hideFmt();
        document.querySelectorAll('.board-card.selected').forEach(c => c.classList.remove('selected'));
        updateConnections();
      });
      hit.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        selectedConnId = conn.id;
        showConnCtx(e.clientX, e.clientY, conn.id);
      });
      g.appendChild(hit);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', pathD); line.classList.add('board-conn-line');
      line.classList.add('style-' + style);
      if (conn.id === selectedConnId) line.classList.add('selected');
      if (style === 'arrow') {
        line.setAttribute('marker-end', conn.id === selectedConnId ? 'url(#boardArrowHeadDark)' : 'url(#boardArrowHead)');
      }
      g.appendChild(line);
      connSvg.appendChild(g);
    });
  }

  function anchorControlPoint(pos, anchor, offset) {
    switch (anchor) {
      case 'top': return { x: pos.x, y: pos.y - offset };
      case 'bottom': return { x: pos.x, y: pos.y + offset };
      case 'left': return { x: pos.x - offset, y: pos.y };
      case 'right': return { x: pos.x + offset, y: pos.y };
    }
    return pos;
  }

  function deleteConnection(connId) {
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;
    connections = connections.filter(c => c.id !== connId);
    pushUndo({ type: 'disconnect', connId: conn.id, from: conn.from, to: conn.to, fromAnchor: conn.fromAnchor, toAnchor: conn.toAnchor, style: conn.style });
    selectedConnId = null; updateConnections();
  }

  // ============ GROUPS ============
  function createGroup(cardIds) {
    if (cardIds.length < 2) return;
    cardIds.forEach(cid => {
      groups.forEach(g => { g.cardIds = g.cardIds.filter(id => id !== cid); });
    });
    groups = groups.filter(g => g.cardIds.length > 1);
    const gid = newGroupId();
    groups.push({ id: gid, cardIds: [...cardIds] });
    renderGroups(); scheduleSave();
  }

  function dissolveGroup(cardId) {
    const idx = groups.findIndex(g => g.cardIds.includes(cardId));
    if (idx === -1) return;
    groups.splice(idx, 1);
    renderGroups(); scheduleSave();
  }

  function getCardGroup(cardId) {
    return groups.find(g => g.cardIds.includes(cardId));
  }

  function renderGroups() {
    document.querySelectorAll('.board-group-rect').forEach(el => el.remove());
    groups.forEach(g => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let valid = false;
      g.cardIds.forEach(cid => {
        const d = cards.get(cid), el = document.getElementById(cid);
        if (!d || !el) return;
        valid = true;
        const w = el.offsetWidth || d.w || 200, h = el.offsetHeight || d.h || 100;
        minX = Math.min(minX, d.x); minY = Math.min(minY, d.y);
        maxX = Math.max(maxX, d.x + w); maxY = Math.max(maxY, d.y + h);
      });
      if (!valid) return;
      const pad = 12;
      const rect = document.createElement('div');
      rect.className = 'board-group-rect'; rect.dataset.groupId = g.id;
      rect.style.left = (minX - pad) + 'px'; rect.style.top = (minY - pad) + 'px';
      rect.style.width = (maxX - minX + pad * 2) + 'px'; rect.style.height = (maxY - minY + pad * 2) + 'px';
      transform.insertBefore(rect, transform.firstChild);
    });
  }

  // ============ DRAWING ============
  function renderDrawStrokes() {
    drawSvg.innerHTML = '';
    const interactive = (currentTool === 'draw' && eraserMode) || currentTool === 'select';
    drawStrokes.forEach(s => {
      if (s.points.length < 2) return;
      let d = 'M' + s.points[0][0] + ',' + s.points[0][1];
      for (let i = 1; i < s.points.length; i++) d += ' L' + s.points[i][0] + ',' + s.points[i][1];

      if (interactive) {
        const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitPath.setAttribute('d', d);
        hitPath.style.fill = 'none';
        hitPath.style.stroke = 'transparent';
        hitPath.style.strokeWidth = Math.max(16, (s.width || 3) + 12) + 'px';
        hitPath.style.pointerEvents = 'stroke';
        hitPath.style.cursor = 'pointer';
        hitPath.dataset.strokeId = s.id;
        hitPath.addEventListener('click', function(e) {
          e.stopPropagation();
          onStrokeClick(s.id);
        });
        hitPath.addEventListener('mouseenter', function() {
          if (currentTool === 'draw' && eraserMode) {
            const visPath = drawSvg.querySelector('.board-draw-stroke[data-stroke-id="' + s.id + '"]');
            if (visPath) visPath.classList.add('eraser-hover');
          }
        });
        hitPath.addEventListener('mouseleave', function() {
          const visPath = drawSvg.querySelector('.board-draw-stroke[data-stroke-id="' + s.id + '"]');
          if (visPath) visPath.classList.remove('eraser-hover');
        });
        drawSvg.appendChild(hitPath);
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.classList.add('board-draw-stroke');
      path.dataset.strokeId = s.id;
      if (interactive) path.classList.add('interactive');
      if (s.id === selectedStrokeId) path.classList.add('stroke-selected');
      path.style.stroke = s.color || '#2B7FD8';
      path.style.strokeWidth = (s.width || 3) + 'px';
      if (s.type === 'highlighter') {
        path.style.opacity = '0.35';
      }
      if (s.id === selectedStrokeId) {
        path.style.strokeWidth = ((s.width || 3) + 2) + 'px';
      }
      if (interactive) {
        path.addEventListener('click', function(e) {
          e.stopPropagation();
          onStrokeClick(s.id);
        });
        path.addEventListener('mouseenter', function() {
          if (currentTool === 'draw' && eraserMode) this.classList.add('eraser-hover');
        });
        path.addEventListener('mouseleave', function() {
          this.classList.remove('eraser-hover');
        });
      }
      drawSvg.appendChild(path);
    });
  }

  function onStrokeClick(strokeId) {
    if (currentTool === 'draw' && eraserMode) {
      deleteStroke(strokeId);
    } else if (currentTool === 'select') {
      deselectAll();
      selectedStrokeId = strokeId;
      renderDrawStrokes();
    }
  }

  // ============ IMAGE UPLOAD ============
  let imgInput = null;
  let imgTargetCard = null;

  function onImgInputChange() {
    if (this.files && this.files[0]) {
      if (imgTargetCard) { loadImageFile(this.files[0], imgTargetCard); }
      else {
        const r = area.getBoundingClientRect();
        const cx = (-panX + r.width / 2) / scale - 140, cy = (-panY + r.height / 2) / scale - 100;
        const id = createCardData('image', cx, cy);
        renderCard(id);
        pushUndo({ type: 'create', cardId: id, data: { ...cards.get(id) } });
        loadImageFile(this.files[0], id);
      }
      imgTargetCard = null;
    }
    this.value = '';
  }

  function loadImageFile(file, id) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const d = cards.get(id); if (!d) return;
      const oldImg = d.imgData; d.imgData = ev.target.result;
      const img = new Image();
      img.onload = function() {
        d.imgNatW = img.naturalWidth; d.imgNatH = img.naturalHeight;
        const maxDim = 400;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxDim || h > maxDim) { if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; } else { w = Math.round(w * maxDim / h); h = maxDim; } }
        d.w = w; d.h = h; sizeCard(id);
        pushUndo({ type: 'edit', cardId: id, field: 'imgData', oldVal: oldImg });
        syncCardDOM(id); updateConnections(); scheduleSave();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function onCanvasDrop(e) {
    e.preventDefault();
    if (!e.dataTransfer.files?.length) return;
    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith('image/')) return;
    const r = area.getBoundingClientRect();
    const cx = (e.clientX - r.left - panX) / scale - 140, cy = (e.clientY - r.top - panY) / scale - 100;
    const id = createCardData('image', cx, cy);
    renderCard(id);
    pushUndo({ type: 'create', cardId: id, data: { ...cards.get(id) } });
    loadImageFile(file, id); selectCard(id);
  }

  // ============ ALIGNMENT GUIDES ============
  function clearAlignGuides() {
    alignGuides.forEach(el => el.remove());
    alignGuides = [];
  }

  function showAlignGuides(dragId, newX, newY) {
    clearAlignGuides();
    const d = cards.get(dragId), el = document.getElementById(dragId);
    if (!d || !el) return { x: newX, y: newY };
    const w = el.offsetWidth || d.w || 200, h = el.offsetHeight || d.h || 100;
    const edges = { left: newX, right: newX + w, top: newY, bottom: newY + h, cx: newX + w / 2, cy: newY + h / 2 };
    let snappedX = newX, snappedY = newY;
    let foundH = false, foundV = false;

    cards.forEach((od, oid) => {
      if (oid === dragId) return;
      const oel = document.getElementById(oid);
      if (!oel) return;
      const ow = oel.offsetWidth || od.w || 200, oh = oel.offsetHeight || od.h || 100;
      const oEdges = { left: od.x, right: od.x + ow, top: od.y, bottom: od.y + oh, cx: od.x + ow / 2, cy: od.y + oh / 2 };

      if (!foundV) {
        [['left', 'left'], ['right', 'right'], ['cx', 'cx'], ['left', 'right'], ['right', 'left']].forEach(([a, b]) => {
          if (foundV) return;
          if (Math.abs(edges[a] - oEdges[b]) < ALIGN_SNAP_THRESHOLD) {
            snappedX = oEdges[b] - (a === 'right' ? w : (a === 'cx' ? w / 2 : 0));
            foundV = true;
            const guide = document.createElement('div');
            guide.className = 'board-align-guide board-align-guide-v';
            const containerRect = boardContainer.getBoundingClientRect();
            const screenX = oEdges[b] * scale + panX + containerRect.left;
            guide.style.left = screenX + 'px';
            boardContainer.appendChild(guide);
            alignGuides.push(guide);
          }
        });
      }
      if (!foundH) {
        [['top', 'top'], ['bottom', 'bottom'], ['cy', 'cy'], ['top', 'bottom'], ['bottom', 'top']].forEach(([a, b]) => {
          if (foundH) return;
          if (Math.abs(edges[a] - oEdges[b]) < ALIGN_SNAP_THRESHOLD) {
            snappedY = oEdges[b] - (a === 'bottom' ? h : (a === 'cy' ? h / 2 : 0));
            foundH = true;
            const guide = document.createElement('div');
            guide.className = 'board-align-guide board-align-guide-h';
            const containerRect = boardContainer.getBoundingClientRect();
            const screenY = oEdges[b] * scale + panY + containerRect.top;
            guide.style.top = screenY + 'px';
            boardContainer.appendChild(guide);
            alignGuides.push(guide);
          }
        });
      }
    });
    return { x: snappedX, y: snappedY };
  }

  // ============ CANVAS EVENTS ============
  function onCanvasMouseDown(e) {
    if (e.target.closest('.board-card')) return;
    if (e.button === 2) return;

    hideCtx();

    if (currentTool === 'draw' && !eraserMode) {
      isDrawing = true;
      const r = area.getBoundingClientRect();
      const cx = (e.clientX - r.left - panX) / scale, cy = (e.clientY - r.top - panY) / scale;
      currentDrawPoints = [[cx, cy]];
      return;
    }

    if (currentTool === 'draw' && eraserMode) {
      return;
    }

    if (currentTool === 'mindmap') {
      const r = area.getBoundingClientRect();
      const cx = (e.clientX - r.left - panX) / scale, cy = (e.clientY - r.top - panY) / scale;
      createMindmapRoot(cx, cy);
      return;
    }

    if (currentTool === 'sticky' || currentTool === 'text') {
      const r = area.getBoundingClientRect();
      const cx = (e.clientX - r.left - panX) / scale, cy = (e.clientY - r.top - panY) / scale;
      isCreatingCard = true;
      creationStart = { clientX: e.clientX, clientY: e.clientY, canvasX: cx, canvasY: cy, tool: currentTool };
      creationPreviewEl = document.createElement('div');
      creationPreviewEl.className = 'board-creation-preview';
      creationPreviewEl.style.left = cx + 'px'; creationPreviewEl.style.top = cy + 'px';
      creationPreviewEl.style.width = '0px'; creationPreviewEl.style.height = '0px';
      if (currentTool === 'sticky') {
        const colorMap = { yellow: 'var(--board-sticky-yellow)', pink: 'var(--board-sticky-pink)', blue: 'var(--board-sticky-blue)', green: 'var(--board-sticky-green)', purple: 'var(--board-sticky-purple)', orange: 'var(--board-sticky-orange)' };
        creationPreviewEl.style.background = colorMap[nextStickyColor] || colorMap.yellow;
        creationPreviewEl.style.opacity = '0.5';
      }
      transform.appendChild(creationPreviewEl);
      return;
    }

    deselectAll(); finishEditing();

    if (currentTool === 'select') {
      const r = area.getBoundingClientRect();
      boxSelectStart = { clientX: e.clientX, clientY: e.clientY, canvasX: (e.clientX - r.left - panX) / scale, canvasY: (e.clientY - r.top - panY) / scale };
      isBoxSelecting = false;
    }

    isPanning = true;
    panStartX = e.clientX - panX; panStartY = e.clientY - panY;
  }

  function onCanvasWheel(e) {
    e.preventDefault();
    const r = area.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const old = scale;
    const d = e.deltaY > 0 ? 0.92 : 1.08;
    scale = Math.min(4, Math.max(0.1, scale * d));
    panX = mx - (mx - panX) * (scale / old); panY = my - (my - panY) * (scale / old);
    applyTransform();
    if (selectedCardId) showFmt(selectedCardId);
  }

  // ============ WINDOW MOUSE EVENTS ============
  function onWindowMouseMove(e) {
    if (isDrawing && currentTool === 'draw') {
      const r = area.getBoundingClientRect();
      const cx = (e.clientX - r.left - panX) / scale, cy = (e.clientY - r.top - panY) / scale;
      currentDrawPoints.push([cx, cy]);
      let pathStr = 'M' + currentDrawPoints[0][0] + ',' + currentDrawPoints[0][1];
      for (let i = 1; i < currentDrawPoints.length; i++) pathStr += ' L' + currentDrawPoints[i][0] + ',' + currentDrawPoints[i][1];
      let livePath = drawSvg.querySelector('.draw-live');
      if (!livePath) {
        livePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        livePath.classList.add('board-draw-stroke', 'draw-live');
        livePath.style.stroke = drawColor;
        livePath.style.strokeWidth = drawWidth + 'px';
        if (highlighterMode) livePath.style.opacity = '0.35';
        drawSvg.appendChild(livePath);
      }
      livePath.setAttribute('d', pathStr);
      return;
    }

    if (isCreatingCard && creationStart && creationPreviewEl) {
      const r = area.getBoundingClientRect();
      const cx = (e.clientX - r.left - panX) / scale, cy = (e.clientY - r.top - panY) / scale;
      const sx = Math.min(creationStart.canvasX, cx), sy = Math.min(creationStart.canvasY, cy);
      const sw = Math.abs(cx - creationStart.canvasX), sh = Math.abs(cy - creationStart.canvasY);
      creationPreviewEl.style.left = sx + 'px'; creationPreviewEl.style.top = sy + 'px';
      creationPreviewEl.style.width = sw + 'px'; creationPreviewEl.style.height = sh + 'px';
      return;
    }

    if (boxSelectStart && !dragCard && !resizeCard && !anchorDragFrom) {
      const dx = e.clientX - boxSelectStart.clientX, dy = e.clientY - boxSelectStart.clientY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        if (!isBoxSelecting) {
          isBoxSelecting = true; isPanning = false;
          boxSelectEl = document.createElement('div');
          boxSelectEl.className = 'board-selection-box';
          transform.appendChild(boxSelectEl);
        }
      }
      if (isBoxSelecting && boxSelectEl) {
        const r = area.getBoundingClientRect();
        const cx = (e.clientX - r.left - panX) / scale, cy = (e.clientY - r.top - panY) / scale;
        const sx = Math.min(boxSelectStart.canvasX, cx), sy = Math.min(boxSelectStart.canvasY, cy);
        const sw = Math.abs(cx - boxSelectStart.canvasX), sh = Math.abs(cy - boxSelectStart.canvasY);
        boxSelectEl.style.left = sx + 'px'; boxSelectEl.style.top = sy + 'px';
        boxSelectEl.style.width = sw + 'px'; boxSelectEl.style.height = sh + 'px';
        clearMultiSelection();
        cards.forEach((d, id) => {
          const el = document.getElementById(id);
          if (!el) return;
          const cw = el.offsetWidth || d.w || 200, ch = el.offsetHeight || d.h || 100;
          if (d.x < sx + sw && d.x + cw > sx && d.y < sy + sh && d.y + ch > sy) {
            multiSelectedIds.add(id);
            el.classList.add('multi-selected');
          }
        });
        return;
      }
    }

    if (isPanning && !isBoxSelecting) {
      panX = e.clientX - panStartX; panY = e.clientY - panStartY;
      applyTransform(); return;
    }

    if (dragCard) {
      const dx = (e.clientX - dragStartX) / scale, dy = (e.clientY - dragStartY) / scale;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;
      let newX = dragCardX + dx, newY = dragCardY + dy;
      const snapped = showAlignGuides(dragCard, newX, newY);
      newX = snapped.x; newY = snapped.y;
      const d = cards.get(dragCard);
      const actualDx = newX - dragCardX, actualDy = newY - dragCardY;
      d.x = newX; d.y = newY;
      positionCard(dragCard);
      dragGroupCards.forEach((cid, i) => {
        const cd = cards.get(cid);
        if (cd) {
          cd.x = dragGroupStartPositions[i].x + actualDx;
          cd.y = dragGroupStartPositions[i].y + actualDy;
          positionCard(cid);
        }
      });
      updateConnections();
      const _dd = cards.get(dragCard);
      if (_dd && _dd.type === 'mindmap') updateMindmapConnections();
      renderGroups();
      if (selectedCardId === dragCard) showFmt(dragCard);
    }

    if (resizeCard) {
      const d = cards.get(resizeCard), el = document.getElementById(resizeCard);
      const dx = (e.clientX - resizeMouseX) / scale, dy = (e.clientY - resizeMouseY) / scale;
      if (d.type === 'image' && d.imgNatW && d.imgNatH && !e.shiftKey) {
        const ratio = d.imgNatW / d.imgNatH;
        let nw = Math.max(80, resizeStartW + dx), nh = Math.round(nw / ratio);
        if (nh < 60) { nh = 60; nw = Math.round(nh * ratio); }
        d.w = nw; d.h = nh;
      } else { d.w = Math.max(100, resizeStartW + dx); d.h = Math.max(60, resizeStartH + dy); }
      el.style.width = d.w + 'px'; el.style.height = d.h + 'px';
      if (d.type === 'sticky' || d.type === 'textbox') {
        const liveFontSize = Math.max(14, Math.min(72, Math.round(d.w / 6)));
        const cont = el.querySelector('.board-card-content');
        if (cont) cont.style.fontSize = liveFontSize + 'px';
      }
      updateConnections(); renderGroups();
      if (selectedCardId === resizeCard) showFmt(resizeCard);
    }

    if (anchorDragFrom && connectTempLine) {
      const r = area.getBoundingClientRect();
      const cx = (e.clientX - r.left - panX) / scale, cy = (e.clientY - r.top - panY) / scale;
      connectTempLine.setAttribute('x2', cx); connectTempLine.setAttribute('y2', cy);
      if (snapTarget) {
        const prevEl = document.getElementById(snapTarget.cardId);
        if (prevEl) { prevEl.classList.remove('anchor-target'); prevEl.querySelector(`.board-anchor-${snapTarget.anchor}`)?.classList.remove('snap-highlight'); }
        snapTarget = null;
      }
      const nearest = findNearestAnchor(cx, cy, anchorDragFrom.cardId, 40);
      if (nearest) {
        snapTarget = nearest;
        const tEl = document.getElementById(nearest.cardId);
        if (tEl) { tEl.classList.add('anchor-target'); tEl.querySelector(`.board-anchor-${nearest.anchor}`)?.classList.add('snap-highlight'); }
        connectTempLine.setAttribute('x2', nearest.pos.x); connectTempLine.setAttribute('y2', nearest.pos.y);
      }
    }
  }

  function onWindowMouseUp(e) {
    if (isDrawing) {
      isDrawing = false;
      drawSvg.querySelector('.draw-live')?.remove();
      if (currentDrawPoints.length > 1) {
        const sid = 'ds' + (++drawIdCounter);
        const strokeType = highlighterMode ? 'highlighter' : 'pen';
        const strokeData = { id: sid, points: currentDrawPoints, color: drawColor, width: drawWidth, type: strokeType };
        drawStrokes.push(strokeData);
        renderDrawStrokes();
        pushUndo({ type: 'drawstroke', strokeId: sid, strokeData });
      }
      currentDrawPoints = [];
      return;
    }

    if (isCreatingCard && creationStart) {
      isCreatingCard = false;
      if (creationPreviewEl) { creationPreviewEl.remove(); creationPreviewEl = null; }
      const r = area.getBoundingClientRect();
      const cx = (e.clientX - r.left - panX) / scale, cy = (e.clientY - r.top - panY) / scale;
      const sx = Math.min(creationStart.canvasX, cx), sy = Math.min(creationStart.canvasY, cy);
      let sw = Math.abs(cx - creationStart.canvasX), sh = Math.abs(cy - creationStart.canvasY);
      const MIN_W = 100, MIN_H = 60;
      if (sw < MIN_W) sw = MIN_W;
      if (sh < MIN_H) sh = MIN_H;
      const type = creationStart.tool === 'sticky' ? 'sticky' : 'textbox';
      const extra = type === 'sticky' ? { color: nextStickyColor, w: sw, h: sh } : { w: sw, h: sh };
      const id = createCardData(type, sx, sy, extra);
      const d = cards.get(id);
      d.fontSize = Math.max(14, Math.min(72, Math.round(sw / 6)));
      renderCard(id);
      pushUndo({ type: 'create', cardId: id, data: { ...cards.get(id) } });
      selectCard(id); setTool('select');
      const el = document.getElementById(id);
      if (el) {
        const cont = el.querySelector('.board-card-content');
        if (cont) setTimeout(() => startEditing(id, cont), 50);
      }
      creationStart = null;
      return;
    }

    if (isBoxSelecting) {
      isBoxSelecting = false;
      boxSelectStart = null;
      if (boxSelectEl) { boxSelectEl.remove(); boxSelectEl = null; }
      return;
    }
    boxSelectStart = null;

    if (isPanning) { isPanning = false; scheduleSave(); }

    if (dragCard) {
      const el = document.getElementById(dragCard);
      if (el) el.classList.remove('dragging');
      clearAlignGuides();
      if (dragMoved) {
        const items = [{ type: 'move', cardId: dragCard, oldX: dragCardX, oldY: dragCardY }];
        dragGroupCards.forEach((cid, i) => {
          items.push({ type: 'move', cardId: cid, oldX: dragGroupStartPositions[i].x, oldY: dragGroupStartPositions[i].y });
        });
        if (items.length > 1) pushUndo({ type: 'batch', items });
        else pushUndo(items[0]);
        const dd = cards.get(dragCard);
        if (dd && dd.type === 'mindmap') updateMindmapConnections();
        else if (dragGroupCards.some(cid => { const cd = cards.get(cid); return cd && cd.type === 'mindmap'; })) updateMindmapConnections();
      }
      dragCard = null; dragMoved = false; dragGroupCards = []; dragGroupStartPositions = [];
    }

    if (resizeCard) {
      const rd = cards.get(resizeCard);
      if (resizeStartW !== rd.w || resizeStartH !== rd.h) {
        if (rd.type === 'sticky' || rd.type === 'textbox') {
          const newFontSize = Math.max(14, Math.min(72, Math.round(rd.w / 6)));
          const undoItems = [{ type: 'resize', cardId: resizeCard, oldW: resizeStartW, oldH: resizeStartH }];
          if (newFontSize !== rd.fontSize) {
            undoItems.push({ type: 'style', cardId: resizeCard, props: { fontSize: rd.fontSize } });
            rd.fontSize = newFontSize;
            syncCardStyle(resizeCard);
            if (selectedCardId === resizeCard) showFmt(resizeCard);
          }
          if (undoItems.length > 1) pushUndo({ type: 'batch', items: undoItems });
          else pushUndo(undoItems[0]);
        } else {
          pushUndo({ type: 'resize', cardId: resizeCard, oldW: resizeStartW, oldH: resizeStartH });
        }
      }
      resizeCard = null;
    }

    if (anchorDragFrom) {
      if (connectTempLine) { connectTempLine.remove(); connectTempLine = null; }
      const srcEl = document.getElementById(anchorDragFrom.cardId);
      if (srcEl) { srcEl.classList.remove('dragging-anchor'); srcEl.querySelectorAll('.board-anchor-point.active').forEach(a => a.classList.remove('active')); }
      if (snapTarget) {
        const tEl = document.getElementById(snapTarget.cardId);
        if (tEl) { tEl.classList.remove('anchor-target'); tEl.querySelectorAll('.snap-highlight').forEach(a => a.classList.remove('snap-highlight')); }
        const exists = connections.some(c =>
          (c.from === anchorDragFrom.cardId && c.to === snapTarget.cardId && c.fromAnchor === anchorDragFrom.anchor && c.toAnchor === snapTarget.anchor) ||
          (c.from === snapTarget.cardId && c.to === anchorDragFrom.cardId && c.fromAnchor === snapTarget.anchor && c.toAnchor === anchorDragFrom.anchor)
        );
        if (!exists) {
          const cid = newConnId();
          const connData = { id: cid, from: anchorDragFrom.cardId, to: snapTarget.cardId, fromAnchor: anchorDragFrom.anchor, toAnchor: snapTarget.anchor, style: 'dashed' };
          connections.push(connData);
          pushUndo({ type: 'connect', connId: cid, ...connData });
          updateConnections();
        }
        snapTarget = null;
      }
      anchorDragFrom = null;
    }
  }

  // ============ SEARCH ============
  function clearSearch() {
    searchInput.value = '';
    cards.forEach((_, id) => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('search-hit', 'search-dim'); }
    });
  }

  function focusSearch() {
    searchInput.focus(); searchInput.select();
  }

  // ============ MINDMAP ============
  function createMindmapRoot(x, y) {
    const id = createCardData('mindmap', x - 70, y - 28, { content: '中心主题', mmLevel: 0, mmParentId: null, mmChildren: [] });
    const d = cards.get(id);
    d.w = 140; d.h = 56;
    mindmapNodes.set(id, d);
    renderCard(id);
    pushUndo({ type: 'create', cardId: id, data: { ...d } });
    selectCard(id);
    const el = document.getElementById(id);
    if (el) { const cont = el.querySelector('.board-card-content'); if (cont) setTimeout(() => startEditing(id, cont), 80); }
  }

  function addMindmapChild(parentId) {
    const pd = cards.get(parentId);
    if (!pd || pd.type !== 'mindmap') return;
    const level = (pd.mmLevel || 0) + 1;
    const id = createCardData('mindmap', pd.x + 200, pd.y, {
      content: '子主题',
      mmLevel: level,
      mmParentId: parentId,
      mmChildren: []
    });
    const d = cards.get(id);
    d.w = level === 1 ? 110 : 90; d.h = level === 1 ? 44 : 38;
    pd.mmChildren.push(id);
    mindmapNodes.set(id, d);
    renderCard(id);
    pushUndo({ type: 'create', cardId: id, data: { ...d } });
    autoLayoutMindmap(findMindmapRoot(parentId));
    updateMindmapConnections();
    selectCard(id);
    const el = document.getElementById(id);
    if (el) { const cont = el.querySelector('.board-card-content'); if (cont) setTimeout(() => startEditing(id, cont), 80); }
  }

  function addMindmapSibling(nodeId) {
    const d = cards.get(nodeId);
    if (!d || d.type !== 'mindmap' || !d.mmParentId) return;
    addMindmapChild(d.mmParentId);
  }

  function findMindmapRoot(nodeId) {
    let d = cards.get(nodeId);
    while (d && d.mmParentId) {
      d = cards.get(d.mmParentId);
    }
    return d ? d.id : nodeId;
  }

  function autoLayoutMindmap(rootId) {
    const rd = cards.get(rootId);
    if (!rd) return;
    function subtreeHeight(nid) {
      const nd = cards.get(nid);
      if (!nd || !nd.mmChildren || nd.mmChildren.length === 0) return (nd?.h || 44);
      let total = 0;
      nd.mmChildren.forEach((cid, i) => {
        total += subtreeHeight(cid);
        if (i < nd.mmChildren.length - 1) total += 30;
      });
      return Math.max(nd?.h || 44, total);
    }
    function layoutNode(nid, x, yCenter) {
      const nd = cards.get(nid);
      if (!nd) return;
      nd.x = x;
      nd.y = yCenter - (nd.h || 44) / 2;
      positionCard(nid);
      if (!nd.mmChildren || nd.mmChildren.length === 0) return;
      const childX = x + 200;
      let childrenTotalH = 0;
      const childHeights = nd.mmChildren.map(cid => subtreeHeight(cid));
      childrenTotalH = childHeights.reduce((a, b) => a + b, 0) + (nd.mmChildren.length - 1) * 30;
      let startY = yCenter - childrenTotalH / 2;
      nd.mmChildren.forEach((cid, i) => {
        const ch = childHeights[i];
        const childCenter = startY + ch / 2;
        layoutNode(cid, childX, childCenter);
        startY += ch + 30;
      });
    }
    layoutNode(rootId, rd.x, rd.y + (rd.h || 56) / 2);
    updateConnections();
    scheduleSave();
  }

  function updateMindmapConnections() {
    connections = connections.filter(c => !c._mindmap);
    cards.forEach((d, id) => {
      if (d.type !== 'mindmap' || !d.mmParentId) return;
      if (!cards.has(d.mmParentId)) return;
      const exists = connections.some(c => c._mindmap && c.from === d.mmParentId && c.to === id);
      if (exists) return;
      const cid = newConnId();
      connections.push({ id: cid, from: d.mmParentId, to: id, fromAnchor: 'right', toAnchor: 'left', style: 'solid', _mindmap: true });
    });
    updateConnections();
  }

  // ============ EXPORT PNG ============
  function exportPNG() {
    if (cards.size === 0) { alert('画布为空，无法导出'); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cards.forEach(d => {
      minX = Math.min(minX, d.x); minY = Math.min(minY, d.y);
      maxX = Math.max(maxX, d.x + (d.w || 200)); maxY = Math.max(maxY, d.y + (d.h || 100));
    });
    const pad = 40;
    const cw = maxX - minX + pad * 2, ch = maxY - minY + pad * 2;

    const canvas = document.createElement('canvas');
    canvas.width = cw * 2; canvas.height = ch * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#fefcf6';
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = 'rgba(43,127,216,0.13)';
    for (let x = 0; x < cw; x += 24) for (let y = 0; y < ch; y += 24) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); }

    connections.forEach(conn => {
      const fs = getAnchorPos(conn.from, conn.fromAnchor || 'right');
      const ts = getAnchorPos(conn.to, conn.toAnchor || 'left');
      const offset = Math.max(40, Math.abs(fs.x - ts.x) * 0.3, Math.abs(fs.y - ts.y) * 0.3);
      const fc = anchorControlPoint(fs, conn.fromAnchor || 'right', offset);
      const tc = anchorControlPoint(ts, conn.toAnchor || 'left', offset);
      ctx.beginPath();
      ctx.moveTo(fs.x - minX + pad, fs.y - minY + pad);
      ctx.bezierCurveTo(fc.x - minX + pad, fc.y - minY + pad, tc.x - minX + pad, tc.y - minY + pad, ts.x - minX + pad, ts.y - minY + pad);
      ctx.strokeStyle = '#2B7FD8';
      ctx.lineWidth = 2;
      const style = conn.style || 'dashed';
      if (style === 'dashed') ctx.setLineDash([8, 4]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (style === 'arrow') {
        const angle = Math.atan2(ts.y - tc.y, ts.x - tc.x);
        const ax = ts.x - minX + pad, ay = ts.y - minY + pad;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 10 * Math.cos(angle - 0.4), ay - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(ax - 10 * Math.cos(angle + 0.4), ay - 10 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = '#2B7FD8'; ctx.fill();
      }
    });

    drawStrokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.save();
      if (s.type === 'highlighter') ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] - minX + pad, s.points[0][1] - minY + pad);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] - minX + pad, s.points[i][1] - minY + pad);
      ctx.strokeStyle = s.color || '#2B7FD8';
      ctx.lineWidth = s.width || 3;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    });

    const stickyColors = { yellow: '#FFF3B0', pink: '#FCE4EC', blue: '#B3E5FC', green: '#C8E6C9', purple: '#E1BEE7', orange: '#FFE0B2' };
    const sortedCards = [...cards.values()].sort((a, b) => (a.z || 0) - (b.z || 0));
    sortedCards.forEach(d => {
      const cx = d.x - minX + pad, cy = d.y - minY + pad;
      const w = d.w || 200, h = d.h || 100;
      ctx.save();
      if (d.type === 'sticky' && d.rotation) {
        ctx.translate(cx + w / 2, cy + h / 2);
        ctx.rotate(d.rotation * Math.PI / 180);
        ctx.translate(-(cx + w / 2), -(cy + h / 2));
      }
      ctx.fillStyle = d.type === 'sticky' ? 'rgba(0,0,0,0.1)' : 'rgba(43,127,216,0.06)';
      ctx.beginPath(); roundRect(ctx, cx + 2, cy + (d.type === 'sticky' ? 4 : 2), w, h, d.type === 'mindmap' ? 20 : 10); ctx.fill();
      if (d.type === 'sticky') {
        ctx.fillStyle = stickyColors[d.color] || stickyColors.yellow;
      } else if (d.type === 'mindmap') {
        const lvl = d.mmLevel || 0;
        ctx.fillStyle = lvl === 0 ? '#2B7FD8' : lvl === 1 ? '#dce8f7' : '#fff';
      } else {
        ctx.fillStyle = '#fff';
      }
      ctx.beginPath(); roundRect(ctx, cx, cy, w, h, d.type === 'mindmap' ? 20 : 10); ctx.fill();
      if (d.type === 'textbox') {
        ctx.strokeStyle = 'rgba(43,127,216,0.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); roundRect(ctx, cx, cy, w, h, 10); ctx.stroke();
      }
      if (d.type === 'mindmap' && (d.mmLevel || 0) >= 2) {
        ctx.strokeStyle = '#2B7FD8'; ctx.lineWidth = 2;
        ctx.beginPath(); roundRect(ctx, cx, cy, w, h, 12); ctx.stroke();
      }
      if (d.locked) {
        ctx.font = '12px sans-serif'; ctx.fillStyle = '#666';
        ctx.fillText('🔒', cx + 4, cy + 16);
      }
      if (d.content) {
        ctx.fillStyle = d.type === 'mindmap' && (d.mmLevel || 0) === 0 ? '#fff' : '#2a2a2a';
        ctx.font = (d.bold ? 'bold ' : '') + (d.italic ? 'italic ' : '') + (d.fontSize || 16) + 'px sans-serif';
        ctx.textAlign = d.type === 'mindmap' ? 'center' : 'left';
        const lines = d.content.split('\n');
        const lh = (d.fontSize || 16) * 1.5;
        lines.forEach((line, i) => {
          if (cy + 16 + i * lh < cy + h - 4) {
            if (d.type === 'mindmap') ctx.fillText(line, cx + w / 2, cy + 16 + (d.fontSize || 16) + i * lh, w - 16);
            else ctx.fillText(line, cx + 16, cy + 16 + (d.fontSize || 16) + i * lh, w - 32);
          }
        });
        ctx.textAlign = 'left';
      }
      ctx.restore();
    });

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'whiteboard-export.png';
      a.click(); URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  }

  // ============ EXPORT / IMPORT JSON ============
  function exportJSON() {
    const state = buildSaveState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'whiteboard-data.json';
    a.click(); URL.revokeObjectURL(url);
  }

  // ============ KEYBOARD SHORTCUTS ============
  function onDocumentKeyDown(e) {
    if (editingCardId && !e.ctrlKey && !e.metaKey) return;
    if (document.activeElement === searchInput && !e.ctrlKey && !e.metaKey && e.key !== 'Escape') return;

    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); performUndo(); return; }
    if (mod && (e.key === 'z' && e.shiftKey || e.key === 'y')) { e.preventDefault(); performRedo(); return; }

    if (mod && e.key === 'a') { e.preventDefault(); selectAllCards(); return; }
    if (mod && e.key === 'g' && !e.shiftKey) {
      e.preventDefault();
      const ids = [...multiSelectedIds];
      if (selectedCardId && !ids.includes(selectedCardId)) ids.push(selectedCardId);
      if (ids.length >= 2) createGroup(ids);
      return;
    }
    if (mod && e.key === 'g' && e.shiftKey) {
      e.preventDefault();
      const target = selectedCardId || [...multiSelectedIds][0];
      if (target) dissolveGroup(target);
      return;
    }
    if (mod && (e.key === 'e' || e.key === 'E')) { e.preventDefault(); exportPNG(); return; }
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); exportJSON(); return; }
    if (mod && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); focusSearch(); return; }

    if (editingCardId) return;

    if (e.key === '/' && !mod) { e.preventDefault(); focusSearch(); return; }
    if (e.key === '?') {
      e.preventDefault();
      shortcutHint.classList.toggle('expanded');
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedStrokeId) { deleteStroke(selectedStrokeId); return; }
      if (selectedConnId) { deleteConnection(selectedConnId); return; }
      if (multiSelectedIds.size > 0) {
        const items = [];
        multiSelectedIds.forEach(id => {
          const d = cards.get(id);
          if (!d || d.locked) return;
          const relConns = connections.filter(c => c.from === id || c.to === id);
          connections = connections.filter(c => c.from !== id && c.to !== id);
          items.push({ type: 'delete', cardId: id, data: { ...d }, conns: relConns.map(c => ({ ...c })) });
          removeCardDOM(id); cards.delete(id);
        });
        if (items.length) pushUndo({ type: 'batch', items });
        clearMultiSelection(); updateConnections();
        return;
      }
      if (selectedCardId) {
        const d = cards.get(selectedCardId);
        if (d && !d.locked) deleteCard(selectedCardId);
        return;
      }
    }

    if (e.key === 'Tab' && selectedCardId && cards.get(selectedCardId)?.type === 'mindmap') {
      e.preventDefault(); addMindmapChild(selectedCardId); return;
    }
    if (e.key === 'Enter' && selectedCardId && cards.get(selectedCardId)?.type === 'mindmap') {
      e.preventDefault(); addMindmapSibling(selectedCardId); return;
    }

    if (e.key === 'v' || e.key === 'V') setTool('select');
    if (e.key === 'n' || e.key === 'N') setTool('sticky');
    if (e.key === 't' || e.key === 'T') setTool('text');
    if (e.key === 'i' || e.key === 'I') { setTool('select'); imgInput.click(); }
    if (e.key === 'p' || e.key === 'P') { setTool('draw'); setDrawSubMode('pen'); }
    if (e.key === 'h' || e.key === 'H') { setTool('draw'); setDrawSubMode('highlighter'); }
    if (e.key === 'e' || e.key === 'E') { setTool('draw'); setDrawSubMode('eraser'); }
    if (e.key === 'm' || e.key === 'M') setTool('mindmap');
    if (e.key === 'Escape') {
      if (isCreatingCard) { isCreatingCard = false; creationStart = null; if (creationPreviewEl) { creationPreviewEl.remove(); creationPreviewEl = null; } }
      setTool('select'); deselectAll(); clearSearch();
    }
  }

  // ============ DATA SAVE / LOAD ============
  function buildSaveState() {
    const user = (typeof App !== 'undefined' && App.currentUser) ? App.currentUser.id : 'user_1';
    return {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      updatedBy: user,
      canvas: { scale, panX, panY },
      cards: Array.from(cards.values()).map(d => ({ ...d })),
      connections: connections.map(c => ({ ...c })),
      drawStrokes: drawStrokes.map(s => ({ ...s })),
      groups: groups.map(g => ({ ...g })),
      mindmapNodes: Object.fromEntries(mindmapNodes),
      cardIdCounter, connIdCounter, drawIdCounter, groupIdCounter, maxZ
    };
  }

  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveBoardData, 300);
  }

  function saveBoardData() {
    if (suppressSave) return;
    if (typeof App === 'undefined' || !App.setData) return;
    const data = buildSaveState();
    App.setData('board', data);
  }

  function loadBoardData(data) {
    if (!data) return false;
    try {
      suppressSave = true;

      cardIdCounter = data.cardIdCounter || 0;
      connIdCounter = data.connIdCounter || 0;
      drawIdCounter = data.drawIdCounter || 0;
      groupIdCounter = data.groupIdCounter || 0;
      maxZ = data.maxZ || 10;

      if (data.canvas) {
        scale = data.canvas.scale || 1;
        panX = data.canvas.panX || 0;
        panY = data.canvas.panY || 0;
      }

      cards.clear();
      mindmapNodes.clear();

      (data.cards || []).forEach(d => {
        if (d.imgData === '[IMG_TOO_LARGE]') d.imgData = '';
        if (d.fontFamily === 'sans-serif') d.fontFamily = DEFAULT_FONT;
        if (d.fontFamily === 'serif') d.fontFamily = "Georgia,serif";
        if (d.fontFamily === 'monospace') d.fontFamily = "'Courier New',monospace";
        if (!d.locked) d.locked = false;
        if (!d.mmChildren) d.mmChildren = [];
        if (d.mmLevel === undefined) d.mmLevel = 0;
        if (d.rotation === undefined) d.rotation = 0;
        if (d.textColor === undefined) d.textColor = '';
        if (!d.createdBy) d.createdBy = (typeof App !== 'undefined' && App.currentUser) ? App.currentUser.id : 'user_1';
        if (!d.createdAt) d.createdAt = new Date().toISOString();
        cards.set(d.id, d);
        if (d.type === 'mindmap') mindmapNodes.set(d.id, d);
        renderCard(d.id);
      });

      connections = (data.connections || []).map(c => {
        if (!c.fromAnchor) c.fromAnchor = 'right';
        if (!c.toAnchor) c.toAnchor = 'left';
        if (!c.style) c.style = 'dashed';
        return c;
      });

      drawStrokes = data.drawStrokes || [];
      groups = data.groups || [];

      applyTransform();
      if (mindmapNodes.size > 0) updateMindmapConnections();
      else updateConnections();
      renderDrawStrokes();
      renderGroups();
      updateUndoUI();

      suppressSave = false;
      return true;
    } catch (e) {
      console.warn('Failed to load board data:', e);
      suppressSave = false;
      return false;
    }
  }

  // ============ MODULE REGISTRATION ============
  registerModule('board', {
    name: '情绪板',
    init() {
      initBoard();
      const data = App.getData('board');
      if (data) {
        loadBoardData(data);
      } else {
        applyTransform();
        updateConnections();
        renderDrawStrokes();
        renderGroups();
        updateUndoUI();
      }
    },
    onShow() {
      // Resize canvas if needed
      applyTransform();
    },
    onHide() {
      finishEditing();
      saveBoardData();
    },
    setData(data) {
      // Clear existing
      cards.forEach((_, id) => removeCardDOM(id));
      cards.clear();
      mindmapNodes.clear();
      connections = [];
      drawStrokes = [];
      groups = [];
      undoStack.length = 0;
      redoStack.length = 0;
      loadBoardData(data);
    }
  });
})();
