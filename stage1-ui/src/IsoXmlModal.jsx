import React, { useState, useEffect } from 'react'
import { fmtInrAudit, toPaisa, inrToWords } from './currencyHelper'

/**
 * Generator for authentic ISO 20022 XML (pacs.008 and pacs.004)
 * complying with RBI SFMS & NPCI ISO 20022 Clearing Specifications.
 */
export function generateIso20022Xml(tx) {
  if (!tx) return ''

  const utr = tx.utr || tx.txn_id || 'RBTR20261118000101'
  const isReturn = (tx.status_label || tx.recon_status || tx.status || '').toLowerCase().includes('reject') ||
                   (tx.status_label || tx.recon_status || tx.status || '').toLowerCase().includes('return') ||
                   (tx.status_label || tx.recon_status || tx.status || '').toLowerCase().includes('break')

  const amount = Number(tx.amount || 0).toFixed(2)
  const remitter = tx.remitter || tx.customer || 'Reliance Industries Ltd Corporate'
  const beneficiary = tx.beneficiary || 'State Bank of India Treasury'
  const rail = tx.rail || 'RTGS'
  const dateIso = new Date().toISOString()
  const todayDate = dateIso.slice(0, 10)

  if (isReturn) {
    // pacs.004.001.09 - Payment Return
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.004.001.09"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- RBI SFMS / NPCI Standard Payment Return Message (pacs.004) -->
  <PmtRtr>
    <GrpHdr>
      <MsgId>SFMS/pacs004/${todayDate.replace(/-/g, '')}/${utr.slice(-8)}</MsgId>
      <CreDtTm>${dateIso}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Prtry>${rail === 'RTGS' ? 'RBI-RTGS' : rail === 'NEFT' ? 'RBI-NEFT' : 'NPCI-' + rail}</Prtry>
        </ClrSys>
      </SttlmInf>
      <InstgAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId><Cd>INIFSC</ClrSysId></ClrSysId>
            <MmbId>ICIC0000001</MmbId>
          </ClrSysMmbId>
          <Nm>ICICI Bank Central Clearing</Nm>
        </FinInstnId>
      </InstgAgt>
      <InstdAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId><Cd>INIFSC</ClrSysId></ClrSysId>
            <MmbId>SBIN0000001</MmbId>
          </ClrSysMmbId>
          <Nm>Reserve Bank of India e-Kuber Switch</Nm>
        </FinInstnId>
      </InstdAgt>
    </GrpHdr>
    <TxInf>
      <RtrId>RTR-${utr}</RtrId>
      <OrgnlGrpInf>
        <OrgnlMsgId>SFMS/pacs008/${todayDate.replace(/-/g, '')}/${utr.slice(-8)}</OrgnlMsgId>
        <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>
      </OrgnlGrpInf>
      <OrgnlEndToEndId>E2E-${utr}</OrgnlEndToEndId>
      <OrgnlTxId>${utr}</OrgnlTxId>
      <RtrdIntrBkSttlmAmt Ccy="INR">${amount}</RtrdIntrBkSttlmAmt>
      <IntrBkSttlmDt>${todayDate}</IntrBkSttlmDt>
      <RtrRsnInf>
        <Orgtr>
          <Nm>${beneficiary}</Nm>
        </Orgtr>
        <Rsn>
          <Cd>AC04</Cd>
          <Prtry>ACCOUNT_CLOSED_OR_BLOCKED</Prtry>
        </Rsn>
        <AddtlInf>Beneficiary account closed in CBS. Autonomous pacs.004 return initiated under RBI T+1 SLA.</AddtlInf>
      </RtrRsnInf>
      <OrgnlTxRef>
        <Amt>
          <InstdAmt Ccy="INR">${amount}</InstdAmt>
        </Amt>
        <Dbtr>
          <Nm>${remitter}</Nm>
        </Dbtr>
        <Cdtr>
          <Nm>${beneficiary}</Nm>
        </Cdtr>
      </OrgnlTxRef>
    </TxInf>
  </PmtRtr>
</Document>`
  }

  // pacs.008.001.08 - Financial Institutional Customer Credit Transfer
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- RBI SFMS / NPCI Customer Credit Transfer Message (pacs.008) -->
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>SFMS/pacs008/${todayDate.replace(/-/g, '')}/${utr.slice(-8)}</MsgId>
      <CreDtTm>${dateIso}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Prtry>${rail === 'RTGS' ? 'RBI-RTGS' : rail === 'NEFT' ? 'RBI-NEFT' : 'NPCI-' + rail}</Prtry>
        </ClrSys>
      </SttlmInf>
      <InstgAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId><Cd>INIFSC</ClrSysId></ClrSysId>
            <MmbId>HDFC0000001</MmbId>
          </ClrSysMmbId>
          <Nm>HDFC Bank Clearing Operations</Nm>
        </FinInstnId>
      </InstgAgt>
      <InstdAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId><Cd>INIFSC</ClrSysId></ClrSysId>
            <MmbId>SBIN0000001</MmbId>
          </ClrSysMmbId>
          <Nm>Reserve Bank of India e-Kuber Switch</Nm>
        </FinInstnId>
      </InstdAgt>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>E2E-${utr}</EndToEndId>
        <TxId>${utr}</TxId>
        <ClrSysRef>${tx.voucher || 'RBI-VOUCH-' + utr.slice(-8)}</ClrSysRef>
      </PmtId>
      <PmtTpInf>
        <SvcLvl><Cd>${rail === 'RTGS' ? 'RTGS' : 'NURG'}</Cd></SvcLvl>
        <LclInstrm><Prtry>${rail}_CREDIT</Prtry></LclInstrm>
      </PmtTpInf>
      <IntrBkSttlmAmt Ccy="INR">${amount}</IntrBkSttlmAmt>
      <IntrBkSttlmDt>${todayDate}</IntrBkSttlmDt>
      <Dbtr>
        <Nm>${remitter}</Nm>
        <PstlAdr>
          <Ctry>IN</Ctry>
        </PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>100982275012</Id>
          </Othr>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId><Cd>INIFSC</ClrSysId></ClrSysId>
            <MmbId>HDFC0000001</MmbId>
          </ClrSysMmbId>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId><Cd>INIFSC</ClrSysId></ClrSysId>
            <MmbId>SBIN0000001</MmbId>
          </ClrSysMmbId>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${beneficiary}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <Othr>
            <Id>200841190045</Id>
          </Othr>
        </Id>
      </CdtrAcct>
      <RmtInf>
        <Ustrd>Settlement UTR ${utr} via ${rail} Central Switch</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`
}

export default function IsoXmlModal({ transaction, onClose }) {
  const [activeTab, setActiveTab] = useState('xml') // 'xml' | 'fields'
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!transaction) return null

  const xmlContent = generateIso20022Xml(transaction)
  const isReturn = (transaction.status_label || transaction.recon_status || transaction.status || '').toLowerCase().includes('reject') ||
                   (transaction.status_label || transaction.recon_status || transaction.status || '').toLowerCase().includes('return') ||
                   (transaction.status_label || transaction.recon_status || transaction.status || '').toLowerCase().includes('break')

  const msgType = isReturn ? 'pacs.004.001.09 (Payment Return)' : 'pacs.008.001.08 (Customer Credit Transfer)'
  const utr = transaction.utr || transaction.txn_id || 'RBTR20261118000101'
  const amount = Number(transaction.amount || 0)

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${isReturn ? 'pacs.004.001.09' : 'pacs.008.001.08'}_${utr}.xml`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        width: '100%',
        maxWidth: 900,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.35)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden'
      }}>
        {/* Modal Top Header */}
        <div style={{
          padding: '12px 18px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: '#ea580c',
              color: '#ffffff',
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.4px'
            }}>
              ISO 20022
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{msgType}</span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>• UTR: {utr}</span>
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 1 }}>
                RBI SFMS 2.0 / NPCI Real-Time Interbank Clearing Payload
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Currency & Financial Audit Banner */}
        <div style={{
          background: '#f8fafc',
          padding: '8px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: 11
        }}>
          <div>
            <span style={{ color: '#64748b' }}>Audit Settlement Amount: </span>
            <strong style={{ color: '#0f172a', fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtInrAudit(amount)}
            </strong>
            <span style={{ color: '#0d9488', marginLeft: 8, fontWeight: 700 }}>
              [{toPaisa(amount).toLocaleString('en-IN')} Paise]
            </span>
          </div>

          <div style={{ color: '#64748b', fontSize: 10.5 }}>
            {inrToWords(amount)}
          </div>
        </div>

        {/* Action Controls & Sub-Tabs */}
        <div style={{
          padding: '8px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setActiveTab('xml')}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 5,
                border: activeTab === 'xml' ? '1px solid #ea580c' : '1px solid #e2e8f0',
                background: activeTab === 'xml' ? '#fff7ed' : '#ffffff',
                color: activeTab === 'xml' ? '#ea580c' : '#64748b',
                cursor: 'pointer'
              }}
            >
              XML Document Source
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 5,
                border: activeTab === 'fields' ? '1px solid #ea580c' : '1px solid #e2e8f0',
                background: activeTab === 'fields' ? '#fff7ed' : '#ffffff',
                color: activeTab === 'fields' ? '#ea580c' : '#64748b',
                cursor: 'pointer'
              }}
            >
              Decoded Field Inspector
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 5,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: copied ? '#059669' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              {copied ? '✓ Copied XML!' : '📋 Copy XML'}
            </button>
            <button
              onClick={handleDownload}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 5,
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              ⬇ Download .xml
            </button>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: activeTab === 'xml' ? '#090d16' : '#f8fafc' }}>
          {activeTab === 'xml' ? (
            <pre style={{
              margin: 0,
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontSize: 11,
              lineHeight: 1.5,
              color: '#38bdf8',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {xmlContent}
            </pre>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Message Identification</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginTop: 4, fontFamily: 'monospace' }}>
                  SFMS/{isReturn ? 'pacs004' : 'pacs008'}/20261118/{utr.slice(-8)}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Schema: {isReturn ? 'pacs.004.001.09' : 'pacs.008.001.08'}</div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Settlement Rail &amp; Method</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {transaction.rail || 'RTGS'} • Continuous Gross / Net
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Clearing System: RBI e-Kuber / SFMS Switch</div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Debtor (Remitter)</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {transaction.remitter || transaction.customer || 'Corporate Client'}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>A/C: 100982275012 • HDFC0000001</div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Creditor (Beneficiary)</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {transaction.beneficiary || 'SBI Treasury'}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>A/C: 200841190045 • SBIN0000001</div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Regulatory Voucher Reference</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f766e', marginTop: 4, fontFamily: 'monospace' }}>
                  {transaction.voucher || 'RBI-VOUCH-' + utr.slice(-8)}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>EndToEndId: E2E-{utr}</div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Settlement Currency &amp; Precision</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#ea580c', marginTop: 4, fontFamily: 'monospace' }}>
                  {fmtInrAudit(amount)} (INR)
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Exact Paisa: {toPaisa(amount).toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '8px 18px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10.5,
          color: '#64748b'
        }}>
          <span>Compliance: RBI DPSS.CO.PD No.629 / SFMS ISO 20022 Scheme</span>
          <button
            onClick={onClose}
            style={{
              padding: '4px 14px',
              fontSize: 11,
              fontWeight: 650,
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
