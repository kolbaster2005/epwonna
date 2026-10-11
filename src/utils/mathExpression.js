// Безопасный разбор и проверка математических выражений, которые вводит пользователь,
// например первообразная: -(3x+3/2)e^(1-2x) + 3/2(x^3+7)^(4/3) + C.
//
// Никакого eval: свой небольшой разборщик (текст → токены → дерево → число).
// Ответ пользователя не сравнивается как строка — он вычисляется в контрольных точках
// и сравнивается с эталонной формулой. Поэтому «+C», пробелы, порядок слагаемых и разные
// формы записи (-4/3x^3, -(4/3)*x^3, x^3*(-4/3)) не мешают.

const FUNCTIONS = {
  ln: Math.log,
  exp: Math.exp,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
}

// c — константа интегрирования («+C»). В вычислении она считается нулём,
// а при сравнении «с точностью до константы» всё равно не влияет на результат.
const CONSTANTS = { e: Math.E, pi: Math.PI, c: 0 }

// Длинные имена функций первыми, чтобы «arcsin» не разобралось как «a, r, c, sin».
const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort((a, b) => b.length - a.length)

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const MAX_EXPRESSION_LENGTH = 200

// Контрольные точки по умолчанию. У каждого пункта можно задать свои (part.samplePoints) —
// например, по обе стороны от точки разрыва.
const DEFAULT_SAMPLE_POINTS = [-1.7, -0.9, -0.3, 0.2, 0.9, 1.6, 2.4]

class ExpressionSyntaxError extends Error {}

function normalizeSource(source) {
  let text = String(source).toLowerCase().trim()
  // «F(x) = …» или «y = …» в начале — просто отбрасываем.
  text = text.replace(/^[a-z]\s*(\(\s*x\s*\))?\s*=(?!=)/, '')
  return text
    .replace(/[−–—]/g, '-')
    .replace(/[×·⋅∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/√/g, 'sqrt')
    .replace(/∛/g, 'cbrt')
    .replace(/π/g, 'pi')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (digits) => '^' + [...digits].map((d) => SUPERSCRIPT_DIGITS.indexOf(d)).join(''))
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\*\*/g, '^')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
}

// Слово из букв («xe», «lnx», «arctan») режем на известные части: функции, pi, e, x, c.
function splitWord(word) {
  const atoms = []
  let i = 0
  while (i < word.length) {
    const functionName = FUNCTION_NAMES.find((name) => word.startsWith(name, i))
    if (functionName) {
      atoms.push({ type: 'func', value: functionName })
      i += functionName.length
    } else if (word.startsWith('pi', i)) {
      atoms.push({ type: 'const', value: 'pi' })
      i += 2
    } else if (word[i] === 'x') {
      atoms.push({ type: 'x' })
      i += 1
    } else if (word[i] === 'e' || word[i] === 'c') {
      atoms.push({ type: 'const', value: word[i] })
      i += 1
    } else {
      throw new ExpressionSyntaxError(`unknown name in "${word}"`)
    }
  }
  return atoms
}

function tokenize(text) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (/\s/.test(ch)) {
      i += 1
    } else if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < text.length && /[0-9.]/.test(text[j])) j += 1
      const numberText = text.slice(i, j)
      if (!/^(\d+\.?\d*|\.\d+)$/.test(numberText)) throw new ExpressionSyntaxError('bad number')
      tokens.push({ type: 'num', value: parseFloat(numberText) })
      i = j
    } else if (/[a-z]/.test(ch)) {
      let j = i
      while (j < text.length && /[a-z]/.test(text[j])) j += 1
      tokens.push(...splitWord(text.slice(i, j)))
      i = j
    } else if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i += 1
    } else if (ch === '(') {
      tokens.push({ type: 'lp' })
      i += 1
    } else if (ch === ')') {
      tokens.push({ type: 'rp' })
      i += 1
    } else if (ch === '|') {
      tokens.push({ type: 'bar' })
      i += 1
    } else {
      throw new ExpressionSyntaxError(`unexpected character "${ch}"`)
    }
  }
  return tokens
}

