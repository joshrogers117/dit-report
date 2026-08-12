// Server-side report renderer
// Generates self-contained HTML for both interactive export and PDF print layout

import { computeCumulativeTotals } from './calculations.js';

// Inline SVG data URIs for brand logos (white fill for dark backgrounds)
function svgUri(svg) { return 'data:image/svg+xml,' + encodeURIComponent(svg); }
const BRAND_SVGS = {
  red: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 733.33 159.91" fill="white"><path d="M237.03,65.12l-49.93,15.39,49.93,15.61v63.78h-96.26v-63.78h-41.51v63.78H0V0h170.25l66.78,23.19v41.93ZM99.26,30.11v35.9h41.51V30.11h-41.51Z"/><path d="M456.01,30.11h-83.62v30.11h70.39v30.11h-70.39v39.47h86.03v30.11h-185.3V0h182.89v30.11Z"/><path d="M733.33,136.71l-64.37,23.19h-175.67V0h172.06l67.98,23.19v113.52ZM592.56,30.11v99.69h41.51V30.11h-41.51Z"/></svg>'),
  arri: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 183.8 54" fill="white"><path d="M36.8.2L0,53.9h15.3l5.6-7.9h15.9v8h13.1V.2h-13.1ZM28.7,35l8.1-11.8v11.7l-8.1.1Z"/><path d="M135.3.1v52.6l-11.7-18c6.9-3.8,9.1-9.2,9.4-17.3-.1-4.7-2-10.4-5.8-13.4C121.9,0,115.6,0,109.3,0h-15.3v52.4l-11.6-17.7c6.9-3.8,9.2-9.1,9.5-17.2-.1-4.7-2.1-10.5-5.9-13.5-5.3-4-11.6-4-17.9-4h-15.4v53.8h14.2v-16.3l11.5,16.3h29.8v-16.2l11.4,16.3h29.6V.1h-13.9ZM74.3,24c-1.8.3-3.7.3-7.6.3v-11.9c3.8,0,5.7-.1,7.4.4,1.7.5,3.2,2.7,3.4,5.8-.1,3-1.4,5.1-3.2,5.4ZM115.6,24c-1.8.3-3.7.3-7.6.3v-11.9c3.8,0,5.7-.1,7.4.4,1.7.5,3.2,2.7,3.4,5.8-.1,3-1.4,5.1-3.2,5.4Z"/><path d="M168.7.1c-8.3,0-15.1,4.9-15.1,10.9s6.8,10.9,15.1,10.9,15.1-4.9,15.1-10.9c0-6.1-6.8-10.9-15.1-10.9ZM168.7,21.1c-7.7,0-14.1-4.6-14.1-10.1s6.4-10.2,14.1-10.2,14.1,4.6,14.1,10.2c0,5.5-6.3,10.1-14.1,10.1Z"/></svg>'),
  sony: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 225.28" fill="white"><path d="m456.01,225.28c-46.41,0-89.42-13.82-118.09-39.6A96.9,96.9,0,0,1,305.79,112.49,98.33,98.33,0,0,1,337.92,39.55C364.54,15.36,411.65,0,456.01,0c49.08,0,88.37,12.36,118.4,39.6a97.41,97.41,0,0,1,31.69,72.88,101.53,101.53,0,0,1-31.69,73.19c-27.98,25.93-71.91,39.6-118.4,39.6v-29.64c24.6,0,47.44-8.5,63.39-24.37,15.95-15.87,23.19-35.12,23.19-58.88,0-22.68-7.96-43.88-23.19-58.88-15.74-15.49-39.12-24.22-63.39-24.22-24.27,0-47.74,8.65-63.49,24.22-15.18,15.03-23.04,36.3-23.04,58.88a82.36,82.36,0,0,0,23.04,58.88c15.74,15.69,39.07,24.37,63.49,24.37zM117.12,0C92.31,0,64.13,4.66,40.32,15.36,18.1,25.29,0,41.24,0,67.69A54.22,54.22,0,0,0,14.72,104.96c6.43,5.94,16.79,16.03,43.88,21.96,12.11,2.56,37.99,6.68,63.77,9.4,25.78,2.71,50.76,5.12,61,7.86,8.14,2.07,21.84,4.89,21.84,20.25,0,15.36-14.41,19.97-16.92,20.97-2.51,1-19.81,8.93-50.89,8.93a216.42,216.42,0,0,1-60.6-10.42c-11.6-4.15-23.76-9.6-35.1-23.45a40.27,40.27,0,0,1-7.3-22.22H6.25v78.85H37.53v-10.68a4.45,4.45,0,0,1,6.76-3.84,246.43,246.43,0,0,0,45.77,14.8c16.44,3.43,27.06,5.91,47.49,5.91a202.62,202.62,0,0,0,63.64-8.99,111.08,111.08,0,0,0,37.81-18.66,51.81,51.81,0,0,0,20.25-41.5,58.06,58.06,0,0,0-16.36-40.81,72.01,72.01,0,0,0-20.17-13.8,148.61,148.61,0,0,0-24.88-8.68c-16.23-3.97-52.68-8.93-70.12-10.68-18.28-1.89-50-4.53-62.67-8.45-3.84-1.2-11.67-4.92-11.67-14,0-6.48,3.58-11.96,10.65-16.38C75.26,34.3,97.95,29.93,121.6,29.93a166.99,166.99,0,0,1,66.71,13.03,72.86,72.86,0,0,1,15.87,9.47,47.72,47.72,0,0,1,15.64,26.16h25.27V9.96h-28.16v7.96c0,2.56-2.56,5.94-7.68,3.15C196.56,14.46,160.87.18,117.12,0zm618.21,12.6,137.63,124.19-1.41-83.61c-.15-10.98-2.15-15.56-14.03-15.56H831.67V12.6h117.76v25.01h-25.27c-12.08,0-12.8,3.89-13,15.56l2.12,159.77h-40.32L714.42,71.48v100.37c.13,10.93.64,16.08,11.88,16.08h28.16v25.01H639.03v-25.01h27.03c10.09,0,9.68-9.63,9.68-16.64V54.12c0-7.68-1.08-16.49-16.9-16.49h-21.91V12.6zM1083.78,187.88a55.86,55.86,0,0,0,6.96-.44,8.63,8.63,0,0,0,5.43-4.81,28.01,28.01,0,0,0,.54-5.4v-39.55c0-1.33,0-1.36-1.69-3.46-1.69-2.1-72.09-81.92-75.29-85.5-3.99-4.35-11.01-11.08-21.68-11.08h-24.45V12.6h137.98v24.99h-16.64c-3.84,0-6.4,3.66-3.12,7.68,0,0,46.44,55.55,46.87,56.14.44.59.82.72,1.41.18.59-.54,47.59-55.81,47.95-56.32a4.79,4.79,0,0,0-4.1-7.68h-17.08V12.6H1280v25.04h-25.27c-9.16,0-12.8,1.69-19.79,9.47l-76.16,86.89a5.38,5.38,0,0,0-.92,3.69v39.53a28.16,28.16,0,0,0,.56,5.4,8.52,8.52,0,0,0,5.4,4.81,50.61,50.61,0,0,0,6.91.44h25.83v25.04h-137.27v-25.04z"/></svg>'),
  canon: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 167" fill="white"><g transform="scale(1,1)"><path d="m130.62,151.03c-37.2,0-67.34-30.16-67.34-67.36s30.14-67.34,67.34-67.34c13.11,0,25.35,3.74,35.69,10.22L130.62,83.67l67.19-38.8C190.51,33.24,180.04,23.22,167.38,15.61,151.27,5.97,128.86,0,104.08,0,68.73,0,37.72,12.85,20.43,32.08,7.62,46.3,0,64.2,0,83.67s7.62,37.39,20.43,51.62c17.34,19.26,47.89,32.03,82.65,32.03s65.3-12.78,82.65-32.03c.95-1.06,1.87-2.13,2.74-3.24l-2.62-9.82c-12.19,17.4-32.38,28.8-55.23,28.8"/><path d="m353.38,163.27-28.2-105.2c-4.53-17-20.01-29.5-38.44-29.5-4.78,0-9.36.85-13.61,2.4l-60.71,22.08h62.44l10.67,39.85c-10.35-9.91-23.83-15.33-38.59-15.33-29.31,0-53.04,19.64-53.04,43.87s23.73,43.9,53.04,43.9c21.1,0,39.76-10.33,51.27-26.2l6.19,23.13h48.98m-86.02-16.34c-13.52,0-24.48-10.95-24.48-24.49s10.96-24.48,24.48-24.48,24.49,10.96,24.49,24.48-10.97,24.49-24.49,24.49z"/><path d="m468.36,28.59c-3.7,0-7.2.82-10.32,2.28l-38.98,18.17c-1.93-11.6-12.01-20.45-24.17-20.45-3.68,0-7.19.82-10.35,2.28l-47.59,22.18h33.46v110.22h48.98V65.31c0-6.76,5.47-12.26,12.25-12.26s12.25,5.5,12.25,12.26v97.96h48.96V53.05c0-13.52-10.97-24.46-24.49-24.46"/><path d="m775.52,28.59c-3.71,0-7.23.82-10.4,2.28l-38.94,18.17c-1.92-11.6-12-20.45-24.16-20.45-3.68,0-7.19.82-10.36,2.28l-47.57,22.18h33.45v110.22h48.97V65.31c0-6.76,5.48-12.26,12.26-12.26s12.23,5.5,12.23,12.26v97.96h49V53.05c0-13.52-10.98-24.46-24.48-24.46"/><path d="m652.01,97.96c0,38.31-31.05,69.36-69.35,69.36s-69.4-31.05-69.4-69.36,31.07-69.37,69.4-69.37,69.35,31.07,69.35,69.37M585.53,49.65c-2.18-8.16-10.57-13.01-18.73-10.81-8.15,2.19-13.02,10.58-10.83,18.74l23.79,88.7c2.2,8.17,10.57,13.01,18.73,10.85,8.16-2.21,13.01-10.6,10.82-18.76l-23.78-88.72z"/></g></svg>'),
  blackmagic: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2550 1043" fill="white"><g transform="matrix(1.3333,0,0,-1.3333,0,1043)"><g transform="scale(0.1)"><path d="M144.141,448.348C130.746,437.27,111.207,431.742,85.4531,431.742H23.1289v122.571h52.1914c59.2697,0,88.8747-20.54,88.8747-61.614,0-18.511-6.668-33.301-20.054-44.351zM23.1289,694h31.4727c55.3324,0,83.0004-20.059,83.0004-60.148,0-39.954-27.372-59.954-82.1489-59.954H23.1289ZM119.539,568.516c28.852,15.66,43.258,37.964,43.258,66.976,0,24.266-8.473,43.289-25.399,57.071-16.925,13.781-41.8628,20.687-74.7222,20.687H0V412.516h88.0742c31.0078,0,55.5818,7.187,73.7388,21.621,18.167,14.414,27.242,33.828,27.242,58.215,0,40.726-23.172,66.105-69.516,76.164"/><path d="M218.75,713.25V412.516h21.355V713.25H218.75"/><path d="m390.73,451.422c-18.64-17.07-36.98-25.598-55.042-25.598-11.196,0-20.497,3.176-27.969,9.504-7.449,6.348-11.149,14.149-11.149,23.379,0,16.477,8.895,29.973,26.735,40.586,17.84,10.586,40.332,15.41,67.425,14.402zm26.086-22.442c-3.148,0-4.73,3.372-4.73,10.125v123.641c0,16.813-5.809,29.645-17.445,38.504-11.598,8.844-26.387,13.277-44.325,13.277-20.214,0-41.539-7.015-63.914-21.035v-21.695c21.649,16.812,41.801,25.215,60.438,25.215,29.25,0,43.89-13.524,43.89-40.578v-25.231c-36.98-1.887-65.417-9.055-85.32-21.48-19.902-12.481-29.867-29.5-29.867-51.082,0-13.989,5.16-25.864,15.453-35.649,10.336-9.793,22.938-14.676,37.836-14.676,20.484,0,41.133,8.184,61.898,24.579.856-9.918,2.215-16.512,4.075-19.735,1.883-3.215,5.269-4.844,10.152-4.844,8.449,0,21.824,6.844,40.031,20.567v17.597c-14.761-11.679-24.148-17.5-28.172-17.5"/><path d="m551.402,614.527c-27.968,0-50.98-9.886-68.968-29.664-17.985-19.793-26.996-45.261-26.996-76.468,0-29.915,8.914-54.075,26.773-72.469,17.84-18.418,41.223-27.61,70.141-27.61,16.925,0,35.269,3.36,55.043,10.149v22.051c-18.622-7.7-36.379-11.536-53.29-11.536-23.203,0-41.71,7.372-55.531,22.102-13.808,14.754-20.722,34.637-20.722,59.676,0,24.621,6.914,44.609,20.742,60.012,13.84,15.398,31.804,23.093,53.89,23.093,15.325,0,32.473-4.195,51.411-12.593v23.445c-19.649,6.535-37.168,9.812-52.493,9.812"/><path d="M635.605,713.25V412.516h20.989V713.25h-20.989"/><path d="M768.98,610.66,659.758,516.461,784.828,412.516h28.957L688.563,516.566,796.988,610.66H768.98"/><path d="M813.391,610.66V412.516h21.004v138.961c16.812,28.253,36.722,42.386,59.699,42.386,15.844,0,28.433-5.925,37.875-17.789,9.422-11.844,14.109-28.742,14.109-50.719V412.516h21.363V547.59c9.594,16.195,18.903,27.969,27.926,35.277,9.023,7.328,19.623,10.996,31.823,10.996,16.33,0,29.04-6.148,38.02-18.418,9.05-12.289,13.56-29.105,13.56-50.515V412.516h21.01V534.18c0,24.277-6.3,43.715-18.91,58.375-12.58,14.66-29.14,21.972-49.62,21.972-27.22,0-50.121-15.871-68.746-47.554-12.363,31.683-33.727,47.554-64.051,47.554-26.027,0-47.098-12.925-63.18-38.75h-.878v34.883h-21.004"/></g></g></svg>'),
  dji: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 164.781 95.199" fill="white"><g transform="translate(-57.626 -906.13)"><g transform="matrix(.54927 0 0 .54927 -45.604 584.42)"><g transform="matrix(7.1169 0 0 -7.1169 407.57 711.56)"><path d="m0 0 3.11 12.918h-6.676l-2.845-11.586c-0.413-2.258-2.84-3.315-4.563-3.342h-4.731l-1.605-4.657h9.941c2.452 0 6.074 1.255 7.369 6.667"/></g><g transform="matrix(7.1169 0 0 -7.1169 307.84 679.14)"><path d="m0 0 3.138 13.131h6.87l-3.571-14.936c-0.687-2.884-2.831-3.577-4.811-3.577h-15.837c-1.745 0-3.207 0.742-2.415 4.072l1.426 5.958c0.723 3.021 2.97 3.712 4.595 3.712h11.053l-0.89-3.723h-5.643c-0.83 0-1.285-0.18-1.517-1.149l-0.91-3.803c-0.326-1.365 0.151-1.46 1.152-1.46h5.17c0.947 0 1.779 0.06 2.19 1.775"/></g><g transform="matrix(7.1169 0 0 -7.1169 440.44 619.63)"><path d="m0 0-3.234-13.745h6.675l3.233 13.745h-6.674z"/></g></g></g></svg>'),
  nikon: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 2500" fill="white"><path d="M1885.69,1240.67c-16.74-42.8-57.22-75.82-100.49-86.52-118.61-31.63-268.86-19.07-350.74,80.01-47.44,60.93-75.34,152.58-40,229.8,17.22,45.12,65.12,77.68,110.24,86.05,99.56,13.02,227.93,18.61,307.95-54.42,74.87-62.33,100.01-166.53,73.03-254.92h0ZM1640.09,1423.95c-11.17,4.18-29.31,6.04-39.54-1.87-23.73-13.03-15.84-42.33-13.05-61.88,11.17-36.29,23.73-87.46,68.86-94.43,14.82-1.44,33.49,5.12,39.54,22.33,4.18,52.57-10.92,106.03-55.81,135.85h0ZM560.98,942.23l-83.73,242.86-63.66-242.86h-169.15L36.76,1535.11h197.63l78.73-226.09,58.62,226.09h179.2l207.67-592.89h-197.63ZM888.7,1119.11c34.89-5.12,71.63-16.28,90.71-50.71,13.96-27.44,8.85-60.48-7.9-84.65-26.98-28.38-64.2-31.17-103.73-28.84-36.29,5.12-73.03,23.25-86.05,60.93-6.04,23.72-4.66,52.57,11.17,71.63,23.24,28.39,60.93,32.57,95.81,31.65ZM744.74,1158.82l-132.3,376.84h187.58l132.3-376.84h-187.58Z"/><path d="M1470.24,1158.29h-217.72l-108.87,127.27,118.91-343.34h-190.93l-207.67,592.89h190.93l53.59-149.05,30.15,149.05h199.31l-33.51-180.88,165.82-195.95h0ZM2327.57,1153.79c-83.72,0-139,36.85-167.47,61.97l21.76-56.95h-197.62l-132.33,376.84h197.63l63.66-180.88c10.03-28.47,26.77-41.88,55.25-41.88s35.19,28.47,26.8,51.92l-60.28,170.84h190.93l85.42-244.53c23.46-66.99,0-137.32-83.75-137.32h0Z"/></svg>'),
  apple: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 814.1 999.9" fill="white"><path d="M788.1,340.9c-5.8,4.5-108.2,62.2-108.2,190.5,0,148.4,130.3,200.9,134.2,202.2-.6,3.2-20.7,71.9-68.7,141.9-42.8,61.6-87.5,123.1-155.5,123.1s-85.5-39.5-164-39.5-103.7,40.8-165.9,40.8-105.6-57-155.5-127C46.7,790.7,0,663,0,541.8,0,347.4,126.4,244.3,250.8,244.3c66.1,0,121.2,43.4,162.7,43.4s101.1-46,176.3-46c28.5,0,130.9,2.6,198.3,99.2h0ZM554.1,159.4c31.1-36.9,53.1-88.1,53.1-139.3,0-7.1-.6-14.3-1.9-20.1-50.6,1.9-110.8,33.7-147.1,75.8-28.5,32.4-55.1,83.6-55.1,135.5,0,7.8,1.3,15.6,1.9,18.1,3.2.6,8.4,1.3,13.6,1.3,45.4,0,102.5-30.4,135.5-71.3h0Z"/></svg>'),
};

