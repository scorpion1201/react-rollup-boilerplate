import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import image from 'rollup-plugin-image'
import url from 'rollup-plugin-url'
import { terser } from 'rollup-plugin-terser'
import postcss from 'rollup-plugin-postcss'
import packaging from './plugins/rollup-plugin-packaging'

const {env} = process

const opts = env['NODE_ENV'] === 'production' ? [{
  input: 'src/index.js',
  output: {
    file: 'build/bundle.min.js',
    format: 'iife'
  },
  plugins: [
    babel({
      exclude: 'node_modules/**'
    }),
    postcss({
      extract: "build/bundle.min.css",
      minimize: true
    }),
    nodeResolve(),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env['NODE_ENV'])
    }),
    commonjs({
      namedExports: {
        'node_modules/react/index.js': [
          'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
          'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue',
          'Component', 'PureComponent', 'Fragment', 'Children', 'createElement'],
        'node_modules/react-dom/index.js': ['render']
      }
    }),
    url(),
    image(),
    terser({
      compress: {
        passes: 5
      },
      output: {
        beautify: false
      }
    }),
    packaging()
  ]
}] : [{
  input: 'src/index.js',
  output: {
    file: 'build/bundle.js',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    babel({
      exclude: 'node_modules/**'
    }),
    postcss({
      extract: "build/bundle.css",
      minimize: false,
      sourcemap: true
    }),
    nodeResolve(),
    commonjs({
      namedExports: {
        'node_modules/react/index.js': [
          'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
          'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue',
          'Component', 'PureComponent', 'Fragment', 'Children', 'createElement'],
        'node_modules/react-dom/index.js': ['render']
      }
    }),
    url(),
    image(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('dev')
    }),
    packaging()
  ]
}]

export default opts