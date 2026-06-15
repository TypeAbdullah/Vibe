const fs = require('fs');
const wabtPromise = require('wabt')();
const lexer = require('./src/lexer');
const parser = require('./src/parser');
const generator = require('./src/generator');

module.exports = function vibePlugin() {
  return {
    name: 'vite-plugin-vibe',
    async transform(code, id) {
      if (id.endsWith('.vibe')) {
        try {
          const tokens = lexer(code);
          const ast = parser(tokens);
          const wat = generator(ast);

          const wabt = await wabtPromise;
          const wasmModule = wabt.parseWat(id, wat);
          wasmModule.resolveNames();
          wasmModule.validate();
          
          const { buffer } = wasmModule.toBinary({});
          const base64Wasm = Buffer.from(buffer).toString('base64');

          // Extract all custom functions to generate named exports
          const exportedFuncs = ast.body
            .filter(n => n.type === 'FunctionDeclaration')
            .map(n => n.name);

          // We also export $main
          exportedFuncs.push('main');

          const runtimeInlined = `
function createVibeRuntime() {
  let wasmInstance = null;
  function getString(ptr) {
    const memory = wasmInstance.exports.memory;
    const bytes = new Uint8Array(memory.buffer);
    let len = 0;
    while (bytes[ptr + len] !== 0) len++;
    const strBytes = new Uint8Array(memory.buffer, ptr, len);
    return new TextDecoder().decode(strBytes);
  }
  function writeString(str) {
    const memory = wasmInstance.exports.memory;
    const malloc = wasmInstance.exports.malloc;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    const ptr = malloc(encoded.length + 1);
    const bytes = new Uint8Array(memory.buffer);
    bytes.set(encoded, ptr);
    bytes[ptr + encoded.length] = 0;
    return ptr;
  }
  const env = {
    print_string: (ptr) => console.log(getString(ptr)),
    print_int: (val) => console.log(val),
    set_element_text: (id_ptr, text_ptr) => {
      const id = getString(id_ptr);
      const text = getString(text_ptr);
      if (typeof document !== 'undefined') {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
      }
    },
    set_element_int: (id_ptr, val) => {
      const id = getString(id_ptr);
      if (typeof document !== 'undefined') {
        const element = document.getElementById(id);
        if (element) element.textContent = String(val);
      }
    },
    concat_string_int: (str_ptr, val) => {
      const str = getString(str_ptr);
      return writeString(str + val);
    },
    concat_int_string: (val, str_ptr) => {
      const str = getString(str_ptr);
      return writeString(val + str);
    },
    concat_string_string: (str1_ptr, str2_ptr) => {
      const str1 = getString(str1_ptr);
      const str2 = getString(str2_ptr);
      return writeString(str1 + str2);
    }
  };
  return {
    imports: { env },
    setInstance: (instance) => { wasmInstance = instance; },
    getString,
    writeString
  };
}
`;

          const namedExportsJs = exportedFuncs.map(name => `
export const ${name} = (...args) => {
  if (wasmInstance) {
    return wasmInstance.exports.${name}(...args);
  }
  return wasmPromise.then(exports => exports.${name}(...args));
};
`).join('\n');

          const transformedCode = `
${runtimeInlined}

const wasmBase64 = "${base64Wasm}";
const binary = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));

const runtime = createVibeRuntime();
let wasmInstance = null;

export const wasmPromise = WebAssembly.instantiate(binary, runtime.imports)
  .then(results => {
    wasmInstance = results.instance;
    runtime.setInstance(wasmInstance);
    return wasmInstance.exports;
  });

${namedExportsJs}
`;

          return {
            code: transformedCode,
            map: null
          };

        } catch (e) {
          this.error(`Vibe Compilation Error in ${id}: ${e.message}`);
        }
      }
    }
  };
};
