let { updater } = require('@architect/utils')
let { spawnSync: child } = require('child_process')
let { join } = require('path')
let { existsSync } = require('fs')

/**
 * Add to your Architect project manifest file:
 *
 * @plugins
 * architect/plugin-node-prune
 *
 * That's it, zero config!
 */
async function pruner ({ inventory }) {
  let { lambdaSrcDirs } = inventory.inv
  let quiet = process.env.ARC_QUIET
  let update = updater('Pruner')

  for (let pathToCode of lambdaSrcDirs) {
    if (existsSync(pathToCode)) {
      let start = Date.now()
      let cwd = process.cwd()
      pathToCode = pathToCode.startsWith(cwd)
        ? pathToCode
        : join(cwd, pathToCode)
      let cmd = join(cwd, 'node_modules', '@architect', 'macro-node-prune', 'prune.sh')
      let options = { cwd: pathToCode, shell: true }
      let spawn = child(cmd, [], options)
      let output = spawn.stdout
      if (!quiet && output) {
        // Format response
        output = output.toString().split('\n')
        let fmt = size => {
          if (size >= 1000) return `${size / 1000}MB`
          return `${size}KB`
        }
        let beforeSize = fmt(output[0])
        let afterSize = fmt(output[1])
        let beforeFiles = output[2]
        let afterFiles = output[3]
        let prunedFiles = beforeFiles - afterFiles
        let prunedSize = fmt(output[0] - output[1])
        let pretty = [
          `Before ... ${beforeSize} in ${beforeFiles} files`,
          `After .... ${afterSize} in ${afterFiles} files`,
          `Found .... ${prunedFiles} unnecessary node_modules files`,
          `Pruned ... ${prunedSize} in ${Date.now() - start}ms`,
        ]
        update.status(
          pathToCode.replace(cwd, ''),
          ...pretty
        )
      }
      if (spawn.status !== 0 || spawn.error) {
        let error = spawn.error ? spawn.error : ''
        throw (`Prune error, exited ${spawn.status}`, error)
      }
    }
  }
  return
}

module.exports = {
  deploy: {
    start: pruner
  }
}
