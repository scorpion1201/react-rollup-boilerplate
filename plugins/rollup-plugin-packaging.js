import path from 'path'
import fs from 'fs'
const { env } = process

function fileStats(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      err ? reject(err) : resolve(stats)
    })
  })
}

function accessible(path) {
  return new Promise((resolve, reject) => {
    fs.access(path, fs.constants.R_OK | fs.constants.W_OK, err => {
      err ? reject(err) : resolve(true)
    })
  })
}

function listDir(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      err ? reject(err) : resolve(files)
    })
  })
}

function mkDir(path) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, err => {
      err ? reject(err) : resolve()
    })
  })
}

async function rmDir(sPath) {
  try {
    let files = await listDir(sPath)
    if (files.length === 0) {
      fs.rmdir(sPath, err => {
        if (err) console.error(err)
      })
    } else {
      for (let filename of files) {
        let stats = await fileStats(path.join(sPath, filename))
        if (stats.isDirectory()) {
          await rmDir(path.join(sPath, filename))
        } else {
          await unlink(path.join(sPath, filename))
        }
      }
      await rmDir(sPath)
    }
  } catch (err) {
    console.error(err)
  }
}

async function copyDir(srcDir, destDir, excludes) {
  excludes = excludes || []
  try {
    let files = await listDir(srcDir)
    for (let filename of files) {
      if (excludes.indexOf(filename) === -1) {
        let stats = await fileStats(path.join(srcDir, filename))
        if (stats.isDirectory()) {
          await mkDir(path.join(destDir, filename))
          await copyDir(path.join(srcDir, filename), path.join(destDir, filename))
        } else {
          await copyFile(path.join(srcDir, filename), path.join(destDir, filename))
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
}
async function unlink(path) {
  try {
    if (await accessible(path)) {
      fs.unlink(path, err => {
        if (err) console.error(err)
      })
    }
  } catch (err) {
    console.error(err)
  }
}

function readFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      err ? reject(err) : resolve(data.toString('utf8'))
    })
  })
}

function writeFile(path, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, Buffer.from(data), err => {
      err ? reject(err) : resolve()
    })
  })
}

function copyFile(src, dest) {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, err => {
      err ? reject(err) : resolve()
    })
  })
}

async function cleanDir(sPath) {
  try {
    let files = await listDir(sPath)
    for (let filename of files) {
      let stats = await fileStats(path.join(sPath, filename))
      if (stats.isDirectory()) {
        await rmDir(path.join(sPath, filename))
      } else {
        await unlink(path.join(sPath, filename))
      }
    }
  } catch (err) {
    console.error(err)
  }
}

export default function packaging(options) {
  options = options || {
    dir: 'public',
    templateFile: 'index.html'
  }
  let { dir, templateFile } = options
  dir = dir || 'public'
  templateFile = templateFile || 'index.html'
  const baseDir = path.resolve(__dirname)
  const pubDir = path.join(baseDir, dir)

  return {
    name: 'packaging',
    async generateBundle({ file, dir }, bundle, isWrite) {
      dir = dir || path.dirname(file)
      const distDir = path.join(baseDir, dir)

      // clean up dist directory.
      try {
        await cleanDir(distDir)
      } catch (err) {
        console.error(err)
      }

      // insert scripts and stylesheets into template file.
      try {
        const template = await readFile(path.join(pubDir, templateFile))
        const headIndent = /^([^>]+)<head>/mi.exec(template)[1]
        const bodyIndent = /^([^>]+)<body>/mi.exec(template)[1]
        let scripts = [], styles = []
        for (let key in bundle) {
          const { fileName } = bundle[key]
          if (fileName.indexOf('.css') > -1) {
            styles.push(`${headIndent}  <link rel="stylesheet" href="/${fileName}" />`)
          } else if (fileName.indexOf('.js') > -1) {
            scripts.push(`${bodyIndent}  <script src="/${fileName}"></script>`)
          }
        }
        const result = template
          .replace(/^([^>]+<title>)/mi, `${styles.join('\n')}\n$1`)
          .replace(/^([^>]+<\/body>)/mi, `${scripts.join('\n')}\n$1`)
        const minified = env['NODE_ENV'] === 'production' ?
          result.replace(/\s{2,}|\n|\r/g, '').replace(/<!--([^>]+|[^\-\-]+)-->/g, '') :
          result
        await writeFile(path.join(distDir, templateFile), minified)

        // copy files from pubDir to distDir.
        await copyDir(pubDir, distDir, [templateFile])
        console.log(`created ${dir}/${templateFile}`)
      } catch (err) {
        console.error(err)
      }
    }
  }
}