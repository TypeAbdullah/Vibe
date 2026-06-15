let loopCounter = 0;
let stringOffset = 1024;
const stringLiterals = [];

function registerString(str) {
  let existing = stringLiterals.find(s => s.value === str);
  if (existing) return existing.address;
  let address = stringOffset;
  stringLiterals.push({ value: str, address });
  stringOffset += Buffer.byteLength(str, 'utf8') + 1; // +1 for null terminator
  return address;
}

function generator(ast) {
  loopCounter = 0;
  stringOffset = 1024;
  stringLiterals.length = 0;

  // First pass: Traverse AST to collect all string literals
  function collectStrings(node) {
    if (!node) return;
    if (node.type === 'StringLiteral') {
      registerString(node.value);
    }
    for (let key in node) {
      if (node[key] && typeof node[key] === 'object') {
        collectStrings(node[key]);
      }
    }
  }
  collectStrings(ast);

  const globals = new Set();
  const functions = [];
  const mainStatements = [];

  // Track types to know if we need to show int or string
  // name -> 'int' | 'string'
  const varTypes = {};
  const funcTypes = {};

  // Register helper functions if any
  funcTypes['increment'] = 'int';

  function getType(node, currentLocals) {
    if (!node) return 'int';
    if (node.type === 'NumberLiteral') return 'int';
    if (node.type === 'StringLiteral') return 'string';
    if (node.type === 'Identifier') {
      if (currentLocals && currentLocals.has(node.name)) {
        return currentLocals.get(node.name);
      }
      return varTypes[node.name] || 'int';
    }
    if (node.type === 'BinaryExpression') {
      let leftType = getType(node.left, currentLocals);
      let rightType = getType(node.right, currentLocals);
      if (leftType === 'string' || rightType === 'string') {
        return 'string';
      }
      return 'int';
    }
    if (node.type === 'CallExpression') {
      return funcTypes[node.callee] || 'int';
    }
    return 'int';
  }

  function generateNode(node, currentLocals, isRoot) {
    switch (node.type) {
      case 'VariableDeclaration': {
        const type = getType(node.value, currentLocals);
        if (isRoot) {
          globals.add(node.name);
          varTypes[node.name] = type;
          return `    ${generateNode(node.value, currentLocals, false)}\n    global.set $${node.name}`;
        } else {
          currentLocals.set(node.name, type);
          return `    ${generateNode(node.value, currentLocals, false)}\n    local.set $${node.name}`;
        }
      }

      case 'Assignment': {
        if (isRoot || !currentLocals.has(node.name)) {
          return `    ${generateNode(node.value, currentLocals, false)}\n    global.set $${node.name}`;
        } else {
          return `    ${generateNode(node.value, currentLocals, false)}\n    local.set $${node.name}`;
        }
      }

      case 'PrintStatement': {
        const type = getType(node.value, currentLocals);
        const code = generateNode(node.value, currentLocals, false);
        if (type === 'string') {
          return `    ${code}\n    call $print_string`;
        } else {
          return `    ${code}\n    call $print_int`;
        }
      }

      case 'ReturnStatement': {
        return `    ${generateNode(node.value, currentLocals, false)}\n    return`;
      }

      case 'IfStatement': {
        let cond = generateNode(node.test, currentLocals, false);
        let cons = node.consequent.map(n => generateNode(n, currentLocals, false)).join('\n');
        let alt = node.alternate.map(n => generateNode(n, currentLocals, false)).join('\n');
        
        return `    ${cond}
    (if
      (then
${cons}
      )
      (else
${alt}
      )
    )`;
      }

      case 'LoopStatement': {
        let countExpr = generateNode(node.count, currentLocals, false);
        let loopId = loopCounter++;
        let cName = `$loop_counter_${loopId}`;
        
        if (isRoot) {
          globals.add(cName.replace('$', ''));
        } else {
          currentLocals.set(cName.replace('$', ''), 'int');
        }

        let lStart = `$loop_start_${loopId}`;
        let lEnd = `$loop_end_${loopId}`;
        let body = node.body.map(n => generateNode(n, currentLocals, false)).join('\n');

        const setCounter = isRoot ? `global.set ${cName}` : `local.set ${cName}`;
        const getCounter = isRoot ? `global.get ${cName}` : `local.get ${cName}`;

        return `    ${countExpr}
    ${setCounter}
    (block ${lEnd}
      (loop ${lStart}
        ${getCounter}
        i32.const 0
        i32.eq
        br_if ${lEnd}

${body}

        ${getCounter}
        i32.const 1
        i32.sub
        ${setCounter}
        br ${lStart}
      )
    )`;
      }

      case 'AddStatement': {
        const isGlobal = isRoot || !currentLocals.has(node.target);
        const getOp = isGlobal ? `global.get $${node.target}` : `local.get $${node.target}`;
        const setOp = isGlobal ? `global.set $${node.target}` : `local.set $${node.target}`;
        return `    ${getOp}
    ${generateNode(node.amount, currentLocals, false)}
    i32.add
    ${setOp}`;
      }

      case 'DOMSetText': {
        let elementIdCode = generateNode(node.elementId, currentLocals, false);
        let textValueCode = generateNode(node.textValue, currentLocals, false);
        const textType = getType(node.textValue, currentLocals);
        if (textType === 'string') {
          return `    ${elementIdCode}\n    ${textValueCode}\n    call $set_element_text`;
        } else {
          return `    ${elementIdCode}\n    ${textValueCode}\n    call $set_element_int`;
        }
      }

      case 'ExpressionStatement': {
        return generateNode(node.expression, currentLocals, false);
      }

      case 'BinaryExpression': {
        let leftType = getType(node.left, currentLocals);
        let rightType = getType(node.right, currentLocals);
        
        if (leftType === 'string' || rightType === 'string') {
          let leftCode = generateNode(node.left, currentLocals, false);
          let rightCode = generateNode(node.right, currentLocals, false);
          if (leftType === 'string' && rightType === 'int') {
            return `    ${leftCode}\n    ${rightCode}\n    call $concat_string_int`;
          } else if (leftType === 'int' && rightType === 'string') {
            return `    ${rightCode}\n    ${leftCode}\n    call $concat_int_string`;
          } else {
            return `    ${leftCode}\n    ${rightCode}\n    call $concat_string_string`;
          }
        }

        let leftCode = generateNode(node.left, currentLocals, false);
        let rightCode = generateNode(node.right, currentLocals, false);
        
        switch (node.operator) {
          case '+': return `    ${leftCode}\n    ${rightCode}\n    i32.add`;
          case '-': return `    ${leftCode}\n    ${rightCode}\n    i32.sub`;
          case '*': return `    ${leftCode}\n    ${rightCode}\n    i32.mul`;
          case '/': return `    ${leftCode}\n    ${rightCode}\n    i32.div_s`;
          case '==': return `    ${leftCode}\n    ${rightCode}\n    i32.eq`;
          case '>': return `    ${leftCode}\n    ${rightCode}\n    i32.gt_s`;
          case '<': return `    ${leftCode}\n    ${rightCode}\n    i32.lt_s`;
          default: throw new Error("Unknown operator: " + node.operator);
        }
      }

      case 'CallExpression': {
        let argsCode = node.arguments.map(arg => generateNode(arg, currentLocals, false)).join('\n');
        return `    ${argsCode}\n    call $${node.callee}`;
      }

      case 'NumberLiteral':
        return `i32.const ${node.value}`;

      case 'StringLiteral': {
        let address = registerString(node.value);
        return `i32.const ${address}`;
      }

      case 'Identifier': {
        const isGlobal = isRoot || !currentLocals.has(node.name);
        return isGlobal ? `global.get $${node.name}` : `local.get $${node.name}`;
      }

      default:
        throw new TypeError('Unknown node type in Wasm gen: ' + node.type);
    }
  }

  ast.body.forEach(node => {
    if (node.type === 'FunctionDeclaration') {
      const currentLocals = new Map();
      node.params.forEach(p => {
        currentLocals.set(p, 'int');
      });

      function scanLocals(n) {
        if (!n) return;
        if (n.type === 'VariableDeclaration') {
          currentLocals.set(n.name, getType(n.value, currentLocals));
        }
        for (let key in n) {
          if (n[key] && typeof n[key] === 'object' && n[key].type !== 'FunctionDeclaration') {
            scanLocals(n[key]);
          }
        }
      }
      node.body.forEach(scanLocals);

      let paramsWat = node.params.map(p => `(param $${p} i32)`).join(' ');
      
      let returnType = 'void';
      function scanReturn(n) {
        if (!n) return;
        if (n.type === 'ReturnStatement') {
          returnType = getType(n.value, currentLocals);
        }
        for (let key in n) {
          if (n[key] && typeof n[key] === 'object') {
            scanReturn(n[key]);
          }
        }
      }
      node.body.forEach(scanReturn);
      funcTypes[node.name] = returnType;

      let resultWat = returnType !== 'void' ? ` (result i32)` : '';
      
      let localsWat = '';
      currentLocals.forEach((type, name) => {
        if (!node.params.includes(name)) {
          localsWat += `    (local $${name} i32)\n`;
        }
      });

      let bodyWat = node.body.map(n => generateNode(n, currentLocals, false)).join('\n');
      if (returnType !== 'void') {
        bodyWat += '\n    i32.const 0';
      }

      functions.push(`  (func $${node.name} (export "${node.name}") ${paramsWat}${resultWat}
${localsWat}${bodyWat}
  )`);
    } else {
      let code = generateNode(node, new Map(), true);
      if (code) {
        mainStatements.push(code);
      }
    }
  });

  let globalsWat = Array.from(globals).map(g => `  (global $${g} (mut i32) (i32.const 0))`).join('\n');

  let dataSegmentsWat = stringLiterals.map(s => {
    let escaped = s.value.replace(/"/g, '\\"');
    return `  (data (i32.const ${s.address}) "${escaped}\\00")`;
  }).join('\n');

  return `(module
  (import "env" "print_string" (func $print_string (param i32)))
  (import "env" "print_int" (func $print_int (param i32)))
  (import "env" "set_element_text" (func $set_element_text (param i32 i32)))
  (import "env" "set_element_int" (func $set_element_int (param i32 i32)))
  (import "env" "concat_string_int" (func $concat_string_int (param i32 i32) (result i32)))
  (import "env" "concat_int_string" (func $concat_int_string (param i32 i32) (result i32)))
  (import "env" "concat_string_string" (func $concat_string_string (param i32 i32) (result i32)))
  
  (memory 1)
  (export "memory" (memory 0))

  (global $heap_ptr (mut i32) (i32.const ${stringOffset + 1024}))

  (func $malloc (param $size i32) (result i32)
    (local $old_ptr i32)
    global.get $heap_ptr
    local.set $old_ptr
    global.get $heap_ptr
    local.get $size
    i32.add
    global.set $heap_ptr
    local.get $old_ptr
  )
  (export "malloc" (func $malloc))

${globalsWat}

${functions.join('\n\n')}

  (func $main
${mainStatements.join('\n')}
  )
  (export "main" (func $main))

${dataSegmentsWat}
)`;
}

module.exports = generator;
