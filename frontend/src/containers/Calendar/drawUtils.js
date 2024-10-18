function drawTruncatedText(ctx, x, y, width, text) {
  function removeLastVowel(str) {
    return str.replace(/([aeiouAEIOU])(?!.*[aeiouAEIOU\s])/g, '')
  }
  const deterministicRm = (str) => {
    const words = str.split(' ')
    const totalLength = str.length
    const wordIndex = totalLength % words.length
    const wordToModify = words[wordIndex]
    const charIndex = Math.max(totalLength % wordToModify.length, 1)
    const newWord =
      wordToModify.slice(0, charIndex) + wordToModify.slice(charIndex + 1)
    return words
      .map((word, index) => (index === wordIndex ? newWord : word))
      .join(' ')
  }

  let truncatedText = text

  let i = 0
  while (ctx.measureText(truncatedText).width > width) {
    let newText = removeLastVowel(truncatedText)
    if (newText.length == truncatedText.length) {
      newText = deterministicRm(truncatedText)
      if (newText.length == truncatedText.length) {
        newText = truncatedText.slice(0, -1)
      }
    }

    if (newText.length === 0) {
      truncatedText =
        text.slice(0, Math.floor(width / ctx.measureText('W').width)) + '...'
      break
    }
    truncatedText = newText
    i++
    if (i > 40) break
  }

  ctx.fillText(truncatedText, x, y)
}

export { drawTruncatedText }