const REPORT_CSS = `
/* ──────────────────────────────────────────────────────────────────────
   Default theme is the warm paper document — cloud ground, white cards,
   basalt ink — and is what the PDF renders. theme-light = pure snow
   (matches the app UI); theme-film = basalt dark with parchment ink.
   ────────────────────────────────────────────────────────────────────── */
:root {
  /* Palette */
  --basalt: #121410; --moss: #2B3A26; --madrone: #B85B33; --clay: #B07859;
  --parchment: #EBE2CC; --granite: #6B6F65; --alpenglow: #D1573F; --ochre: #D9A828;
  --snow: #FFFFFF; --cloud: #F4F2EC; --mist: #E6E3D9; --fog: #D6D2C6;
  --graphite: #0A0A0A; --slate: #2A2A2A; --smoke: #6F6E6A;
  --compass: #FED20B; --ember: #D94B1A; --leaf: #1B7A47;

  /* Warm paper document theme (default) */
  --bg: var(--cloud);
  --surface: var(--snow);
  --surface2: var(--cloud);
  --border: color-mix(in oklab, var(--basalt) 15%, transparent);
  --border-soft: color-mix(in oklab, var(--basalt) 8%, transparent);
  --border-strong: color-mix(in oklab, var(--basalt) 32%, transparent);
  --text: var(--basalt);
  --text-dim: color-mix(in oklab, var(--basalt) 62%, transparent);
  --accent: var(--alpenglow);
  --accent2: var(--leaf);
  --accent3: var(--ochre);
  --danger: var(--ember);
  --radius: 12px;
  --shadow: none;
  --tr-caps: 0.14em;
  /* Per-source data marks. Slots 1-4 follow the on-set camera tape convention
     (A red, B blue, C yellow, D green); 5-8 serve non-camera sources. Validated
     for adjacent-pair CVD separation and normal-vision distinctness on both
     surfaces — the brand palette is too warm/muted to pass, so marks use these
     and the surrounding text/chrome stays brand ink. */
  --chart-1: #e34948; --chart-2: #2a78d6; --chart-3: #eda100; --chart-4: #008300;
  --chart-5: #e87ba4; --chart-6: #4a3aa7; --chart-7: #eb6834; --chart-8: #1baf7a;
}
.theme-light {
  --bg: var(--snow);
  --surface: var(--snow);
  --surface2: var(--cloud);
  --border: color-mix(in oklab, var(--graphite) 14%, transparent);
  --border-soft: color-mix(in oklab, var(--graphite) 8%, transparent);
  --border-strong: color-mix(in oklab, var(--graphite) 32%, transparent);
  --text: var(--graphite);
  --text-dim: var(--smoke);
}
.theme-film {
  --bg: var(--basalt);
  --surface: color-mix(in oklab, var(--parchment) 5%, var(--basalt));
  --surface2: color-mix(in oklab, var(--parchment) 11%, var(--basalt));
  --border: color-mix(in oklab, var(--parchment) 16%, transparent);
  --border-soft: color-mix(in oklab, var(--parchment) 10%, transparent);
  --border-strong: color-mix(in oklab, var(--parchment) 34%, transparent);
  --text: var(--parchment);
  --text-dim: color-mix(in oklab, var(--parchment) 58%, transparent);
  --accent2: color-mix(in oklab, var(--leaf) 55%, var(--parchment));
  --danger: color-mix(in oklab, var(--ember) 80%, var(--parchment));
  --chart-1: #e66767; --chart-2: #3987e5; --chart-3: #c98500; --chart-4: #008300;
  --chart-5: #d55181; --chart-6: #9085e9; --chart-7: #d95926; --chart-8: #199e70;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: var(--bg); color: var(--text);
  font-size: 15px; line-height: 1.55; letter-spacing: -0.005em; min-height: 100vh;
  transition: background .3s, color .3s;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
.container { max-width: 1240px; margin: 0 auto; padding: 32px 24px; }
/* Masthead — basalt identity anchor, constant across themes */
.masthead { background: var(--basalt); color: var(--parchment); border-radius: var(--radius); padding: 28px 32px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 16px; }
.masthead-text { flex: 1; min-width: 0; }
.masthead .report-type-label { margin-bottom: 12px; }
.masthead h1 { font-size: 30px; font-weight: 600; letter-spacing: -0.035em; line-height: 1.02; margin-bottom: 6px; color: var(--parchment); overflow-wrap: break-word; }
.masthead .subtitle { color: color-mix(in oklab, var(--parchment) 62%, transparent); font-size: 15px; }
.masthead .masthead-dates { margin-top: 10px; font-size: 14px; color: color-mix(in oklab, var(--parchment) 55%, transparent); font-variant-numeric: tabular-nums; }
.report-header { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px 32px; margin-bottom: 16px; }
.header-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.header-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-dim); margin-bottom: 2px; font-weight: 500; }
.header-item span { font-size: 14px; font-weight: 500; }
.dit-contact { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.report-type-label { font-size: 11px; text-transform: uppercase; letter-spacing: var(--tr-caps); color: var(--accent); font-weight: 500; margin-bottom: 14px; }
.theme-toggle { background: none; border: 1px solid color-mix(in oklab, var(--parchment) 26%, transparent); color: color-mix(in oklab, var(--parchment) 72%, transparent); width: 34px; height: 34px; border-radius: 9999px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: color .15s, border-color .15s; -webkit-tap-highlight-color: transparent; }
.theme-toggle:hover { color: var(--parchment); border-color: color-mix(in oklab, var(--parchment) 48%, transparent); }
.theme-toggle svg { width: 16px; height: 16px; }
.theme-toggle .icon-sun { display: none; }
html.theme-film .theme-toggle .icon-sun { display: block; }
html.theme-film .theme-toggle .icon-moon { display: none; }
.btn { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 6px 14px; border-radius: 9999px; cursor: pointer; font-size: 13px; font-weight: 500; font-family: inherit; transition: background .15s, border-color .15s, color .15s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.btn:hover { background: var(--surface2); }
.btn.active { background: var(--compass); color: var(--graphite); border-color: transparent; }
/* Stats — basalt data strip with compass numerals (mirrors the app's totals bar) */
.stats-bar { display: flex; flex-wrap: wrap; gap: 16px 48px; margin-bottom: 24px; background: var(--basalt); color: var(--parchment); border-radius: var(--radius); padding: 18px 28px; }
.stat-card { background: none; border: none; padding: 0; }
.stat-card .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: var(--tr-caps); color: color-mix(in oklab, var(--parchment) 55%, transparent); font-weight: 500; }
.stat-card .stat-value { font-size: 22px; font-weight: 600; margin-top: 4px; letter-spacing: -0.015em; font-variant-numeric: tabular-nums; color: var(--compass); }
.stat-card .stat-unit { font-size: 13px; color: color-mix(in oklab, var(--parchment) 55%, transparent); font-weight: 400; }
.day-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.day-tab { background: transparent; border: none; color: var(--text-dim); padding: 12px 14px; cursor: pointer; font-size: 13.5px; font-weight: 500; font-family: inherit; transition: color .15s, border-color .15s; border-bottom: 2px solid transparent; margin-bottom: -1px; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.day-tab:hover { color: var(--text); }
.day-tab.active { color: var(--text); border-bottom-color: var(--accent); }
.section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 16px; overflow: hidden; }
.section-header { padding: 12px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: var(--tr-caps); font-weight: 500; color: var(--text-dim); border-bottom: 1px solid var(--border); background: var(--surface2); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table-scroll { overflow-x: auto; }
th { text-align: left; padding: 9px 16px; font-size: 10.5px; white-space: nowrap; text-transform: uppercase; letter-spacing: .1em; color: var(--text-dim); font-weight: 500; border-bottom: 1px solid var(--border); background: var(--surface2); }
td { padding: 9px 16px; border-bottom: 1px solid var(--border-soft); vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.mono { font-weight: 500; font-variant-numeric: tabular-nums; letter-spacing: -0.005em; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 500; letter-spacing: 0.02em; }
.badge-ok { background: color-mix(in oklab, var(--accent2) 15%, transparent); color: var(--accent2); }
.camera-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 12px; padding: 16px; }
.camera-card { background: var(--surface2); border: 1px solid var(--border-soft); border-radius: 10px; padding: 16px; position: relative; overflow: hidden; }
.camera-card .brand-logo { position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; opacity: 0.15; filter: brightness(0); }
.theme-film .camera-card .brand-logo { filter: none; opacity: 0.14; }
.camera-card h3 { font-size: 15px; font-weight: 500; letter-spacing: -0.01em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.camera-card .cam-label { font-size: 10px; background: var(--text); color: var(--bg); padding: 2px 7px; border-radius: 4px; font-weight: 600; letter-spacing: 0.04em; }
.cam-label.type-camera { background: color-mix(in oklab, var(--moss) 16%, transparent); color: color-mix(in oklab, var(--moss) 55%, var(--text)); }
.cam-label.type-audio { background: color-mix(in oklab, var(--clay) 18%, transparent); color: color-mix(in oklab, var(--clay) 45%, var(--text)); }
.cam-label.type-photo { background: color-mix(in oklab, var(--granite) 16%, transparent); color: color-mix(in oklab, var(--granite) 55%, var(--text)); }
.cam-label.type-misc { background: color-mix(in oklab, var(--ochre) 18%, transparent); color: color-mix(in oklab, var(--ochre) 40%, var(--text)); }
.camera-card .cam-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.camera-card .cam-spec-label, .cam-spec-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--text-dim); }
.camera-card .cam-spec-value, .cam-spec-value { font-size: 13px; font-weight: 500; }
.bench-bar-container { display: flex; align-items: center; gap: 8px; }
.bench-bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; max-width: 120px; }
.bench-bar-fill { height: 100%; border-radius: 3px; }
.bench-bar-fill.write { background: var(--accent); }
.bench-bar-fill.read { background: var(--accent2); }
.check { color: var(--accent2); font-weight: 600; }
.cross { color: var(--danger); }
.summary-row td { font-weight: 600; background: var(--surface2); border-top: 2px solid var(--border); font-variant-numeric: tabular-nums; }
.all-days-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 16px; margin-bottom: 24px; }
.day-summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; cursor: pointer; transition: border-color .15s, transform .15s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.day-summary-card:hover { border-color: var(--alpenglow); transform: translateY(-1px); }
.day-summary-card h2 { font-size: 18px; font-weight: 500; letter-spacing: -0.015em; margin-bottom: 4px; }
.day-summary-card .day-date { color: var(--text-dim); font-size: 13px; margin-bottom: 12px; }
.day-summary-card .day-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
/* Overview: per-source stacked data bar + legend, verification status */
.day-source-bar { display: flex; gap: 2px; height: 8px; margin: 16px 0 10px; }
.day-source-bar span { display: block; height: 100%; border-radius: 2px; }
.day-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; color: var(--text-dim); }
.day-legend .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
.day-legend b { color: var(--text); font-weight: 500; font-variant-numeric: tabular-nums; }
.day-verify { margin-top: 12px; font-size: 12.5px; font-weight: 500; }
.day-verify.ok { color: var(--accent2); }
.day-verify.warn { color: var(--danger); }
.day-tab:focus-visible, .theme-toggle:focus-visible, .day-summary-card:focus-visible, .report-footer a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.overview-empty { padding: 48px 24px; text-align: center; color: var(--text-dim); font-size: 14px; }
.day-summary-card .day-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-dim); }
.day-summary-card .day-stat-value { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.report-footer { text-align: center; padding: 32px 32px 16px; color: var(--text-dim); font-size: 11.5px; line-height: 1.8; }
.report-footer a { color: var(--text-dim); text-decoration: underline; text-underline-offset: 2px; }
.report-footer a:hover { color: var(--text); }
@media (max-width: 768px) {
  .container { padding: 12px; }
  .report-header { padding: 20px; }
  .masthead { padding: 20px; }
  .header-grid { grid-template-columns: 1fr 1fr; }
  .stats-bar { grid-template-columns: 1fr 1fr; }
  th, td { padding: 8px 10px; font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

const PRINT_EXTRA_CSS = `
@page { margin: 0.4in 0.5in; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.section, .day-divider, .cumulative-bar, .masthead, .report-header, .stats-bar, .camera-card { break-inside: avoid; page-break-inside: avoid; }
tr { break-inside: avoid; page-break-inside: avoid; }
.day-section { margin-bottom: 32px; }
.day-divider { border-top: 2px solid var(--accent); margin: 32px 0 24px; padding-top: 16px; }
.cumulative-bar { background: var(--basalt); color: var(--parchment); border-radius: var(--radius); padding: 14px 20px; margin-top: 12px; display: flex; gap: 32px; font-size: 13px; }
.cumulative-bar .cum-label { font-size: 10px; text-transform: uppercase; letter-spacing: var(--tr-caps); opacity: .6; font-weight: 500; margin-bottom: 2px; }
.cumulative-bar .cum-value { font-weight: 600; font-variant-numeric: tabular-nums; font-size: 15px; color: var(--compass); }
`;

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtNum(n, decimals = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function fmtSize(gb) {
  const n = Number(gb) || 0;
  return n >= 1000 ? `${fmtNum(n / 1000)} TB` : `${fmtNum(n)} GB`;
}

// Sums HH:MM:SS:FF timecodes (24fps carry), self-contained so the renderer
// doesn't need to import lib/timecode.js at runtime.
function sumTC(tcs) {
  let h = 0, m = 0, s = 0, f = 0;
  for (const tc of (tcs || [])) {
    if (!tc) continue;
    const p = tc.split(':').map(Number);
    h += p[0] || 0; m += p[1] || 0; s += p[2] || 0; f += p[3] || 0;
  }
  s += Math.floor(f / 24); f = f % 24;
  m += Math.floor(s / 60); s = s % 60;
  h += Math.floor(m / 60); m = m % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function shortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusBadge(val) {
  if (val === 1 || val === true) return '<span class="check">&#10003;</span>';
  if (val === 0 || val === false) return '<span class="cross">&#10005;</span>';
  return '<span style="color:var(--text-dim)">&mdash;</span>';
}

function projectDateRange(project) {
  const dates = project.days.map(d => d.date).filter(Boolean).sort();
  if (dates.length > 1) return `${shortDate(dates[0])}&ndash;${shortDate(dates[dates.length - 1])}, ${new Date(dates[0]+'T00:00:00').getFullYear()}`;
  return dates.length === 1 ? formatDate(dates[0]) : '';
}

// Basalt masthead — the report's identity anchor (mirrors the app's nav chrome).
// extraHtml renders top-right (the standalone view passes the theme toggle).
function renderMasthead(project, extraHtml = '') {
  const dateRange = projectDateRange(project);
  return `<div class="masthead">
    <div class="masthead-text">
      <div class="report-type-label">DIT Offload Report</div>
      <h1>${esc(project.title)}</h1>
      <div class="subtitle">${esc(project.production_company)}${project.client ? ` &bull; ${esc(project.client)}` : ''}</div>
      ${dateRange ? `<div class="masthead-dates">${dateRange}</div>` : ''}
    </div>
    ${extraHtml}
  </div>`;
}

function renderHeaderHTML(project) {
  // Nothing to show — skip the card rather than render an empty box
  if (!project.director && !project.producer && !project.dp && !project.first_ac && !project.dit_name) return '';

  return `<div class="report-header">
    <div class="header-grid">
      ${project.director ? `<div class="header-item"><label>Director</label><span>${esc(project.director)}</span></div>` : ''}
      ${project.producer ? `<div class="header-item"><label>Producer</label><span>${esc(project.producer)}</span></div>` : ''}
      ${project.dp ? `<div class="header-item"><label>DP</label><span>${esc(project.dp)}</span></div>` : ''}
      ${project.first_ac ? `<div class="header-item"><label>1st AC</label><span>${esc(project.first_ac)}</span></div>` : ''}
    </div>
    ${project.dit_name ? `<div class="dit-contact">
      <div class="header-item"><label>DIT / Data Manager</label><span>${esc(project.dit_name)}</span></div>
      ${project.dit_email ? `<div class="header-item"><label>Email</label><!--email_off--><span><a href="mailto:${esc(project.dit_email)}" style="color:var(--text);text-decoration:none">${esc(project.dit_email)}</a></span><!--/email_off--></div>` : ''}
      ${project.dit_phone ? `<div class="header-item"><label>Phone</label><span>${esc(project.dit_phone)}</span></div>` : ''}
    </div>` : ''}
  </div>`;
}

function renderStatsBar(totals) {
  const [sizeVal, sizeUnit] = fmtSize(totals.gb).split(' ');
  return `<div class="stats-bar">
    <div class="stat-card"><div class="stat-label">Total Data</div><div class="stat-value">${sizeVal} <span class="stat-unit">${sizeUnit}</span></div></div>
    <div class="stat-card"><div class="stat-label">Total Duration</div><div class="stat-value">${totals.duration ? totals.duration.substring(0,8) : '00:00:00'}</div></div>
    <div class="stat-card"><div class="stat-label">Shoot Days</div><div class="stat-value">${totals.dayCount || 0}</div></div>
    <div class="stat-card"><div class="stat-label">Total Rolls</div><div class="stat-value">${totals.rollCount || 0}</div></div>
  </div>`;
}

function renderBenchmarks(benchmarks, maxBench) {
  if (!benchmarks || benchmarks.length === 0) return '';
  return `<div class="section">
    <div class="section-header">Drive Benchmarks</div>
    <div class="table-scroll"><table>
      <tr><th>Drive</th><th>Write (MB/s)</th><th>Read (MB/s)</th><th>Capacity</th><th>Format</th><th>Notes</th></tr>
      ${benchmarks.map(b => `<tr>
        <td class="mono" style="font-weight:600">${esc(b.drive_name)}</td>
        <td><div class="bench-bar-container">
          <span class="mono">${fmtNum(b.write_speed, 1)}</span>
          <div class="bench-bar"><div class="bench-bar-fill write" style="width:${maxBench ? (b.write_speed/maxBench*100).toFixed(1) : 0}%"></div></div>
        </div></td>
        <td><div class="bench-bar-container">
          <span class="mono">${fmtNum(b.read_speed, 1)}</span>
          <div class="bench-bar"><div class="bench-bar-fill read" style="width:${maxBench ? (b.read_speed/maxBench*100).toFixed(1) : 0}%"></div></div>
        </div></td>
        <td>${esc(b.capacity)}</td>
        <td class="mono">${esc(b.format)}</td>
        <td style="color:var(--text-dim);font-size:12px">${esc(b.notes)}</td>
      </tr>`).join('')}
    </table></div>
    <div style="padding:8px 16px;font-size:10px;color:var(--text-dim)">
      <span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Write
      <span style="display:inline-block;width:8px;height:8px;background:var(--accent2);border-radius:2px;margin-left:12px;margin-right:4px;vertical-align:middle"></span>Read
      &mdash; bars show relative speed across all drives
    </div>
  </div>`;
}

function detectBrand(name) {
  const n = (name || '').toUpperCase();
  const brands = {
    red: ['V-RAPTOR','KOMODO','RED ONE','EPIC-X','EPIC-W','EPIC-M','SCARLET-W','SCARLET-X','RAVEN','WEAPON','MONSTRO','HELIUM','GEMINI','DRAGON','RANGER','DSMC','RED EPIC','RED SCARLET','RED RAVEN','RED RANGER','KOMODO-X'],
    arri: ['ALEXA','AMIRA','ARRICAM','ARRIFLEX'],
    blackmagic: ['URSA','BMPCC','PYXIS','POCKET CINEMA','MICRO CINEMA','BLACKMAGIC'],
    sony: ['VENICE','BURANO','FX3','FX30','FX6','FX9','FR7','A7S','A7R','A7C','A7 IV','A7IV','A9 ','A1 ','F5 ','F55','F65','FS5','FS7','FS100','FS700','CINEALTA','HDW-F'],
    canon: ['C70','C80','C100','C200','C300','C400','C500','C700','R5 C','R5C','EOS C','CINEMA EOS','1D C','1DC'],
    dji: ['RONIN','ZENMUSE','INSPIRE','MAVIC','OSMO','AVATA','AIR 2S','MINI 3','MINI 4','DJI ACTION'],
    nikon: ['NIKON Z','Z5','Z6','Z7','Z8','Z9','Z30','Z50',' ZR',' ZF',' ZFC'],
    apple: ['IPHONE','IPAD'],
  };
  for (const [brand, keywords] of Object.entries(brands))
    if (keywords.some(k => n.includes(k))) return brand;
  return null;
}

function renderSourceSpecs(c) {
  const type = c.source_type || 'camera';
  if (type === 'audio') {
    return `
      ${c.resolution ? `<div><div class="cam-spec-label">Sample Rate</div><div class="cam-spec-value mono">${esc(c.resolution)}</div></div>` : ''}
      ${c.codec ? `<div><div class="cam-spec-label">Bit Depth</div><div class="cam-spec-value mono">${esc(c.codec)}</div></div>` : ''}
      ${c.audio ? `<div><div class="cam-spec-label">Channels</div><div class="cam-spec-value">${esc(c.audio)}</div></div>` : ''}`;
  }
  if (type === 'photo') {
    return `${c.codec ? `<div><div class="cam-spec-label">Format</div><div class="cam-spec-value mono">${esc(c.codec)}</div></div>` : ''}`;
  }
  if (type === 'misc') {
    return `
      ${c.resolution ? `<div><div class="cam-spec-label">Resolution</div><div class="cam-spec-value">${esc(c.resolution)}</div></div>` : ''}
      ${c.codec ? `<div><div class="cam-spec-label">Codec</div><div class="cam-spec-value mono">${esc(c.codec)}</div></div>` : ''}`;
  }
  // camera (default)
  return `
    <div><div class="cam-spec-label">Resolution</div><div class="cam-spec-value">${esc(c.resolution)}</div></div>
    <div><div class="cam-spec-label">Codec</div><div class="cam-spec-value mono">${esc(c.codec)}</div></div>
    <div><div class="cam-spec-label">Colorspace</div><div class="cam-spec-value mono">${esc(c.colorspace)}</div></div>
    ${c.gamma ? `<div><div class="cam-spec-label">Gamma</div><div class="cam-spec-value mono">${esc(c.gamma)}</div></div>` : ''}
    <div><div class="cam-spec-label">LUT</div><div class="cam-spec-value mono">${esc(c.lut)}</div></div>
    <div><div class="cam-spec-label">FPS</div><div class="cam-spec-value">${esc(c.fps)}</div></div>
    ${c.audio ? `<div><div class="cam-spec-label">Audio</div><div class="cam-spec-value">${esc(c.audio)}</div></div>` : ''}`;
}

function renderCameras(cameras) {
  if (!cameras || cameras.length === 0) return '';
  const typeLabels = { camera: 'Video', audio: 'Audio', photo: 'Photo', misc: 'Misc Source' };
  return `<div class="section">
    <div class="section-header">Media Sources</div>
    <div class="camera-cards">
      ${cameras.map(c => {
        const brand = detectBrand(c.camera_name);
        const type = c.source_type || 'camera';
        const badgeHtml = `<span class="cam-label type-${type}">${typeLabels[type]}</span>`;
        return `<div class="camera-card">
        ${brand && BRAND_SVGS[brand] ? `<img class="brand-logo" src="${BRAND_SVGS[brand]}" alt="">` : ''}
        <h3>${esc(c.camera_name)} ${c.label ? `<span class="cam-label">${esc(c.label)}</span>` : ''} ${badgeHtml}</h3>
        <div class="cam-specs">${renderSourceSpecs(c)}</div>
        ${c.notes ? `<div style="margin-top:8px;font-size:12px;color:var(--text-dim)">${esc(c.notes)}</div>` : ''}
      </div>`; }).join('')}
    </div>
  </div>`;
}

function renderRollsTable(rolls, totals) {
  if (!rolls || rolls.length === 0) return '';
  return `<div class="section">
    <div class="section-header">Card Offloads</div>
    <div class="table-scroll"><table>
      <tr><th>Roll</th><th>Card Serial</th><th style="text-align:right">GB</th><th>Duration</th><th style="text-align:center">Master</th><th style="text-align:center">Backup</th><th>Notes</th></tr>
      ${rolls.map(r => `<tr>
          <td class="mono" style="font-weight:600">${esc(r.roll_name)}</td>
          <td class="mono" style="color:var(--text-dim)">${esc(r.card_serial)}</td>
          <td class="mono" style="text-align:right">${fmtNum(r.gb)}</td>
          <td class="mono">${esc(r.duration_tc)}</td>
          <td style="text-align:center">${statusBadge(r.master)}</td>
          <td style="text-align:center">${statusBadge(r.backup)}</td>
          <td style="color:var(--text-dim);font-size:12px;max-width:200px">${esc(r.notes)}</td>
        </tr>`).join('')}
      <tr class="summary-row">
        <td>Total</td><td></td>
        <td class="mono" style="text-align:right">${fmtSize(totals.gb)}</td>
        <td class="mono">${totals.duration}</td>
        <td></td><td></td>
        <td></td>
      </tr>
    </table></div>
  </div>`;
}

function renderDataBySource(rolls, cameras) {
  if (!rolls || !rolls.some(r => r.camera_id != null)) return '';
  const camMap = new Map((cameras || []).map(c => [c.id, c]));
  const groups = new Map();
  for (const r of rolls) {
    const key = r.camera_id != null ? r.camera_id : 'unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const rows = [];
  for (const [key, list] of groups) {
    if (key === 'unassigned') continue;
    const cam = camMap.get(key);
    const label = cam ? (cam.label || cam.camera_name) : 'Unknown Source';
    rows.push({
      label,
      count: list.length,
      gb: list.reduce((s, r) => s + (r.gb || 0), 0),
      duration: sumTC(list.map(r => r.duration_tc))
    });
  }
  if (groups.has('unassigned')) {
    const list = groups.get('unassigned');
    rows.push({
      label: 'Unassigned',
      count: list.length,
      gb: list.reduce((s, r) => s + (r.gb || 0), 0),
      duration: sumTC(list.map(r => r.duration_tc))
    });
  }
  return `<div class="section">
    <div class="section-header">Data by source</div>
    <div class="table-scroll"><table>
      <tr><th>Source</th><th style="text-align:right">Rolls</th><th style="text-align:right">Data</th><th>Duration</th></tr>
      ${rows.map(row => `<tr>
        <td style="font-weight:600">${esc(row.label)}</td>
        <td class="mono" style="text-align:right">${row.count}</td>
        <td class="mono" style="text-align:right">${fmtSize(row.gb)}</td>
        <td class="mono">${row.duration}</td>
      </tr>`).join('')}
    </table></div>
  </div>`;
}

function getMaxBenchmark(days) {
  let max = 0;
  for (const d of days) {
    for (const b of (d.benchmarks || [])) {
      max = Math.max(max, b.write_speed || 0, b.read_speed || 0);
    }
  }
  return max;
}

// ===== STANDALONE HTML EXPORT (interactive, with tabs/themes) =====

function renderStandaloneHTML(project) {
  // Transform data to match the frontend JS format
  const maxBench = getMaxBenchmark(project.days);
  const daysData = project.days.map(d => ({
    date: d.date,
    label: `Day ${String(d.day_number).padStart(2, '0')}`,
    dateFormatted: formatDate(d.date),
    benchmarks: d.benchmarks.map(b => ({
      name: b.drive_name, write: b.write_speed, read: b.read_speed,
      capacity: b.capacity, format: b.format, notes: b.notes
    })),
    cameras: d.cameras.map(c => ({
      id: c.id, type: c.source_type || 'camera', name: c.camera_name, res: c.resolution, codec: c.codec,
      colorspace: c.colorspace, gamma: c.gamma || '', lut: c.lut, fps: c.fps, audio: c.audio, label: c.label
    })),
    rolls: d.rolls.map(r => ({
      roll: r.roll_name, serial: r.card_serial, gb: r.gb,
      duration: r.duration_tc, master: !!r.master, backup: !!r.backup,
      notes: r.notes, camera_id: r.camera_id
    })),
    totals: d.totals
  }));

  const dates = project.days.map(d => d.date).filter(Boolean).sort();
  const dateRange = dates.length > 1
    ? `${shortDate(dates[0])}&ndash;${shortDate(dates[dates.length - 1])}, ${new Date(dates[0]+'T00:00:00').getFullYear()}`
    : dates.length === 1 ? formatDate(dates[0]) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(project.title)} - DIT Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&display=swap" rel="stylesheet">
<style>${REPORT_CSS}</style>
<script>
(function(){
  var t;
  try { t = localStorage.getItem('dit-report-theme'); } catch(e) {}
  if (t !== 'theme-light' && t !== 'theme-film') t = 'theme-film'; // dark by default; explicit choice persists
  document.documentElement.classList.add(t);
})();
</script>
</head>
<body>
<div class="container">
  ${renderMasthead(project, `<button class="theme-toggle" id="themeToggle" aria-label="Switch theme" title="Switch theme">
      <svg class="icon-moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8.7A6 6 0 1 1 7.3 2 4.7 4.7 0 0 0 14 8.7z"/></svg>
      <svg class="icon-sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3.5"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4l-1.1-1.1"/></svg>
    </button>`)}
  ${renderHeaderHTML(project)}
  ${renderStatsBar(project.totals)}
  <div class="day-tabs" role="tablist" aria-label="Report days">
    <button class="day-tab active" data-day="overview" role="tab" aria-selected="true" aria-controls="content">Overview</button>
    ${project.days.map((d, i) => `<button class="day-tab" data-day="${i}" role="tab" aria-selected="false" aria-controls="content">Day ${String(d.day_number).padStart(2, '0')} &mdash; ${shortDate(d.date)}</button>`).join('')}
  </div>
  <div id="content" role="tabpanel"></div>
  <div class="report-footer">
    Generated with <a href="https://github.com/joshrogers117/dit-report" target="_blank">DIT Report Manager</a> v0.5-beta by <a href="https://github.com/joshrogers117" target="_blank">Josh Rogers</a><br>
    Created by Ridge Studios
  </div>
</div>
<script>
const DAYS = ${JSON.stringify(daysData)};
const BRAND_SVGS = ${JSON.stringify(BRAND_SVGS)};
let currentDay = "overview";
function bindAll(sel, fn) { document.querySelectorAll(sel).forEach(function(el){ el.addEventListener("click", function(e){e.preventDefault();fn(el,e);}); }); }
function themeToggleLabel() {
  var dark = document.documentElement.classList.contains("theme-film");
  var btn = document.getElementById("themeToggle");
  var label = dark ? "Switch to light theme" : "Switch to dark theme";
  btn.setAttribute("aria-label", label); btn.setAttribute("title", label);
}
themeToggleLabel();
document.getElementById("themeToggle").addEventListener("click", function() {
  var el = document.documentElement;
  var next = el.classList.contains("theme-film") ? "theme-light" : "theme-film";
  el.classList.remove("theme-light", "theme-film");
  el.classList.add(next);
  try { localStorage.setItem("dit-report-theme", next); } catch(e) {}
  themeToggleLabel();
});
function selectTab(tab) {
  currentDay = tab.dataset.day;
  document.querySelectorAll(".day-tab").forEach(function(t){
    t.classList.toggle("active", t === tab);
    t.setAttribute("aria-selected", t === tab ? "true" : "false");
  });
  render();
}
bindAll(".day-tab", selectTab);
document.querySelector(".day-tabs").addEventListener("keydown", function(e) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  var tabs = [...document.querySelectorAll(".day-tab")];
  var i = tabs.indexOf(document.activeElement);
  if (i === -1) return;
  e.preventDefault();
  var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
  next.focus(); selectTab(next);
});
function maxBenchmark() { let m=0; DAYS.forEach(d=>d.benchmarks.forEach(b=>{m=Math.max(m,b.write,b.read)})); return m; }
function fmtSize(gb) { gb=Number(gb)||0; return gb>=1000 ? (gb/1000).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+' TB' : gb.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+' GB'; }
function sumTC(tcs) { let h=0,m=0,s=0,f=0; (tcs||[]).forEach(tc=>{ if(!tc) return; const p=tc.split(':').map(Number); h+=p[0]||0; m+=p[1]||0; s+=p[2]||0; f+=p[3]||0; }); s+=Math.floor(f/24); f=f%24; m+=Math.floor(s/60); s=s%60; h+=Math.floor(m/60); m=m%60; const pad=n=>String(n).padStart(2,'0'); return pad(h)+':'+pad(m)+':'+pad(s)+':'+pad(f); }
function statusBadge(v) { if(v===true) return '<span class="check">&#10003;</span>'; if(v===false) return '<span class="cross">&#10005;</span>'; return '<span style="color:var(--text-dim)">&mdash;</span>'; }
function renderBenchmarks(bm) { const mx=maxBenchmark(); return '<div class="section"><div class="section-header">Drive Benchmarks</div><div class="table-scroll"><table><tr><th>Drive</th><th>Write (MB/s)</th><th>Read (MB/s)</th><th>Capacity</th><th>Format</th><th>Notes</th></tr>'+bm.map(b=>'<tr><td class="mono" style="font-weight:600">'+b.name+'</td><td><div class="bench-bar-container"><span class="mono">'+b.write.toLocaleString()+'</span><div class="bench-bar"><div class="bench-bar-fill write" style="width:'+(b.write/mx*100).toFixed(1)+'%"></div></div></div></td><td><div class="bench-bar-container"><span class="mono">'+b.read.toLocaleString()+'</span><div class="bench-bar"><div class="bench-bar-fill read" style="width:'+(b.read/mx*100).toFixed(1)+'%"></div></div></div></td><td>'+b.capacity+'</td><td class="mono">'+b.format+'</td><td style="color:var(--text-dim);font-size:12px">'+b.notes+'</td></tr>').join('')+'</table></div><div style="padding:8px 16px;font-size:10px;color:var(--text-dim)"><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Write <span style="display:inline-block;width:8px;height:8px;background:var(--accent2);border-radius:2px;margin-left:12px;margin-right:4px;vertical-align:middle"></span>Read &mdash; bars show relative speed across all drives</div></div>'; }
function detectBrandStandalone(name) { var n=(name||"").toUpperCase(); var brands={red:["V-RAPTOR","KOMODO","RED ONE","EPIC-X","EPIC-W","EPIC-M","SCARLET-W","SCARLET-X","RAVEN","WEAPON","MONSTRO","HELIUM","GEMINI","DRAGON","RANGER","DSMC","RED EPIC","RED SCARLET","RED RAVEN","RED RANGER","KOMODO-X"],arri:["ALEXA","AMIRA","ARRICAM","ARRIFLEX"],blackmagic:["URSA","BMPCC","PYXIS","POCKET CINEMA","MICRO CINEMA","BLACKMAGIC"],sony:["VENICE","BURANO","FX3","FX30","FX6","FX9","FR7","A7S","A7R","A7C","A7 IV","A7IV","A9 ","A1 ","F5 ","F55","F65","FS5","FS7","FS100","FS700","CINEALTA","HDW-F"],canon:["C70","C80","C100","C200","C300","C400","C500","C700","R5 C","R5C","EOS C","CINEMA EOS","1D C","1DC"],dji:["RONIN","ZENMUSE","INSPIRE","MAVIC","OSMO","AVATA","AIR 2S","MINI 3","MINI 4","DJI ACTION"],nikon:["NIKON Z","Z5","Z6","Z7","Z8","Z9","Z30","Z50"," ZR"," ZF"," ZFC"],apple:["IPHONE","IPAD"]}; for(var k in brands){if(brands[k].some(function(kw){return n.indexOf(kw)>=0}))return k;} return null; }
function renderCameras(cams) { var typeLabels={camera:"Video",audio:"Audio",photo:"Photo",misc:"Misc Source"}; return '<div class="section"><div class="section-header">Media Sources</div><div class="camera-cards">'+cams.map(function(c){ var type=c.type||"camera"; var brand=detectBrandStandalone(c.name); var brandHtml=(brand&&BRAND_SVGS[brand])?'<img class="brand-logo" src="'+BRAND_SVGS[brand]+'" alt="">':''; var specs=''; if(type==="audio"){specs='<div><div class="cam-spec-label">Sample Rate</div><div class="cam-spec-value mono">'+c.res+'</div></div><div><div class="cam-spec-label">Bit Depth</div><div class="cam-spec-value mono">'+c.codec+'</div></div><div><div class="cam-spec-label">Channels</div><div class="cam-spec-value">'+c.fps+'</div></div>';} else if(type==="photo"){specs='<div><div class="cam-spec-label">Format</div><div class="cam-spec-value mono">'+c.codec+'</div></div>';} else if(type==="misc"){specs='<div><div class="cam-spec-label">Resolution</div><div class="cam-spec-value">'+c.res+'</div></div><div><div class="cam-spec-label">Codec</div><div class="cam-spec-value mono">'+c.codec+'</div></div>';} else{specs='<div><div class="cam-spec-label">Resolution</div><div class="cam-spec-value">'+c.res+'</div></div><div><div class="cam-spec-label">Codec</div><div class="cam-spec-value mono">'+c.codec+'</div></div><div><div class="cam-spec-label">Colorspace</div><div class="cam-spec-value mono">'+c.colorspace+'</div></div><div><div class="cam-spec-label">LUT</div><div class="cam-spec-value mono">'+c.lut+'</div></div><div><div class="cam-spec-label">FPS</div><div class="cam-spec-value">'+c.fps+'</div></div>'+(c.audio?'<div><div class="cam-spec-label">Audio</div><div class="cam-spec-value">'+c.audio+'</div></div>':'');} var badge='<span class="cam-label type-'+type+'">'+typeLabels[type]+'</span>'; return '<div class="camera-card">'+brandHtml+'<h3>'+c.name+(c.label?' <span class="cam-label">'+c.label+'</span>':'')+' '+badge+'</h3><div class="cam-specs">'+specs+'</div></div>';}).join('')+'</div></div>'; }
function renderRollsTable(rolls,totals) { return '<div class="section"><div class="section-header">Card Offloads</div><div class="table-scroll"><table><tr><th>Roll</th><th>Card Serial</th><th style="text-align:right">GB</th><th>Duration</th><th style="text-align:center">Master</th><th style="text-align:center">Backup</th><th>Notes</th></tr>'+rolls.map(r=>'<tr><td class="mono" style="font-weight:600">'+r.roll+'</td><td class="mono" style="color:var(--text-dim)">'+r.serial+'</td><td class="mono" style="text-align:right">'+r.gb.toLocaleString(undefined,{minimumFractionDigits:2})+'</td><td class="mono">'+r.duration+'</td><td style="text-align:center">'+statusBadge(r.master)+'</td><td style="text-align:center">'+statusBadge(r.backup)+'</td><td style="color:var(--text-dim);font-size:12px;max-width:200px">'+r.notes+'</td></tr>').join('')+'<tr class="summary-row"><td>Total</td><td></td><td class="mono" style="text-align:right">'+fmtSize(totals.gb)+'</td><td class="mono">'+totals.duration+'</td><td></td><td></td><td></td></tr></table></div></div>'; }
function renderDataBySource(rolls,cameras) { if(!rolls.some(r=>r.camera_id!=null)) return ''; const camMap={}; (cameras||[]).forEach(c=>{camMap[c.id]=c;}); const groups={}; const order=[]; rolls.forEach(r=>{ const key=r.camera_id!=null?r.camera_id:'unassigned'; if(!groups[key]){groups[key]=[]; order.push(key);} groups[key].push(r); }); const rows=[]; order.forEach(key=>{ if(key==='unassigned') return; const list=groups[key]; const cam=camMap[key]; const label=cam?(cam.label||cam.name):'Unknown Source'; rows.push({label,count:list.length,gb:list.reduce((s,r)=>s+(r.gb||0),0),duration:sumTC(list.map(r=>r.duration))}); }); if(groups['unassigned']){ const list=groups['unassigned']; rows.push({label:'Unassigned',count:list.length,gb:list.reduce((s,r)=>s+(r.gb||0),0),duration:sumTC(list.map(r=>r.duration))}); } return '<div class="section"><div class="section-header">Data by source</div><div class="table-scroll"><table><tr><th>Source</th><th style="text-align:right">Rolls</th><th style="text-align:right">Data</th><th>Duration</th></tr>'+rows.map(row=>'<tr><td style="font-weight:600">'+row.label+'</td><td class="mono" style="text-align:right">'+row.count+'</td><td class="mono" style="text-align:right">'+fmtSize(row.gb)+'</td><td class="mono">'+row.duration+'</td></tr>').join('')+'</table></div></div>'; }
function daySourceSums(d) {
  var byId = {}; d.cameras.forEach(function(c){ byId[c.id] = c.label || c.name || 'Source'; });
  var sums = new Map();
  d.rolls.forEach(function(r){
    var k = (r.camera_id != null && byId[r.camera_id]) ? byId[r.camera_id] : 'Unassigned';
    sums.set(k, (sums.get(k) || 0) + (Number(r.gb) || 0));
  });
  return sums;
}
// Stable color per source across every day on the page
// A/B/C/D cameras take their tape-convention slots (red/blue/yellow/green);
// everything else (sound, photo, unassigned) cycles the remaining slots.
function convSlot(k) {
  var m = /^([A-D])[ _-]?CAM/i.exec(k) || /^CAM[ _-]?([A-D])$/i.exec(k) || /^([A-D])$/i.exec(k);
  return m ? { A: 1, B: 2, C: 3, D: 4 }[m[1].toUpperCase()] : 0;
}
var SRC_COLOR = (function(){ var m = new Map(); var next = 5; DAYS.forEach(function(d){ daySourceSums(d).forEach(function(v, k){ if (m.has(k)) return; var s = convSlot(k); if (!s) { s = next; next = next === 8 ? 5 : next + 1; } m.set(k, s); }); }); return m; })();
function renderOverview() { return '<div class="all-days-grid" id="overviewGrid">'+DAYS.map(function(d, i){
  var sums = daySourceSums(d);
  var total = 0; sums.forEach(function(v){ total += v; });
  var bar = '', legend = '';
  if (total > 0 && sums.size) {
    sums.forEach(function(gb, k){
      if (gb <= 0) return;
      var col = 'var(--chart-' + SRC_COLOR.get(k) + ')';
      bar += '<span style="width:' + (gb / total * 100).toFixed(2) + '%;background:' + col + '"></span>';
      legend += '<span><span class="dot" style="background:' + col + '"></span>' + k + ' <b>' + fmtSize(gb) + '</b></span>';
    });
    bar = '<div class="day-source-bar">' + bar + '</div><div class="day-legend">' + legend + '</div>';
  }
  var n = d.rolls.length;
  var ok = d.rolls.filter(function(r){ return r.master && r.backup; }).length;
  var verify = n === 0 ? '' : (ok === n
    ? '<div class="day-verify ok">&#10003; All ' + n + ' rolls verified &middot; master + backup</div>'
    : '<div class="day-verify warn">' + (n - ok) + ' of ' + n + ' rolls missing a verified copy</div>');
  return '<div class="day-summary-card" data-goto-day="'+i+'" role="button" tabindex="0" aria-label="Open '+d.label+'"><h2>'+d.label+'</h2><div class="day-date">'+d.dateFormatted+'</div><div class="day-stats"><div><div class="day-stat-label">Data</div><div class="day-stat-value">'+fmtSize(d.totals.gb)+'</div></div><div><div class="day-stat-label">Duration</div><div class="day-stat-value">'+d.totals.duration.substring(0,8)+'</div></div><div><div class="day-stat-label">Rolls</div><div class="day-stat-value">'+n+'</div></div></div>'+bar+verify+'<div style="margin-top:12px;font-size:12px;color:var(--text-dim)">Drives: '+d.benchmarks.map(function(b){return b.name}).join(", ")+' &bull; '+d.cameras.length+' sources</div></div>';
}).join('')+'</div>'; }
function renderDay(i) { const d=DAYS[i]; const r=renderRollsTable(d.rolls,d.totals); return '<div style="margin-bottom:16px"><h2 style="font-size:20px;font-weight:600;letter-spacing:-0.022em">'+d.label+' &mdash; '+d.dateFormatted+'</h2><div style="color:var(--text-dim);font-size:13px;margin-top:4px">'+fmtSize(d.totals.gb)+' &bull; '+d.totals.duration+' &bull; '+d.rolls.length+' rolls</div></div>'+renderBenchmarks(d.benchmarks)+renderCameras(d.cameras)+r+renderDataBySource(d.rolls,d.cameras); }
function render() {
  var el=document.getElementById("content");
  el.innerHTML = currentDay==="overview"
    ? (DAYS.length ? renderOverview() : '<div class="overview-empty">No shoot days logged yet.</div>')
    : renderDay(parseInt(currentDay));
  function gotoDay(card) {
    var idx=parseInt(card.dataset.gotoDay);
    var tabs=document.querySelectorAll(".day-tab");
    if(tabs[idx+1]) selectTab(tabs[idx+1]);
  }
  document.querySelectorAll("[data-goto-day]").forEach(function(card) {
    card.addEventListener("click", function(e) { e.preventDefault(); gotoDay(card); });
    card.addEventListener("keydown", function(e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault(); gotoDay(card);
    });
  });
}
render();
</script>
</body>
</html>`;
}

