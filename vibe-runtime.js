// The Vibe WebAssembly Runtime Library
function createVibeRuntime() {
  let wasmInstance = null;

  function getString(ptr) {
    const memory = wasmInstance.exports.memory;
    const bytes = new Uint8Array(memory.buffer);
    let len = 0;
    while (bytes[ptr + len] !== 0) {
      len++;
    }
    const strBytes = new Uint8Array(memory.buffer, ptr, len);
    return new TextDecoder().decode(strBytes);
  }

  function writeString(str) {
    const memory = wasmInstance.exports.memory;
    const malloc = wasmInstance.exports.malloc;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    
    // Allocate space including null terminator
    const ptr = malloc(encoded.length + 1);
    const bytes = new Uint8Array(memory.buffer);
    bytes.set(encoded, ptr);
    bytes[ptr + encoded.length] = 0; // null terminator
    return ptr;
  }

  const env = {
    print_string: (ptr) => {
      console.log(getString(ptr));
    },
    print_int: (val) => {
      console.log(val);
    },
    set_element_text: (id_ptr, text_ptr) => {
      const id = getString(id_ptr);
      const text = getString(text_ptr);
      if (typeof document !== 'undefined') {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = text;
        } else {
          console.warn(`Vibe Runtime: Element with id "${id}" not found.`);
        }
      } else {
        console.log(`[DOM Sim] Set element "${id}" text to: "${text}"`);
      }
    },
    set_element_int: (id_ptr, val) => {
      const id = getString(id_ptr);
      if (typeof document !== 'undefined') {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = String(val);
        } else {
          console.warn(`Vibe Runtime: Element with id "${id}" not found.`);
        }
      } else {
        console.log(`[DOM Sim] Set element "${id}" text to: ${val}`);
      }
    },
    concat_string_int: (str_ptr, val) => {
      const str = getString(str_ptr);
      const res = str + val;
      return writeString(res);
    },
    concat_int_string: (val, str_ptr) => {
      const str = getString(str_ptr);
      const res = val + str;
      return writeString(res);
    },
    concat_string_string: (str1_ptr, str2_ptr) => {
      const str1 = getString(str1_ptr);
      const str2 = getString(str2_ptr);
      const res = str1 + str2;
      return writeString(res);
    }
  };

  return {
    imports: { env },
    setInstance: (instance) => {
      wasmInstance = instance;
    },
    getString,
    writeString
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = createVibeRuntime;
}
