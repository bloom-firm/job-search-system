// PDFパス生成のデバッグ

// DBのタイトル
const dbTitle = "シニアPMO・お客様のDXを推進＜ベトナム最大手IT企業の日本法人＞ ・ FPTソフトウェアジャパン"

// 現在の正規化処理（修正後）
let normalizedTitle = dbTitle.replace(/\s*\/\s*/g, ' ・ ')
normalizedTitle = normalizedTitle.replace(/　/g, ' ')
normalizedTitle = normalizedTitle.replace(/・\s+/g, '・')  // 追加：「・」の後のスペースを削除
normalizedTitle = normalizedTitle.replace(/\s+/g, ' ')

console.log('元のタイトル:', dbTitle)
console.log('正規化後:', normalizedTitle)
console.log('エンコード後:', encodeURIComponent(normalizedTitle))

// PDFファイル名（実際のファイル）
const actualPdfName = "シニアPMO・お客様のDXを推進＜ベトナム最大手IT企業の日本法人＞ ・FPTソフトウェアジャパン.pdf"
console.log('\n実際のPDFファイル名:', actualPdfName)

// 文字単位で比較
console.log('\n文字比較:')
const pdfNameWithoutExt = actualPdfName.replace('.pdf', '')
for (let i = 0; i < Math.max(normalizedTitle.length, pdfNameWithoutExt.length); i++) {
  const char1 = normalizedTitle[i] || '(なし)'
  const char2 = pdfNameWithoutExt[i] || '(なし)'
  if (char1 !== char2) {
    console.log(`位置${i}: "${char1}" vs "${char2}" - 不一致!`)
  }
}

console.log('\n一致:', normalizedTitle === pdfNameWithoutExt)
