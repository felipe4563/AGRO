#!/usr/bin/env node
// Punto de entrada: node grabar.cjs <guion> [ensayo]
//   node grabar.cjs 02-ventas            → graba el video de verdad
//   node grabar.cjs 02-ventas ensayo      → no graba video, saca capturas en ensayo/
const path = require('path');
const { grabar } = require('./motor.cjs');

const [, , nombreGuion, modo] = process.argv;

if (!nombreGuion) {
  console.error('Uso: node grabar.cjs <guion> [ensayo]');
  process.exit(1);
}

const rutaGuion = path.join(__dirname, 'guiones', nombreGuion.replace(/\.cjs$/, '') + '.cjs');
const guion = require(rutaGuion);

grabar(guion, { ensayo: modo === 'ensayo' }).catch((err) => {
  console.error('[grabar] Error:', err);
  process.exit(1);
});