// implicitMultiplicationFirst:
//   false — «3/2x» читается как (3/2)·x (умножение без знака — на одном уровне с * и /);
//   true  — «3/2x» читается как 3/(2x) (умножение без знака сильнее деления).
// Запись «3/2x» неоднозначна, поэтому при проверке пробуются оба прочтения (см. matchesReference).
function buildTree(tokens, implicitMultiplicationFirst) {
  let position = 0
  let absDepth = 0

  const peek = () => tokens[position]
  const isOperator = (token, ...values) => token && token.type === 'op' && values.includes(token.value)

  // Может ли токен начинать множитель при умножении без знака («3x», «2(x+1)», «x sin x»)?
  // Число — нет («2 3» это ошибка), «|» — только как открывающая черта.
  function startsFactor(token) {
    if (!token) return false
    if (token.type === 'x' || token.type === 'const' || token.type === 'func' || token.type === 'lp') return true
    return token.type === 'bar' && absDepth === 0
  }

  function parseSum() {
    let left = parseProduct()
    while (isOperator(peek(), '+', '-')) {
      const op = tokens[position].value
      position += 1
      left = { kind: 'bin', op, left, right: parseProduct() }
    }
    return left
  }

  function parseProduct() {
    let left = parseUnary()
    for (;;) {
      if (isOperator(peek(), '*', '/')) {
        const op = tokens[position].value
        position += 1
        left = { kind: 'bin', op, left, right: parseUnary() }
      } else if (!implicitMultiplicationFirst && startsFactor(peek())) {
        left = { kind: 'bin', op: '*', left, right: parsePower() }
      } else {
        return left
      }
    }
  }

  function parseUnary() {
    if (isOperator(peek(), '-', '+')) {
      const sign = tokens[position].value
      position += 1
      const arg = parseUnary()
      return sign === '-' ? { kind: 'neg', arg } : arg
    }
    return implicitMultiplicationFirst ? parseImplicitProduct() : parsePower()
  }

  function parseImplicitProduct() {
    let left = parsePower()
    while (startsFactor(peek())) {
      left = { kind: 'bin', op: '*', left, right: parsePower() }
    }
    return left
  }

  function parsePower() {
    const base = parsePrimary()
    if (isOperator(peek(), '^')) {
      position += 1
      return { kind: 'bin', op: '^', left: base, right: parseExponent() }
    }
    return base
  }

  // Показатель степени: необязательный знак и число/скобка/функция, без умножения без знака:
  // «e^2x» читается как e^2 · x, а степень со многими символами пишут в скобках: e^(2x).
  function parseExponent() {
    if (isOperator(peek(), '-', '+')) {
      const sign = tokens[position].value
      position += 1
      const arg = parseExponent()
      return sign === '-' ? { kind: 'neg', arg } : arg
    }
    return parsePower()
  }

  function expect(type) {
    if (!peek() || peek().type !== type) throw new ExpressionSyntaxError(`expected ${type}`)
    position += 1
  }

  function parsePrimary() {
    const token = peek()
    if (!token) throw new ExpressionSyntaxError('unexpected end')
    position += 1
    switch (token.type) {
      case 'num':
        return { kind: 'num', value: token.value }
      case 'x':
        return { kind: 'var' }
      case 'const':
        return { kind: 'const', name: token.value }
      case 'func': {
        // «ln(x)», «ln|x|» или без скобок: «ln x», «sqrt 2».
        const next = peek()
        const arg = next && (next.type === 'lp' || next.type === 'bar') ? parsePrimary() : parsePower()
        return { kind: 'func', name: token.value, arg }
      }
      case 'lp': {
        const inner = parseSum()
        expect('rp')
        return inner
      }
      case 'bar': {
        absDepth += 1
        const inner = parseSum()
        expect('bar')
        absDepth -= 1
        return { kind: 'func', name: 'abs', arg: inner }
      }
      default:
        throw new ExpressionSyntaxError(`unexpected ${token.type}`)
    }
  }

  const tree = parseSum()
  if (position !== tokens.length) throw new ExpressionSyntaxError('extra input')
  return tree
}

