import * as YAML from 'yaml'
import * as fs from 'fs'
import * as path from 'path'

enum PluralTypes {
  one,
  two,
  russian,
}

function testForProperty(obj, property) { // Looks nicer in the code down there
  return Object.prototype.hasOwnProperty.call(obj, property)
}

/**
 * This function will dig through a Ruby on Rails styled locale {obj} and convert it to i18next into {newObj}
 * We use {pluralType} in the code since I'd rather be explicit instead of programming auto detection
 * @param obj Ruby on Rails formatted JSON object
 * @param newObj BLANK target object for i18next-style format
 * @param pluralType enum PluralType for the language we're working with
 */
function iterate(obj, newObj, pluralType: PluralTypes) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] == 'object') {
      if (testForProperty(obj[key], 'other')) { // If there's an 'other' in here, then it's using plural forms
        if (testForProperty(obj[key], 'one')) { // If there's a 'one' in here, it can't be single plural
          if (testForProperty(obj[key], 'many')) { // If there's a 'many' in here, it must be russian
            newObj[`${key}_0`] = obj[key].one.toString()
            newObj[`${key}_1`] = obj[key].few.toString()
            newObj[`${key}_2`] = obj[key].many.toString()
          } else {
            newObj[key] = obj[key].one.toString()
            newObj[`${key}_plural`] = obj[key].other.toString()
          }
        } else {
          newObj[`${key}_0`] = obj[key].other.toString()
        }
      } else {
        newObj[key] = {}
        iterate(obj[key], newObj[key], pluralType)
      }
    } else { // must be single plural
      newObj[key] = obj[key].toString()
    }
  }
}
const toTrim = path.join(__dirname, '../src').length
function walk(dir, done) {
  let results = []
  fs.readdir(dir, function(err, list) {
    if (err) {
      return done(err)
    }
    let pending = list.length
    if (!pending) {
      return done(null, results)
    }
    list.forEach(function(file) {
      file = path.resolve(dir, file)
      if (file.includes('.ts')) {
        console.log(file)
        return
      }
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          const name = file.substr(toTrim + 1)
          fs.mkdirSync(path.join(__dirname, '../dist') + '\\' + name)
          walk(file, function(err, res) {
            results = results.concat(res)
            if (!--pending) {
              done(null, results)
            }
          })
        } else {
          fs.readFile(file, 'utf8', (err, data) => {
            if (err) {
              console.error(err)
            }
            const parsed = YAML.parse(data)
            const newData = {}
            iterate(parsed, newData, PluralTypes.two)
            const name = file.substr(toTrim + 1)
            const nameToWrite = name.substring(0, name.length - 5) + '.json'
            fs.writeFile(path.join(__dirname, '../dist') + '\\' + nameToWrite, JSON.stringify(newData[Object.keys(newData)[0]]), (error) => {
              if (error) {
                return console.error(error)
              }
              console.log(`\x1b[33m${name}\x1b[0m conversion finished.`)
            })
          })
          results.push(file)
          if (!--pending) {
            done(null, results)
          }
        }
      })
    })
  })
}
fs.rmdirSync('dist', {
  recursive: true,
})
fs.mkdirSync('dist')
walk('src', (err, res) => {
  if (err) {
    return console.log(err)
  }
})
// iterate(yamlToJSON, newJSON, PluralTypes.two)
// fs.writeFile('output/test.json', JSON.stringify(newJSON[Object.keys(newJSON)[0]]), (error) => {
//   if (error) {
//     return console.error(error)
//   }
// })
