const replace = require('gulp-replace')

// defaults
const defaultPrefix = 'package'
const defaultPattern = /@(package\.)?([a-zA-Z0-9]+)@/g
const contextCharacters = 20

/**
 * show that the file contents were shortened
 *
 * @param {Boolean} display
 * @returns {String} '...' if display is true, '' otherwise
 */
function ellipsis (display) {
  if (display) { return '...' }
  return ''
}

/**
 * calculate on which line the match was found
 *
 * @param {String} string file contents
 * @param {Number} offset index of match start
 */
function getLine (string, offset) {
  const newlinesBefore = string
    .substring(0, offset)
    .match(/\n/g)
    .length
  return newlinesBefore + 1
}

/**
 * report problems in replacements in .tmpl files
 * replaces the problematic values with an empty string
 *
 * @param {String} match entire match
 * @param {Number} offset match start index
 * @param {String} string entire file contents
 * @param {String} path relative file path
 * @param {String} message error message
 * @returns {String} empty string
 */
function logReplacementIssue (match, offset, string, path, message) {
  const startIndex = Math.max(0, offset - contextCharacters)
  const startEllipsis = Boolean(startIndex)
  const start = string.substring(startIndex, offset)

  const matchEnd = offset + match.length
  const endIndex = Math.min(string.length, matchEnd + contextCharacters)
  const endEllipsis = endIndex === string.length
  const end = string.substring(matchEnd, endIndex)

  console.warn(`\n\x1b[31m${match}\x1b[39m ${message}`)
  console.warn(`Found at line ${getLine(string, offset)} in ${path}`)
  console.warn(`${ellipsis(startEllipsis)}${start}\x1b[31m${match}\x1b[39m${end}${ellipsis(endEllipsis)}`)
}

/**
 * get handler to replace placeholders in the form `@{prefix}.something@`
 *
 * @param {String} prefix the key prefix
 * @param {Map} replacements the replacement map
 * @returns {Function} match handler
 */
function getMatchHandlerWithPrefix (prefix, replacements) {
  /**
     * replace placeholders in the form `@{prefix}.something@`
     * similar to your normal .tmpl replacements
     *
     * @param {String} match complete match
     * @param {String} p1 prefix match
     * @param {String} p2 key match
     * @param {Number} offset character offset of match (first @)
     * @param {String} string entire file contents
     * @returns {String} replacement or empty string
     */
  function handleMatchesWithPrefix (match, p1, p2, offset, string) {
    const path = this.file.relative

    // handle missing "package." prefix
    if (!p1) {
      logReplacementIssue(match, offset, string, path, `replacement must start with '${prefix}.'`)
      return ''
    }

    // handle missing substitution
    if (!replacements.has(p2)) {
      logReplacementIssue(match, offset, string, path, 'has no replacement!')
      return ''
    }

    return replacements.get(p2)
  }
  return handleMatchesWithPrefix
}

/**
 * get handler to replace placeholders in the form `@something@`
 *
 * @param {Map} replacements the replacement map
 * @returns {Function} match handler
 */
function getMatchHandler (replacements) {
  /**
     * replace placeholders in the form `@something@`
     * similar to your normal .tmpl replacements
     *
     * @param {String} match complete match
     * @param {String} p1 key match
     * @param {Number} offset character offset of match
     * @param {String} string entire file content
     * @returns {String} replacement or empty string
     */
  function handleMatches (match, p1, offset, string) {
    const path = this.file.relative

    // handle missing substitution
    if (!replacements.has(p1)) {
      logReplacementIssue(match, offset, string, path, 'has no replacement!')
      return ''
    }

    return replacements.get(p1)
  }
  return handleMatches
}

/**
 * convert one or more objects into a single merged map
 *
 * @param {Object<String,any>|Array<Object<String,any>>} replacements objects
 * @returns {Map} merged map of replacements
 */
function mergeReplacements (replacements) {
  // convert an array of objects into a single merged map
  if (Array.isArray(replacements)) {
    return replacements
      .reverse() // last repeated key wins
      .map(obj => Object.entries(obj)) // convert into an array of [k, v]
      .reduce((map, nextEntries) => new Map([...map, ...nextEntries]), new Map())
  }
  // convert one object into a map
  return new Map(Object.entries(replacements))
}

/**
 * @typedef {Object} GulpReplaceTmplOptions
 * @prop {String} [prefix] key prefix, default: "package"
 * @prop {Boolean} [unprefixed] if true keys will not be prefixed, default: false
 * @prop {Boolean} [debug] print debug output, default: false
 */

/**
 * Replace occurences of placeholders in files @something@
 *
 * @prop {Object|Array<Object>} replacements one or more Objects with key and its replacement
 * @param {GulpReplaceTmplOptions} options configure replacement
 * @return {NodeJS.ReadWriteStream} transformation function
 */
function GulpReplaceTmpl (replacements, options) {
  const _options = options || {}
  // required option missing
  if (!replacements) {
    throw new Error('Replacements missing')
  }
  if (_options.prefix && _options.prefix.match(/[^a-zA-Z0-9]/)) {
    throw new Error('Invalid prefix, only [a-zA-Z0-9] allowed')
  }

  const mergedReplacements = mergeReplacements(replacements)

  let pattern, handler, prefix

  if (!_options.prefix && !_options.unprefixed) {
    prefix = defaultPrefix
    pattern = defaultPattern
    handler = getMatchHandlerWithPrefix(defaultPrefix, mergedReplacements)
  }
  if (_options.prefix) {
    prefix = _options.prefix
    pattern = new RegExp(`@(${_options.prefix}\.)?([a-zA-Z0-9]+)@`, 'g')
    handler = getMatchHandlerWithPrefix(_options.prefix, mergedReplacements)
  }
  if (_options.unprefixed) {
    prefix = undefined
    pattern = /@([a-zA-Z0-9]+)@/g
    handler = getMatchHandler(mergedReplacements, _options)
  }

  if (_options.debug) {
    console.log('Prefix:', prefix || 'unprefixed')
    console.log('Replacements:', mergedReplacements)
  }

  return replace(pattern, handler)
}

module.exports = GulpReplaceTmpl
