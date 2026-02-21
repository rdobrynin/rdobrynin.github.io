'use strict'
module.exports = (to, { data: { root } }) => {
  if (!to) return '#'
  const from = root.page.url
  if (!from || to.charAt() === '#') return to
  const fromParts = from.split('/')
  const toParts = to.split('/')
  fromParts.pop()
  let sharedLength = 0
  while (sharedLength < fromParts.length && sharedLength < toParts.length && fromParts[sharedLength] === toParts[sharedLength]) sharedLength++
  const up = fromParts.length - sharedLength
  const rel = (up ? Array(up).fill('..') : ['.']).concat(toParts.slice(sharedLength))
  return rel.join('/')
}