// ===== PRINT HTML (for PDF — all days sequential, no tabs) =====

function renderPrintHTML(project) {
  const maxBench = getMaxBenchmark(project.days);
  const cumulative = computeCumulativeTotals(project.days.map(d => d.totals));

  let daysHTML = project.days.map((d, i) => {
    const cum = cumulative[i];
    return `<div class="day-section">
      <div class="day-divider">
        <h2 style="font-size:20px;font-weight:600;letter-spacing:-0.022em">Day ${String(d.day_number).padStart(2, '0')} &mdash; ${formatDate(d.date)}</h2>
        <div style="color:var(--text-dim);font-size:13px;margin-top:4px">
          ${fmtSize(d.totals.gb)} &bull; ${d.totals.duration} &bull; ${d.totals.rollCount} rolls
        </div>
      </div>
      ${renderBenchmarks(d.benchmarks, maxBench)}
      ${renderCameras(d.cameras)}
      ${renderRollsTable(d.rolls, d.totals)}
      ${renderDataBySource(d.rolls, d.cameras)}
      <div class="cumulative-bar">
        <div><div class="cum-label">Cumulative Data</div><div class="cum-value">${fmtSize(cum.gb)}</div></div>
        <div><div class="cum-label">Cumulative Duration</div><div class="cum-value">${cum.duration}</div></div>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en" class="theme-film">
<head>
<meta charset="UTF-8">
<title>${esc(project.title)} - DIT Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&display=swap" rel="stylesheet">
<style>${REPORT_CSS}${PRINT_EXTRA_CSS}</style>
</head>
<body>
<div class="container">
  ${renderMasthead(project)}
  ${renderHeaderHTML(project)}
  ${renderStatsBar(project.totals)}
  ${daysHTML}
  <div class="report-footer">
    Generated with <a href="https://github.com/joshrogers117/dit-report" target="_blank">DIT Report Manager</a> v0.5-beta by <a href="https://github.com/joshrogers117" target="_blank">Josh Rogers</a><br>
    Created by Ridge Studios
  </div>
</div>
</body>
</html>`;
}

export { renderStandaloneHTML, renderPrintHTML };
