#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const wabtPromise = require('wabt')();
const lexer = require('./src/lexer');
const parser = require('./src/parser');
const generator = require('./src/generator');

async function compileAndSave(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  
  try {
    const tokens = lexer(source);
    const ast = parser(tokens);
    const wat = generator(ast);
    
    // Save .wat for debugging
    const watPath = filePath.replace('.vibe', '.wat');
    fs.writeFileSync(watPath, wat);
    console.log(`Generated WAT at ${watPath}`);

    const wabt = await wabtPromise;
    const wasmModule = wabt.parseWat(path.basename(watPath), wat);
    wasmModule.resolveNames();
    wasmModule.validate();
    
    const binaryOutput = wasmModule.toBinary({ log: true, write_debug_names: true });
    
    const wasmPath = filePath.replace('.vibe', '.wasm');
    fs.writeFileSync(wasmPath, binaryOutput.buffer);
    console.log(`Successfully compiled to WebAssembly binary at ${wasmPath}`);

  } catch (e) {
    console.error('Compiler Error:', e.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: vibec <file.vibe>');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
compileAndSave(filePath);