// Степень с отрицательным основанием и дробным показателем — как в школьной записи ∛:
// (-8)^(1/3) = -2, (x³+7)^(4/3) определено и при x³+7 < 0.
function realPower(base, exponent) {
  if (base >= 0 || Number.isInteger(exponent)) return Math.pow(base, exponent)
  for (let rootDegree = 3; rootDegree <= 15; rootDegree += 2) {
    const numerator = Math.round(exponent * rootDegree)
    if (Math.abs(exponent * rootDegree - numerator) < 1e-9) {
      return Math.pow(-Math.pow(-base, 1 / rootDegree), numerator)
    }
  }
  return NaN
}

function evaluateTree(node, x) {
  switch (node.kind) {
    case 'num':
      return node.value
    case 'var':
      return x
    case 'const':
      return CONSTANTS[node.name]
    case 'neg':
      return -evaluateTree(node.arg, x)
    case 'func':
      return FUNCTIONS[node.name](evaluateTree(node.arg, x))
    default: {
      const left = evaluateTree(node.left, x)
      const right = evaluateTree(node.right, x)
      if (node.op === '+') return left + right
      if (node.op === '-') return left - right
      if (node.op === '*') return left * right
      if (node.op === '/') return left / right
      return realPower(left, right)
    }
  }
}

// Возвращает { evaluate(x) } или null, если запись не удалось разобрать.
export function parseExpression(source, implicitMultiplicationFirst = false) {
  try {
    const text = normalizeSource(source)
    if (text === '' || text.length > MAX_EXPRESSION_LENGTH) return null
    const tokens = tokenize(text)
    if (tokens.length === 0) return null
    const tree = buildTree(tokens, implicitMultiplicationFirst)
    return { evaluate: (x) => evaluateTree(tree, x) }
  } catch (error) {
    if (error instanceof ExpressionSyntaxError) return null
    throw error
  }
}

// Можно ли вообще разобрать запись (для подсказки «проверьте скобки» под полем ввода).
export function isExpressionReadable(source) {
  return parseExpression(source, false) !== null
}

function sameFunction(student, reference, samplePoints, allowConstant) {
  const differences = []
  let scale = 1
  for (const x of samplePoints) {
    const expected = reference.evaluate(x)
    if (!Number.isFinite(expected)) continue // точка вне области определения эталона — пропускаем
    const given = student.evaluate(x)
    if (!Number.isFinite(given)) return false
    differences.push(given - expected)
    scale = Math.max(scale, Math.abs(expected), Math.abs(given))
  }
  if (differences.length < 3) return false
  const tolerance = 1e-6 * scale
  const offset = allowConstant ? differences[0] : 0
  return differences.every((difference) => Math.abs(difference - offset) <= tolerance)
}

// part = { referenceExpression, allowConstant, samplePoints }.
// allowConstant = true — «неопределённый интеграл»: ответ верен, если отличается от эталона
// на константу (то есть «+C» можно не писать или писать любую).
export function gradeExpressionAnswer(rawValue, part) {
  const reference = parseExpression(part.referenceExpression || '', false)
  if (!reference) return false
  const samplePoints = Array.isArray(part.samplePoints) && part.samplePoints.length > 0 ? part.samplePoints : DEFAULT_SAMPLE_POINTS
  const allowConstant = !!part.allowConstant
  // Пробуем оба прочтения неоднозначной записи вроде «3/2x».
  return [false, true].some((implicitMultiplicationFirst) => {
    const student = parseExpression(rawValue, implicitMultiplicationFirst)
    return !!student && sameFunction(student, reference, samplePoints, allowConstant)
  })
}
