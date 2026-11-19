import React from 'react'

/**
 * NPCI & RBI Standard Indian Currency & Paisa Formatter Helper
 * 
 * Provides audit-accurate Indian numbering (en-IN), 2-decimal Paisa precision,
 * ISO 4217 Currency metadata, and words converter for compliance with
 * RBI Harmonisation Circular & NPCI Settlement Specifications.
 */

/**
 * Format any number or string amount into strict Indian Numbering format with Paisa accuracy.
 * Example: 12345678.5 -> "₹ 1,23,45,678.50"
 */
export function fmtInrAudit(val, options = {}) {
  const num = Number(val ?? 0)
  if (isNaN(num)) return '₹ 0.00'

  const formatted = Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const prefix = num < 0 ? '- ₹ ' : '₹ '
  return `${prefix}${formatted}`
}

/**
 * Convert INR Decimal to exact Integer Paisa (used in ISO 8583 Bitmaps & ISO 20022 payloads)
 * Example: 25000000.00 -> 2500000000
 */
export function toPaisa(val) {
  const num = Number(val ?? 0)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

/**
 * Convert Integer Paisa to formatted INR
 * Example: 2500000000 -> "₹ 2,50,00,000.00"
 */
export function fromPaisa(paisa) {
  const num = Number(paisa ?? 0) / 100
  return fmtInrAudit(num)
}

/**
 * Format large clearing amounts into Indian banking shorthand (Crores / Lakhs)
 * Example: 4825000000 -> "₹ 482.50 Cr"
 */
export function fmtInrCompact(val) {
  const num = Number(val ?? 0)
  if (isNaN(num)) return '₹ 0.00'

  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (abs >= 10000000) {
    return `${sign}₹ ${(abs / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`
  }
  if (abs >= 100000) {
    return `${sign}₹ ${(abs / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`
  }
  return fmtInrAudit(num)
}

/**
 * Convert an amount in Rupees into official RBI audit words representation
 * Example: 12500.50 -> "Rupees Twelve Thousand Five Hundred and Fifty Paise Only"
 */
export function inrToWords(val) {
  const num = Math.abs(Number(val ?? 0))
  if (isNaN(num) || num === 0) return 'Rupees Zero Only'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertTwoDigits = (n) => {
    if (n < 20) return ones[n]
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
  }

  const convertThreeDigits = (n) => {
    let str = ''
    if (Math.floor(n / 100) > 0) {
      str += ones[Math.floor(n / 100)] + ' Hundred '
    }
    const rem = n % 100
    if (rem > 0) {
      str += (str ? 'and ' : '') + convertTwoDigits(rem)
    }
    return str.trim()
  }

  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)

  let words = ''

  // Crores (1,00,00,000)
  const crores = Math.floor(rupees / 10000000)
  let remainder = rupees % 10000000

  // Lakhs (1,00,000)
  const lakhs = Math.floor(remainder / 100000)
  remainder = remainder % 100000

  // Thousands (1,000)
  const thousands = Math.floor(remainder / 1000)
  remainder = remainder % 1000

  // Hundreds
  const hundreds = remainder

  if (crores > 0) words += convertThreeDigits(crores) + ' Crore '
  if (lakhs > 0) words += convertTwoDigits(lakhs) + ' Lakh '
  if (thousands > 0) words += convertTwoDigits(thousands) + ' Thousand '
  if (hundreds > 0) words += convertThreeDigits(hundreds) + ' '

  words = words.trim()
  if (!words) words = 'Zero'

  let finalStr = 'Rupees ' + words
  if (paise > 0) {
    finalStr += ' and ' + convertTwoDigits(paise) + ' Paise'
  }
  return finalStr + ' Only'
}

/**
 * Reusable React Component for Paisa-accurate display with tooltip
 */
export function InrAuditBadge({ amount, compact = false, showPaisaTooltip = true }) {
  const formatted = compact ? fmtInrCompact(amount) : fmtInrAudit(amount)
  const paisaCount = toPaisa(amount).toLocaleString('en-IN')
  const words = inrToWords(amount)

  return (
    <span
      title={showPaisaTooltip ? `${words} • [${paisaCount} Paise]` : undefined}
      style={{
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        fontWeight: 700,
        letterSpacing: '-0.2px',
        cursor: showPaisaTooltip ? 'help' : 'default',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 3
      }}
    >
      <span>{formatted}</span>
    </span>
  )
}
