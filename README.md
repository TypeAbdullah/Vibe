# ⚡ Vibe Programming Language

**Vibe** is a high-performance, words-first, compiled programming language designed specifically for modern web development. 

Unlike transpiled wrapper languages, Vibe compiles directly into **native WebAssembly (`.wasm`)** binaries. By bypassing JavaScript entirely, it achieves near-native performance while offering a clean, human-readable "words-first" syntax.

## Key Features
- 🚀 **100% Native WebAssembly**: Compiles straight to Wasm bytecode, executing at near-native speeds.
- 🗣️ **Words-First Syntax**: No brackets `{}` or parentheses `()` needed for control flow. It reads like natural English.
- 📦 **Linear Memory Management**: Built-in stack and heap memory with a native bump-allocator (`malloc`) for dynamic string operations.
- 🌐 **Web DOM Binding**: Seamless DOM interaction directly from Wasm via the lightweight Vibe JavaScript runtime bridge.

---

## Language Syntax Guide

### 1. Variables
Use `create variable <name> as <expression>` to declare variables.
```vibe
create variable count as 0
create variable message as "Vibe is fast!"
```

### 2. Operators & Math
Standard math and boolean comparisons are supported.
```vibe
create variable x as 5 + 3 * 2
create variable is_equal as x == 11
```

### 3. Conditionals
Structure logic naturally with `if ... then ... else ... end`.
```vibe
if count > 10 then
  show "Count is large"
else
  show "Count is small"
end
```

### 4. Loops
Use `loop <expr> times ... end` to repeat actions.
```vibe
loop 10 times
  add 1 to count
end
```

### 5. Functions
Define reusable blocks using `define function ... [with params] as ... end`.
```vibe
define function multiply with x, y as
  return x * y
end
```

### 6. DOM Updates
Directly bind logic to screen elements.
```vibe
set element "my-title" text to "Hello World!"
```

---

## Getting Started

### 1. Install Dependencies
Make sure you have Node.js installed, then clone the project and install dependencies:
```bash
npm install
```

### 2. Compile Vibe Code
Compile any `.vibe` source file using the Vibe compiler CLI (`vibec.js`):
```bash
node vibec.js calculator.vibe
```
This compiles the code into:
- `calculator.wat`: The readable WebAssembly Text format representation of your code.
- `calculator.wasm`: The binary WebAssembly format executed by the browser/Node VM.

### 3. Run the Development Server
Launch the development server to run it in your browser:
```bash
npm start
```
This starts the server on port **3067** (the default Vibe port). Navigate to [http://localhost:3067/calculator.html](http://localhost:3067/calculator.html) to interact with the Wasm-powered calculator!

### 4. Command Line Runner (Node.js)
You can also run Vibe Wasm files directly inside Node.js using our runtime script:
```bash
node run_wasm.js
```
