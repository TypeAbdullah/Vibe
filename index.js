const lexer = require('./src/lexer');
const parser = require('./src/parser');
const generator = require('./src/generator');

function compile(source) {
  const tokens = lexer(source);
  const ast = parser(tokens);
  const wat = generator(ast);
  return wat;
}

module.exports = {
  lexer,
  parser,
  generator,
  compile
};
