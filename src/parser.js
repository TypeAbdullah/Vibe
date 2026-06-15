function parser(tokens) {
  let current = 0;

  function peek() {
    return tokens[current];
  }

  function consume(type, value) {
    let token = tokens[current];
    if (!token) {
      throw new Error(`Expected token but reached end of file.`);
    }
    if (type && token.type !== type) {
      throw new Error(`Expected token type ${type}, got ${token.type} (${token.value})`);
    }
    if (value && token.value !== value) {
      throw new Error(`Expected token value ${value}, got ${token.value}`);
    }
    current++;
    return token;
  }

  // Parse expressions (handles +, -, *, /, ==, >, < and calls)
  function parseExpression() {
    return parseBinaryOp();
  }

  function parseBinaryOp() {
    let left = parsePrimary();
    
    while (peek() && peek().type === 'operator' && ['+', '-', '*', '/', '>', '<', '=='].includes(peek().value)) {
      let op = consume('operator').value;
      let right = parsePrimary();
      left = {
        type: 'BinaryExpression',
        operator: op,
        left,
        right
      };
    }
    return left;
  }

  function parsePrimary() {
    let token = peek();
    if (!token) throw new Error("Unexpected end of input when parsing expression");

    if (token.type === 'number') {
      consume();
      return { type: 'NumberLiteral', value: token.value };
    }

    if (token.type === 'string') {
      consume();
      return { type: 'StringLiteral', value: token.value };
    }

    if (token.type === 'word') {
      consume();
      // Check if this is a function call: e.g. name(arg1, arg2)
      if (peek() && peek().type === 'operator' && peek().value === '(') {
        consume('operator', '(');
        let args = [];
        if (!(peek() && peek().type === 'operator' && peek().value === ')')) {
          args.push(parseExpression());
          while (peek() && peek().type === 'operator' && peek().value === ',') {
            consume('operator', ',');
            args.push(parseExpression());
          }
        }
        consume('operator', ')');
        return {
          type: 'CallExpression',
          callee: token.value,
          arguments: args
        };
      }
      return { type: 'Identifier', name: token.value };
    }

    if (token.type === 'operator' && token.value === '(') {
      consume('operator', '(');
      let expr = parseExpression();
      consume('operator', ')');
      return expr;
    }

    throw new Error(`Unexpected token in expression: ${token.type} (${token.value})`);
  }

  function parseStatement() {
    let token = peek();
    if (!token) return null;

    if (token.type === 'word') {
      // 1. Variable declaration: "create variable <name> as <expr>"
      if (token.value === 'create') {
        consume(); // skip 'create'
        if (peek() && peek().value === 'variable') {
          consume(); // skip 'variable'
        }
        let name = consume('word').value;
        if (peek() && peek().value === 'as') {
          consume(); // skip 'as'
        }
        let value = parseExpression();
        return {
          type: 'VariableDeclaration',
          name,
          value
        };
      }

      // 2. Function declaration: "define function <name> [with <params>] as <body> end"
      if (token.value === 'define') {
        consume(); // skip 'define'
        consume('word', 'function');
        let name = consume('word').value;
        
        let params = [];
        if (peek() && peek().value === 'with') {
          consume('word', 'with');
          params.push(consume('word').value);
          while (peek() && peek().type === 'operator' && peek().value === ',') {
            consume('operator', ',');
            params.push(consume('word').value);
          }
        }
        
        if (peek() && peek().value === 'as') {
          consume('word', 'as');
        }

        let body = [];
        while (peek() && !(peek().type === 'word' && peek().value === 'end')) {
          let stmt = parseStatement();
          if (stmt) body.push(stmt);
        }
        consume('word', 'end');

        return {
          type: 'FunctionDeclaration',
          name,
          params,
          body
        };
      }

      // 3. Return statement: "return <expr>"
      if (token.value === 'return') {
        consume(); // skip 'return'
        let value = parseExpression();
        return {
          type: 'ReturnStatement',
          value
        };
      }

      // 4. Print statement: "show <expr>"
      if (token.value === 'show') {
        consume(); // skip 'show'
        let value = parseExpression();
        return {
          type: 'PrintStatement',
          value
        };
      }

      // 5. Loop statement: "loop <expr> times <body> end"
      if (token.value === 'loop') {
        consume(); // skip 'loop'
        let count = parseExpression();
        if (peek() && peek().value === 'times') {
          consume('word', 'times');
        }
        
        let body = [];
        while (peek() && !(peek().type === 'word' && peek().value === 'end')) {
          let stmt = parseStatement();
          if (stmt) body.push(stmt);
        }
        consume('word', 'end');

        return {
          type: 'LoopStatement',
          count,
          body
        };
      }

      // 6. Conditional: "if <cond> then <body> [else <body>] end"
      if (token.value === 'if') {
        consume(); // skip 'if'
        let test = parseExpression();
        consume('word', 'then');
        
        let consequent = [];
        while (peek() && !(peek().type === 'word' && ['else', 'end'].includes(peek().value))) {
          let stmt = parseStatement();
          if (stmt) consequent.push(stmt);
        }

        let alternate = [];
        if (peek() && peek().type === 'word' && peek().value === 'else') {
          consume('word', 'else');
          while (peek() && !(peek().type === 'word' && peek().value === 'end')) {
            let stmt = parseStatement();
            if (stmt) alternate.push(stmt);
          }
        }
        consume('word', 'end');

        return {
          type: 'IfStatement',
          test,
          consequent,
          alternate
        };
      }

      // 7. Add statement: "add <expr> to <var>"
      if (token.value === 'add') {
        consume(); // skip 'add'
        let amount = parseExpression();
        consume('word', 'to');
        let target = consume('word').value;
        return {
          type: 'AddStatement',
          amount,
          target
        };
      }

      // 8. DOM manipulation: "set element <id> text to <expr>"
      if (token.value === 'set') {
        consume(); // skip 'set'
        consume('word', 'element');
        let elementId = parseExpression();
        consume('word', 'text');
        consume('word', 'to');
        let textValue = parseExpression();
        return {
          type: 'DOMSetText',
          elementId,
          textValue
        };
      }

      // 9. Simple assignment: "<var> = <expr>"
      let varToken = peek();
      if (tokens[current + 1] && tokens[current + 1].type === 'operator' && tokens[current + 1].value === '=') {
        consume(); // consume varToken
        consume('operator', '=');
        let value = parseExpression();
        return {
          type: 'Assignment',
          name: varToken.value,
          value
        };
      }
    }

    // If it doesn't match any statement pattern, it's just an expression statement
    let expr = parseExpression();
    return {
      type: 'ExpressionStatement',
      expression: expr
    };
  }

  let ast = {
    type: 'Program',
    body: []
  };

  while (current < tokens.length) {
    let stmt = parseStatement();
    if (stmt) {
      ast.body.push(stmt);
    }
  }

  return ast;
}

module.exports = parser;
