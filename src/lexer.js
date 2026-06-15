function lexer(input) {
  const tokens = [];
  let cursor = 0;

  while (cursor < input.length) {
    let char = input[cursor];

    // Skip whitespace
    if (/\s/.test(char)) {
      cursor++;
      continue;
    }

    // Comments
    if (char === '/' && input[cursor + 1] === '/') {
      while (cursor < input.length && input[cursor] !== '\n') {
        cursor++;
      }
      continue;
    }

    // Two-character operators (e.g. ==)
    if (char === '=' && input[cursor + 1] === '=') {
      tokens.push({ type: 'operator', value: '==' });
      cursor += 2;
      continue;
    }

    // Single character operators and punctuation
    if (['+', '-', '*', '/', '>', '<', '=', '(', ')', ','].includes(char)) {
      tokens.push({ type: 'operator', value: char });
      cursor++;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      let value = '';
      while (/[0-9]/.test(char) && cursor < input.length) {
        value += char;
        char = input[++cursor];
      }
      tokens.push({ type: 'number', value });
      continue;
    }

    // Letters/Keywords/Identifiers
    if (/[a-zA-Z_]/.test(char)) {
      let value = '';
      while (/[a-zA-Z0-9_]/.test(char) && cursor < input.length) {
        value += char;
        char = input[++cursor];
      }
      tokens.push({ type: 'word', value });
      continue;
    }

    // Strings
    if (char === '"' || char === "'") {
      let value = '';
      const quote = char;
      char = input[++cursor];
      while (char !== quote && cursor < input.length) {
        value += char;
        char = input[++cursor];
      }
      char = input[++cursor]; // Skip closing quote
      tokens.push({ type: 'string', value });
      continue;
    }

    throw new TypeError('I dont know what this character is: ' + char + ' at index ' + cursor);
  }

  return tokens;
}

module.exports = lexer;
