import { useEffect } from 'react'
import { press_digit, press_operator, press_clear, press_equal, init_calculator } from './calculator.vibe'
import './App.css'

function App() {
  useEffect(() => {
    // Initialize the calculator display using WebAssembly
    init_calculator();
  }, []);

  return (
    <div className="react-calculator-container">
      <header>
        <h1>React Vibe CalcuWasm</h1>
        <p className="subtitle">Importing .vibe Directly inside React</p>
      </header>

      <div className="screen">
        <div id="display">0</div>
      </div>

      <div className="grid">
        <button className="clear" id="btn-clear" onClick={() => press_clear()}>C</button>
        <button className="operator" id="btn-div" onClick={() => press_operator(4)}>÷</button>
        <button className="operator" id="btn-mul" onClick={() => press_operator(3)}>×</button>
        
        <button id="btn-7" onClick={() => press_digit(7)}>7</button>
        <button id="btn-8" onClick={() => press_digit(8)}>8</button>
        <button id="btn-9" onClick={() => press_digit(9)}>9</button>
        <button className="operator" id="btn-sub" onClick={() => press_operator(2)}>-</button>

        <button id="btn-4" onClick={() => press_digit(4)}>4</button>
        <button id="btn-5" onClick={() => press_digit(5)}>5</button>
        <button id="btn-6" onClick={() => press_digit(6)}>6</button>
        <button className="operator" id="btn-add" onClick={() => press_operator(1)}>+</button>

        <button id="btn-1" onClick={() => press_digit(1)}>1</button>
        <button id="btn-2" onClick={() => press_digit(2)}>2</button>
        <button id="btn-3" onClick={() => press_digit(3)}>3</button>
        <button id="btn-0" onClick={() => press_digit(0)}>0</button>

        <button className="equal" id="btn-equal" onClick={() => press_equal()}>=</button>
      </div>
      
      <footer>
        Vibe File Compiled at Build Time directly to WASM
      </footer>
    </div>
  )
}

export default App
