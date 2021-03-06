/* eslint-disable no-case-declarations */
const path = require('path')
const termkit = require('terminal-kit')
const compose = require('crocks/helpers/compose')

const tap = require('crocks/helpers/tap')
const { statSync, existsSync } = require('fs')
const fileInput = require('./fileInput')
const createRunner = require('./runner')

const { store, actions, types } = require('./store')

const term = termkit.terminal

const baseDir = path.resolve(process.argv[2] || process.cwd())

const sleep = async ms => new Promise(res => setTimeout(res, ms))

/**
 * Layout
 * @param {*} opts
 */
const header = opts => {
  term.moveTo(1, 1)
  term.brightBlack('🚀 Are you ready for launch? \n\n')
  return opts
}

/**
 *
 * @param {{
 *  baseDir: import("fs").PathLike
 * }} options
 */
const main = async options => {
  term.clear()
  const runner = await createRunner()

  const chooseFile = () => {
    term('Choose a file or directory: ')

    fileInput(
      {
        baseDir: options.baseDir,
        files: /\.(js|jsx|ts|tsx)$/,
        autoCompleteMenu: true,
        autoCompleteHint: true,
        minLength: 1
      },
      async (error, input) => {
        if (error) {
          term.red.bold(`An error occurs: ${error}\n`)
        } else if (existsSync(input)) {
          actions.runningFile(input)
        } else {
          term('\n\n')
          term.red
            .bold('File or directory does not exist:\n')
            .bold(`💔 ${input}\n`)
          await sleep(1000)
          actions.choseFileOperation()
        }
      }
    )
  }

  const loop = state => {
    term.clear()
    switch (true) {
      case state.current === types.RUNNING:
        const runningScreen = compose(header, tap(term.clear))
        runningScreen(state)
        runner(runningScreen, state.running.file)
        return

      case state.current === types.CHOOSE_FILE:
        compose(chooseFile, term.clear)()
        return

      default:
        compose(term.clear)()
    }
  }

  term.on('key', (key /*  matches, data */) => {
    // Running file in watch mode
    const notChoosingFile = store.getState().current !== types.CHOOSE_FILE
    if (['r', 'R'].includes(key) && notChoosingFile) {
      actions.choseFileOperation()
    }

    if (['s', 'S'].includes(key) && notChoosingFile) {
      actions.toggleNpmInstallSaveOpt()
    }

    // Detect CTRL-C and exit 'manually'
    if (key === 'CTRL_C') {
      term.green('\n💛\n')
      process.exit()
    }
  })

  store.watch(loop)
}

main({ baseDir })
