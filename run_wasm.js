const fs = require('fs');
const createVibeRuntime = require('./vibe-runtime');

const bytes = fs.readFileSync('test.wasm');
const runtime = createVibeRuntime();

WebAssembly.instantiate(bytes, runtime.imports).then(results => {
  runtime.setInstance(results.instance);
  
  console.log('[Running compiled Vibe program in Node.js runtime...]');
  results.instance.exports.main();
}).catch(console.error);
