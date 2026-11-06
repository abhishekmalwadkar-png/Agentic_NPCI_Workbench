import React, { useState, useEffect, useRef, useCallback } from 'react'

// Comprehensive Multi-Rail Architecture Configurations for all 8 NPCI Payment Rails
export const RAIL_FLOW_CONFIGS = {
  UPI: {
    code: 'UPI',
    name: 'UPI Reconciliation – Agentic Automation Flow',
    subtitle: 'End-to-End Orchestration: 4 Inbound Settlement Feeds → AI Reconciler Agent → 3 Execution Tools',
    tagline: 'Real-time 24x7 Mobile P2P/P2M Clearing & Auto-Reversals',
    icon: '⚡',
    category: 'Instant & Mobile',
    badgeColor: '#ea580c',
    agent: {
      name: 'AI Reconciler Agent',
      workflow: 'Workflow: "UPI Reconciliation Engine"',
      desc: 'AUTONOMOUS ORCHESTRATION & 4-WAY MATCHING CORE',
      sla: 'RBI T+1 Mandate (Circular DPSS.CO.PD No.629)'
    },
    feeds: [
      {
        id: 'feed_0',
        name: 'UPI Settlement Master',
        tag: 'Central Rail',
        icon: '▦',
        file: 'NPCI_UPI_Settlement_Master.csv',
        schema: 'RRN, TXN_ID, UTR, RAIL, CYCLE_ID, AMOUNT, STATUS',
        desc: 'Official net clearing & settlement raw record across 6 daily cut-offs.'
      },
      {
        id: 'feed_1',
        name: 'Payment Switch Logs',
        tag: 'Base24',
        icon: '⚡',
        file: 'Switch_Base24_Logs.csv',
        schema: 'RRN, SWITCH_STATUS, SWITCH_RESP_CODE',
        desc: 'Real-time gateway authorization (00=Auth, 91=Timeout, 96=Error).'
      },
      {
        id: 'feed_2',
        name: 'Core Banking (CBS)',
        tag: 'Finacle',
        icon: '🏛',
        file: 'Finacle_CBS_Dump.csv',
        schema: 'RRN, CBS_AMOUNT, CBS_STATUS, ACCOUNT_NO',
        desc: 'Bank customer ledger debits, account postings, debit states.'
      },
      {
        id: 'feed_3',
        name: 'GL Suspense Pool',
        tag: 'Ledger',
        icon: '📊',
        file: 'GL_Suspense_Pool.csv',
        schema: 'RRN, GL_AMOUNT, GL_STATUS',
        desc: 'Inter-bank settlement suspense balance (GL-14020).'
      }
    ],
    tools: [
      {
        id: 'tool_0',
        name: 'Zero-Delta GL Knock-Off',
        trigger: 'Trigger: STP Matched (99.95%)',
        workflow: 'AE Workflow: UPI_ZeroDelta_GL_KnockOff.psw',
        desc: 'Automated ledger accounting workflow that balances suspense GL accounts for matched transactions.',
        action: 'Posts zero-delta balancing entry between GL-14020 & GL-11010',
        result: '₹0.00 ledger variance & instant settlement closure'
      },
      {
        id: 'tool_1',
        name: 'CBS Auto-Refund Execution',
        trigger: 'Trigger: Auto-Refund < ₹5,000 (Deemed Fails)',
        workflow: 'AE Workflow: UPI_CBS_Execution_Bot.psw',
        desc: 'Automated refund workflow executing instant account reversals for deemed failure timeouts under ₹5,000.',
        action: 'Calls Finacle CBS reversal API & credits customer account',
        result: '100% compliance with RBI T+1 TAT circular (stops penalty clock)'
      },
      {
        id: 'tool_2',
        name: 'AI Exception & HITL Dispatcher',
        trigger: 'Trigger: High Value (>₹10k) / Mismatches',
        workflow: 'AE Workflow: UPI_AI_DualTrack_Dispatcher.psw',
        desc: 'Agentic AI packager compiling multi-system evidence dossiers for Operations Manager Cockpit.',
        action: 'Correlates Switch & CBS logs with 94% AI confidence score',
        result: '1-click maker-checker sign-off with cryptographic audit seal'
      }
    ]
  },

  IMPS: {
    code: 'IMPS',
    name: 'IMPS Interbank Settlement – Agentic Automation Flow',
    subtitle: 'End-to-End Orchestration: 4 Inbound Interbank Feeds → AI IMPS Reconciler Agent → 3 Execution Tools',
    tagline: 'Instant 24x7 Interbank Account-to-Account Settlement',
    icon: '💸',
    category: 'Instant & Mobile',
    badgeColor: '#6366f1',
    agent: {
      name: 'AI IMPS Settlement Agent',
      workflow: 'Workflow: "IMPS Multi-Leg Settlement Core"',
      desc: 'AUTONOMOUS INTERBANK CORRELATION & TIMEOUT RESOLUTION',
      sla: 'Immediate Settlement Obligation (Sub-minute Remitter Returns)'
    },
    feeds: [
      {
        id: 'feed_0',
        name: 'IMPS Clearing Master',
        tag: 'Central Rail',
        icon: '▦',
        file: 'NPCI_IMPS_Clearing_Master.csv',
        schema: 'RRN, REMITTER_BANK, BENEFICIARY_BANK, UTR, AMOUNT, STATUS',
        desc: 'Continuous 24x7 interbank clearing settlement stream.'
      },
      {
        id: 'feed_1',
        name: 'Interbank Switch Feed',
        tag: 'Base24-eps',
        icon: '⚡',
        file: 'Switch_Base24_IMPS.csv',
        schema: 'RRN, SWITCH_RESP_CODE, NETWORK_LATENCY_MS',
        desc: 'ISO-8583 switch logs (00=Success, 91=Beneficiary Drop, 96=System Error).'
      },
      {
        id: 'feed_2',
        name: 'Core Banking (CBS Host)',
        tag: 'Finacle',
        icon: '🏛',
        file: 'Finacle_CBS_IMPS_Dump.csv',
        schema: 'RRN, REMITTER_ACC, BENEFICIARY_ACC, CBS_STATUS',
        desc: 'Remitter bank debit vouchers and beneficiary posting records.'
      },
      {
        id: 'feed_3',
        name: 'RBI RTGS Net Pool',
        tag: 'Ledger',
        icon: '📊',
        file: 'RTGS_Settlement_Pool_GL9902.csv',
        schema: 'RRN, NET_CYCLE_ID, RBI_VOUCHER_NO, POOL_BALANCE',
        desc: 'Multilateral net settlement pool voucher against RBI RTGS account.'
      }
    ],
    tools: [
      {
        id: 'tool_0',
        name: 'RTGS Net Settlement Knock-Off',
        trigger: 'Trigger: STP Matched (99.92%)',
        workflow: 'AE Workflow: IMPS_RTGS_NetSettlement_KnockOff.psw',
        desc: 'Autonomous batch reconciliation posting net obligation vouchers to Core RBI settlement account.',
        action: 'Knocks off interbank settlement pool against RBI RTGS cycle obligations',
        result: 'Zero interbank exposure drift across 24x7 clearing cycles'
      },
      {
        id: 'tool_1',
        name: 'RC91 Timeout Auto-Return Bot',
        trigger: 'Trigger: Response Code 91 (Beneficiary Timeout)',
        workflow: 'AE Workflow: IMPS_RC91_Timeout_AutoReturn.psw',
        desc: 'Instantly diagnoses beneficiary system timeouts (<30s) and triggers automated remitter account refund.',
        action: 'Dispatches Finacle credit reversal for unconfirmed beneficiary transfers',
        result: 'Sub-minute return compliance meeting RBI Immediate Obligation mandate'
      },
      {
        id: 'tool_2',
        name: 'IMPS Dispute & Audit Packager',
        trigger: 'Trigger: High Value (>₹50k) / Suspense Breaks',
        workflow: 'AE Workflow: IMPS_AI_DualTrack_Dispatcher.psw',
        desc: 'Autonomous evidence dossier builder for interbank discrepancies and late beneficiary acknowledgments.',
        action: 'Extracts MT-103 / ISO logs and packages SHA-256 evidence certificate',
        result: '1-click bilateral claim filing with cryptographic audit trail'
      }
    ]
  },

  NACH: {
    code: 'NACH',
    name: 'NACH Bulk Mandates – Agentic Automation Flow',
    subtitle: 'End-to-End Orchestration: 4 High-Volume Presentation Feeds → AI NACH Batch Agent → 3 Execution Tools',
    tagline: 'High-Volume Bulk Direct Debit, Mandates, Salary & Dividend Clearing',
    icon: '🔄',
    category: 'Bulk & Mandates',
    badgeColor: '#059669',
    agent: {
      name: 'AI NACH Batch Agent',
      workflow: 'Workflow: "NACH High-Volume Mandate Core"',
      desc: 'AUTONOMOUS 500K+ BATCH MATCHING & RETURN REASON CLASSIFIER',
      sla: 'Session 1 & 2 Cut-off Windows (Strict RBI Cut-off Compliance)'
    },
    feeds: [
      {
        id: 'feed_0',
        name: 'ACH Inward Presentation Batch',
        tag: 'NPCI ACH',
        icon: '▦',
        file: 'NPCI_ACH_Inward_Presentation.txt',
        schema: 'UMRN, PRESENTMENT_REF, AMOUNT, SPONSOR_BANK, USER_NUMBER',
        desc: 'Official Session 1 & 2 bulk debit presentations (up to 10M records).'
      },
      {
        id: 'feed_1',
        name: 'E-Mandate Vault Registry',
        tag: 'NPCI Vault',
        icon: '⚡',
        file: 'UMRN_Mandate_Registry.csv',
        schema: 'UMRN, CUSTOMER_ACC, MAX_AMOUNT, START_DATE, EXPIRY_DATE',
        desc: 'Active cryptographic mandate limits and customer authorization tokens.'
      },
      {
        id: 'feed_2',
        name: 'CBS Bulk Debit Engine',
        tag: 'Finacle',
        icon: '🏛',
        file: 'Finacle_Bulk_Mandate_Dump.csv',
        schema: 'UMRN, POSTING_STATUS, CBS_ERROR_CODE, AVAILABLE_BAL',
        desc: 'Core banking batch posting results and account debit verification.'
      },
      {
        id: 'feed_3',
        name: 'Sundry Clearing Pool',
        tag: 'Ledger',
        icon: '📊',
        file: 'Sundry_Clearing_GL9903.csv',
        schema: 'UMRN, CLEARING_BATCH_ID, GL_POSTING_REF, STATUS',
        desc: 'Intermediate clearing sundry account balance (GL-9903).'
      }
    ],
    tools: [
      {
        id: 'tool_0',
        name: 'Bulk Zero-Delta GL Knock-Off',
        trigger: 'Trigger: Mandate Matched & Debited (98.8%)',
        workflow: 'AE Workflow: NACH_ZeroDelta_GL_KnockOff.psw',
        desc: 'Autonomously closes bulk sundry ledger balances and credits destination institutional accounts.',
        action: 'Posts consolidated net debit voucher from Sundry GL-9903 to RBI settlement',
        result: 'Total settlement closure before Session cut-off deadline'
      },
      {
        id: 'tool_1',
        name: 'ACH Auto-Return Memo Bot',
        trigger: 'Trigger: Return Codes M01, M03, M10',
        workflow: 'AE Workflow: NACH_Auto_Return_Memo_Bot.psw',
        desc: 'Parses failed debits (insufficient funds, account closed) and auto-compiles standard return memo files.',
        action: 'Formats NPCI standard return XML and dispatches to Clearing House',
        result: '100% on-time return submission avoiding sponsor bank statutory penalties'
      },
      {
        id: 'tool_2',
        name: 'Mandate Compliance & Audit Dispatcher',
        trigger: 'Trigger: Mandate Drift / UMRN Mismatch',
        workflow: 'AE Workflow: NACH_Mandate_Compliance_Dispatcher.psw',
        desc: 'AI compliance inspector flagging mandate cap overruns, signature drift, and expired authorizations.',
        action: 'Compiles customer mandate agreement vs presentation audit proof',
        result: 'Zero unauthorized debit liabilities under RBI Consumer Protection Act'
      }
    ]
  },

  AEPS: {
    code: 'AEPS',
    name: 'AePS Micro-ATM – Agentic Automation Flow',
    subtitle: 'End-to-End Orchestration: 4 Biometric & Terminal Feeds → AI AePS Settlement Agent → 3 Execution Tools',
    tagline: 'Biometric Micro-ATM Clearing & BC Agent Settlement',
    icon: '👆',
    category: 'Cards & Biometrics',
    badgeColor: '#d97706',
    agent: {
      name: 'AI AePS Biometric Agent',
      workflow: 'Workflow: "AePS Biometric 4-Way Matching Core"',
      desc: 'TERMINAL-TO-UIDAI HARDWARE CORRELATION & FLOAT REBALANCING',
      sla: 'RBI Financial Inclusion T+1 Customer Protection Standard'
    },
    feeds: [
      {
        id: 'feed_0',
        name: 'AePS Central Switch Master',
        tag: 'Central Rail',
        icon: '▦',
        file: 'NPCI_AePS_Settlement_Master.csv',
        schema: 'RRN, AADHAAR_HASH, BC_AGENT_ID, TERMINAL_ID, AMOUNT',
        desc: 'NPCI financial inclusion interbank micro-ATM clearing master.'
      },
      {
        id: 'feed_1',
        name: 'UIDAI Biometric Auth Log',
        tag: 'UIDAI Host',
        icon: '⚡',
        file: 'UIDAI_Aadhaar_Auth_Gateway.csv',
        schema: 'AADHAAR_HASH, AUTH_TOKEN, BIOMETRIC_MATCH_SCORE, TIMESTAMP',
        desc: 'UIDAI biometric authentication tokens and liveness validation logs.'
      },
      {
        id: 'feed_2',
        name: 'Micro-ATM Terminal Journal',
        tag: 'Micro-ATM',
        icon: '🏛',
        file: 'BC_Device_Terminal_Journal.csv',
        schema: 'RRN, TERMINAL_ID, CASH_DISPENSED_FLAG, PRINTER_STATUS',
        desc: 'Edge hardware device journal recording physical cash dispensing events.'
      },
      {
        id: 'feed_3',
        name: 'BC Float & Suspense GL',
        tag: 'Ledger',
        icon: '📊',
        file: 'BC_Agent_Float_GL9904.csv',
        schema: 'BC_AGENT_ID, FLOAT_BALANCE, SUSPENSE_AMOUNT, GL_REF',
        desc: 'Business Correspondent operational working float ledger (GL-9904).'
      }
    ],
    tools: [
      {
        id: 'tool_0',
        name: 'BC Agent Float Rebalancer',
        trigger: 'Trigger: Biometric + Cash Dispensed Matched',
        workflow: 'AE Workflow: AePS_MicroATM_Float_KnockOff.psw',
        desc: 'Instantly replenishes Business Correspondent float balance for confirmed cash withdrawals.',
        action: 'Credits BC operating account from Central Financial Inclusion Pool',
        result: 'Uninterrupted rural liquidity at remote micro-ATM touchpoints'
      },
      {
        id: 'tool_1',
        name: 'Micro-ATM Hardware Timeout Bot',
        trigger: 'Trigger: Cash Jam / Terminal Timeout',
        workflow: 'AE Workflow: AePS_Terminal_Timeout_Resolver.psw',
        desc: 'Resolves scenarios where customer account was debited but micro-ATM hardware jammed or timed out.',
        action: 'Dispatches immediate auto-reversal to customer Aadhaar-linked account',
        result: 'Strict adherence to RBI Financial Inclusion T+1 customer protection norms'
      },
      {
        id: 'tool_2',
        name: 'AePS Audit Pack & Risk Dispatcher',
        trigger: 'Trigger: Biometric Score Variance / Fraud Alert',
        workflow: 'AE Workflow: AePS_BC_Audit_Pack_Dispatcher.psw',
        desc: 'Packages device geolocation, biometric score telemetry, and agent float records for audit review.',
        action: 'Correlates micro-ATM terminal GPS vs agent registered branch location',
        result: 'Tamper-proof compliance dossier for RBI Financial Inclusion inspections'
      }
    ]
  },

  RUPAY: {
    code: 'RUPAY',
    name: 'RuPay Card Clearing – Agentic Automation Flow',
    subtitle: 'End-to-End Orchestration: 4 Multi-Channel Feeds → AI RuPay Interchange Agent → 3 Execution Tools',
    tagline: 'Domestic Debit/Credit/Prepaid Card Interchange & Chargeback Settlement',
    icon: '💳',
    category: 'Cards & Biometrics',
    badgeColor: '#ea580c',
    agent: {
      name: 'AI RuPay Interchange Agent',
      workflow: 'Workflow: "RuPay Dual-Message Interchange Reconciler"',
      desc: 'AUTONOMOUS PRESENTMENT MATCHING, MDR SPLITS & CHARGEBACKS',
      sla: 'RBI T+1 Card Harmonization & Dispute Resolution Mandate'
    },
    feeds: [
      {
        id: 'feed_0',
        name: 'RuPay Central Raw Clearing',
        tag: 'RuPay Switch',
        icon: '▦',
        file: 'NPCI_RuPay_EPX_Settlement.dat',
        schema: 'EPX_SEQ, PAN_HASH, CHANNEL, INTERCHANGE_FEE, NET_SETTLEMENT',
        desc: 'Raw IPM/EPX file across ATM, POS, and E-Commerce daily windows.'
      },
      {
        id: 'feed_1',
        name: 'Card Switch Gateway Logs',
        tag: 'Base24-eps',
        icon: '⚡',
        file: 'Base24_EPS_Acquirer_Logs.csv',
        schema: 'STAN, AUTH_CODE, PAN_HASH, TERMINAL_TYPE, RESP_CODE',
        desc: 'Real-time card authorization messages and dual-message tokens.'
      },
      {
        id: 'feed_2',
        name: 'Card Management System (CMS)',
        tag: 'Card Core',
        icon: '🏛',
        file: 'VisionPLUS_CMS_Dump.csv',
        schema: 'PAN_HASH, POSTED_AMOUNT, BILLING_CURRENCY, FEE_CODE',
        desc: 'Cardholder billing core records, ledger entries, and interchange debits.'
      },
      {
        id: 'feed_3',
        name: 'Interchange & Surcharge GL',
        tag: 'Ledger',
        icon: '📊',
        file: 'RuPay_Interchange_GL9905.csv',
        schema: 'STAN, ACQUIRER_GL, ISSUER_GL, SURCHARGE_WAIVER, NET_POOL',
        desc: 'Interchange fee pool and fuel/IRCTC surcharge waiver ledger (GL-9905).'
      }
    ],
    tools: [
      {
        id: 'tool_0',
        name: 'Interchange Fee & Surcharge Knock-Off',
        trigger: 'Trigger: Dual-Message Matched (99.85%)',
        workflow: 'AE Workflow: RuPay_Interchange_GL_KnockOff.psw',
        desc: 'Calculates exact basis point splits between Acquirer, Issuer, and NPCI platform fees.',
        action: 'Posts net clearing balancing vouchers across 4 daily clearing sessions',
        result: 'Exact zero-variance merchant and interbank fee settlement closure'
      },
      {
        id: 'tool_1',
        name: 'Card Auto-Reversal Execution Bot',
        trigger: 'Trigger: ATM/POS Cash Dispense Deemed Fails',
        workflow: 'AE Workflow: RuPay_Card_Reversal_Bot.psw',
        desc: 'Autonomously credits cardholder accounts for failed ATM cash dispenses or unfulfilled POS swipes.',
        action: 'Calls Card Core API to unfreeze held balances and execute instant credit',
        result: '100% compliance with RBI T+1 card harmonization penalty guidelines'
      },
      {
        id: 'tool_2',
        name: 'RuPay Dispute & Arbitration Bot',
        trigger: 'Trigger: Chargebacks (CB-01/04) & Arbitration',
        workflow: 'AE Workflow: RuPay_Chargeback_Filing_Bot.psw',
        desc: 'Prepares documentation, chargeback reason classification, and representment evidence dossiers.',
        action: 'Packages chargeback defense payload into NPCI Dispute Management System',
        result: 'Automated representment defense protecting bank from unjust chargebacks'
      }
    ]
  },

  CTS: {
    code: 'CTS',
    name: 'CTS Cheque Clearing – Agentic Automation Flow',
    subtitle: 'End-to-End Orchestration: 4 Grid Clearing Feeds → AI CTS Image Agent → 3 Execution Tools',
    tagline: 'Image-Based Electronic Physical Cheque Clearing & Return Memos',
    icon: '📝',
    category: 'Bulk & Cheque',
    badgeColor: '#475569',
    agent: {
      name: 'AI CTS Image Agent',
      workflow: 'Workflow: "CTS-2010 Grid Clearing Reconciler"',
      desc: 'AUTONOMOUS MICR CHECKSUM, UV IMAGE PACK & NET OBLIGATION MATCHING',
      sla: 'Grid Session T+1 Value Dating & Section 138 NI Act Compliance'
    },
    feeds: [
      {
        id: 'feed_0',
        name: 'CTS Clearing House PRS Grid',
        tag: 'NPCI CHI',
        icon: '▦',
        file: 'CTS_Clearing_PRS_Grid.xml',
        schema: 'BUNDLE_ID, MICR_BAND, PRESENTING_BANK, PAYEE_BANK, AMOUNT',
        desc: 'National grid clearing house presentation XML across regional clearing grids.'
      },
      {
        id: 'feed_1',
        name: 'Scanner UV & Grayscale Images',
        tag: 'Scanner Vault',
        icon: '⚡',
        file: 'Branch_Cheque_Scan_MICR.csv',
        schema: 'CHQ_SERIAL, MICR_CODE, UV_FLAG, GRAYSCALE_SHA256, OCR_AMOUNT',
        desc: 'Branch UV image inspection data, 9-digit MICR checksums, and image hashes.'
      },
      {
        id: 'feed_2',
        name: 'Finacle Cheque Clearing Core',
        tag: 'Finacle',
        icon: '🏛',
        file: 'Finacle_Cheque_Clearing.csv',
        schema: 'ACCOUNT_NO, CHQ_SERIAL, SIGNATURE_VERIFY, STOP_PAY_FLAG',
        desc: 'Core banking signature verification records, stop payments, and clearing holds.'
      },
      {
        id: 'feed_3',
        name: 'RBI Clearing Settlement Pool',
        tag: 'Ledger',
        icon: '📊',
        file: 'RBI_Clearing_GL9906.csv',
        schema: 'GRID_SESSION_ID, PRESENTMENT_SUM, RETURN_SUM, NET_RBI_POSTING',
        desc: 'Net clearing obligation settlement pool account (GL-9906).'
      }
    ],
    tools: [
      {
        id: 'tool_0',
        name: 'CTS Net Settlement Knock-Off',
        trigger: 'Trigger: Cheque Image & Signature Verified',
        workflow: 'AE Workflow: CTS_Grid_Settlement_KnockOff.psw',
        desc: 'Reconciles outward presentation figures with clearing house net inward settlement obligations.',
        action: 'Posts net settlement voucher between Clearing Pool GL-9906 & RBI current account',
        result: 'Same-day value date credit execution conforming to CTS grid rules'
      },
      {
        id: 'tool_1',
        name: 'Section 138 Legal Return Memo Bot',
        trigger: 'Trigger: Dishonour Codes 88 (Funds) / 89 (Signature)',
        workflow: 'AE Workflow: CTS_Section138_ReturnMemo_Bot.psw',
        desc: 'Autonomously drafts and dispatches statutory return memos required under Section 138 of NI Act.',
        action: 'Generates signed electronic return memo with formal dishonour seal',
        result: 'Statutory legal compliance for unpaid instruments returned before grid cut-off'
      },
      {
        id: 'tool_2',
        name: 'CTS Fraud & Alteration Inspector',
        trigger: 'Trigger: Image Alteration / UV Feature Mismatch',
        workflow: 'AE Workflow: CTS_Digital_Audit_Seal_Dispatcher.psw',
        desc: 'Forensic AI scanner cross-checking UV band security features against physical cheque standards.',
        action: 'Flags fraudulent cheque alterations to Branch Operations and Legal Cell',
        result: 'Cryptographic audit proof preventing counterfeit cheque presentation losses'
      }
    ]
  },

  BBPS: {
    code: 'BBPS',
    name: 'BBPS Utility Clearing – Agentic Automation Flow',
    subtitle: 'End-to-End Orchestration: 4 Multi-Party Bill Feeds → AI BBPS Clearing Agent → 3 Execution Tools',
    tagline: 'Interoperable Utility, Telecom, Gas & Municipal Bill Settlement',
    icon: '🧾',
    category: 'Utility & Transit',
    badgeColor: '#0284c7',
    agent: {
      name: 'AI BBPS Clearing Agent',
      workflow: 'Workflow: "BBPS Multi-Party Settlement Reconciler"',
      desc: 'TRI-PARTY BOU/COU RECONCILIATION & INTER-BILLER ESCROW SETTLEMENT',
      sla: 'RBI DPSS BBPS Biller Operating Mandate (Next-Day Bill Credits)'
    },
    feeds: [
      {
        id: 'feed_0',
        name: 'BBPCU Central Daily Clearing',
        tag: 'Central BBPCU',
        icon: '▦',
        file: 'BBPCU_Daily_Settlement_Feed.csv',
        schema: 'TXN_REF, BILLER_ID, COU_ID, BOU_ID, BILL_AMOUNT, STATUS',
        desc: 'NPCI Bharat BillPay Central Unit consolidated multi-category clearing feed.'
      },
      {
        id: 'feed_1',
        name: 'COU Customer Payment Receipts',
        tag: 'COU Gateway',
        icon: '⚡',
        file: 'COU_Customer_Receipts.csv',
        schema: 'TXN_REF, CONSUMER_ACC, BILLER_ACC, CONVENIENCE_FEE',
        desc: 'Originating customer bank / app collection receipts and timestamp logs.'
      },
      {
        id: 'feed_2',
        name: 'BOU Utility Aggregator Vouchers',
        tag: 'Biller BOU',
        icon: '🏛',
        file: 'BOU_Utility_Clearing_Ack.csv',
        schema: 'BILLER_ID, CONSUMER_REF, VOUCHER_REF, RECKONING_STATUS',
        desc: 'Biller operating unit clearance acknowledgments and utility account updates.'
      },
      {
        id: 'feed_3',
        name: 'BBPS Escrow Pool Ledger',
        tag: 'Ledger',
        icon: '📊',
        file: 'BBPS_Escrow_Pool_GL9907.csv',
        schema: 'TXN_REF, ESCROW_DEBIT, BOU_CREDIT, COMMISSION_GL',
        desc: 'Inter-biller settlement escrow account and commission split pool (GL-9907).'
      }
    ],
    tools: [
      {
        id: 'tool_0',
        name: 'Inter-Biller Commission Knock-Off',
        trigger: 'Trigger: Tri-Party Receipts Matched (99.8%)',
        workflow: 'AE Workflow: BBPS_InterBiller_GL_KnockOff.psw',
        desc: 'Balances COU convenience fee shares, BOU clearing splits, and NPCI switch margins.',
        action: 'Dispatches multi-party escrow release vouchers to destination utility accounts',
        result: 'Guaranteed next-day bill credit honoring state utility commission mandates'
      },
      {
        id: 'tool_1',
        name: 'BBPS Double-Debit Auto-Refund Bot',
        trigger: 'Trigger: Customer Debited but Utility Uncredited',
        workflow: 'AE Workflow: BBPS_DoubleDebit_Refund_Bot.psw',
        desc: 'Detects biller API timeouts where customer was debited but utility bill remains unpaid.',
        action: 'Calls Core Banking API to reverse consumer debit and cancel unposted voucher',
        result: '100% compliance with RBI T+1 customer refund mandate for utility failures'
      },
      {
        id: 'tool_2',
        name: 'BBPS Dispute & Commission Dispatcher',
        trigger: 'Trigger: Biller Operating Unit Variance / Dispute',
        workflow: 'AE Workflow: BBPS_Commission_Split_Dispatcher.psw',
        desc: 'Packages bill payment dispute evidence, timestamp receipts, and BOU delivery confirmations.',
        action: 'Submits structured dispute package directly to BBPCU dispute portal',
        result: 'Automated resolution of consumer bill payment complaints within 24 hours'
      }
    ]
  },

  NETC: {
    code: 'NETC',
    name: 'NETC FASTag Toll – Agentic Automation Flow',
    subtitle: 'End-to-End Orchestration: 4 Highway Plaza Feeds → AI FASTag Transit Agent → 3 Execution Tools',
    tagline: 'RFID Highway Toll Plaza Clearing & Concessionaire Reconciliation',
    icon: '🚗',
    category: 'Utility & Transit',
    badgeColor: '#16a34a',
    agent: {
      name: 'AI FASTag Transit Agent',
      workflow: 'Workflow: "NETC FASTag Transit Reconciliation Core"',
      desc: 'PLAZA LANE READER CORRELATION, MULTI-ANTENNA DEDUPLICATION & RECOVERY',
      sla: 'NHAI / IHMCL Concessionaire Settlement Standard'
    },
    feeds: [
      {
        id: 'feed_0',
        name: 'Plaza Lane Reader XML Feed',
        tag: 'Toll Plaza',
        icon: '▦',
        file: 'Plaza_Lane_RFID_Trans.xml',
        schema: 'TAG_ID, PLAZA_CODE, LANE_ID, VEHICLE_REG_NO, TOLL_AMOUNT',
        desc: 'Hourly RFID antenna scan logs collected across national & state highway plazas.'
      },
      {
        id: 'feed_1',
        name: 'NETC Central Switch & Mapper',
        tag: 'Central Mapper',
        icon: '⚡',
        file: 'NPCI_NETC_Mapper_Clearing.csv',
        schema: 'TAG_ID, ISSUER_BANK, ACQUIRER_BANK, TAG_STATUS, EPC_CODE',
        desc: 'NPCI vehicle-to-tag cryptographic registry, tag status (Active/Low/Blacklist).'
      },
      {
        id: 'feed_2',
        name: 'FASTag Wallet Core (CBS)',
        tag: 'Wallet Host',
        icon: '🏛',
        file: 'FASTag_Wallet_CBS_Dump.csv',
        schema: 'TAG_ID, WALLET_BALANCE, DEBIT_AUTH_REF, TRANSACTION_STATUS',
        desc: 'Issuer bank customer prepaid FASTag wallet debits and transaction balances.'
      },
      {
        id: 'feed_3',
        name: 'Concessionaire Net Pool GL',
        tag: 'Ledger',
        icon: '📊',
        file: 'NETC_Concessionaire_GL9908.csv',
        schema: 'PLAZA_CODE, CONCESSIONAIRE_ACC, TOLL_COLLECTED, SUSPENSE_BAL',
        desc: 'Highway concessionaire net settlement pool and dispute escrow (GL-9908).'
      }
    ],
    tools: [
      {
        id: 'tool_0',
        name: 'Concessionaire Settlement Knock-Off',
        trigger: 'Trigger: Plaza Reader + Wallet Matched (99.9%)',
        workflow: 'AE Workflow: NETC_Concessionaire_GL_KnockOff.psw',
        desc: 'Reconciles toll plaza concessionaire claims against issuer wallet deductions.',
        action: 'Releases consolidated hourly toll payments to NHAI Concessionaire accounts',
        result: 'Zero dispute exposure for highway operators and guaranteed settlement'
      },
      {
        id: 'tool_1',
        name: 'FASTag Double-Debit Auto-Reversal Bot',
        trigger: 'Trigger: Multi-Antenna Double-Toll Read',
        workflow: 'AE Workflow: NETC_MultiAntenna_DoubleDebit_Bot.psw',
        desc: 'Detects duplicate toll charges caused by adjacent lane antennas reading the same vehicle tag.',
        action: 'Auto-credits customer FASTag wallet balance within 5 minutes of duplicate read',
        result: 'Stops customer dispute escalation and maintains 100% NHAI SLA compliance'
      },
      {
        id: 'tool_2',
        name: 'NETC Recovery & Violation Dispatcher',
        trigger: 'Trigger: Blacklisted Tag Passage / Overdraft Dispute',
        workflow: 'AE Workflow: NETC_Negative_Balance_Recovery.psw',
        desc: 'Packages high-speed plaza video footage, EPC code, and negative balance audit trail.',
        action: 'Initiates automatic overdraft recovery from linked customer bank savings account',
        result: 'Guaranteed recovery of toll revenue for highway concessionaires'
      }
    ]
  }
}

export const ALL_RAIL_KEYS = ['UPI', 'IMPS', 'NACH', 'AEPS', 'RUPAY', 'CTS', 'BBPS', 'NETC']

export default function AgenticFlowView({
  onTriggerAe,
  reconSummary,
  aeState,
  sidebarCollapsed,
  selectedRailCode = 'UPI',
  onSelectRail
}) {
  const containerRef = useRef(null)
  const feedRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const agentRef = useRef(null)
  const toolRefs = [useRef(null), useRef(null), useRef(null)]

  // Internal active rail state, initialized with selectedRailCode
  const [activeRail, setActiveRail] = useState(selectedRailCode?.toUpperCase() || 'UPI')
  const [lines, setLines] = useState({ in: [], out: [] })
  const [simulating, setSimulating] = useState(true)
  const [activeHighlight, setActiveHighlight] = useState(null)
  const [simStage, setSimStage] = useState('IDLE') // IDLE | INGESTING | MATCHING | DISPATCHING | COMPLETE

  // Keep active rail synced if parent passes new rail
  useEffect(() => {
    if (selectedRailCode && selectedRailCode.toUpperCase() !== activeRail) {
      setActiveRail(selectedRailCode.toUpperCase())
    }
  }, [selectedRailCode])

  const railData = RAIL_FLOW_CONFIGS[activeRail] || RAIL_FLOW_CONFIGS.UPI

  const handleRailChange = (code) => {
    setActiveRail(code)
    if (onSelectRail) {
      onSelectRail(code)
    }
    setTimeout(updatePaths, 60)
  }

  // Pixel-perfect dynamic SVG line calculation
  const updatePaths = useCallback(() => {
    if (!containerRef.current || !agentRef.current) return
    const cRect = containerRef.current.getBoundingClientRect()
    const aRect = agentRef.current.getBoundingClientRect()

    const agentLeft = {
      x: aRect.left - cRect.left,
      y: aRect.top - cRect.top + aRect.height / 2
    }
    const agentRight = {
      x: aRect.right - cRect.left,
      y: aRect.top - cRect.top + aRect.height / 2
    }

    // Inbound lines (4 Feeds -> Agent)
    const inColors = ['#ea580c', '#d97706', '#f59e0b', '#059669']
    const inLines = feedRefs.map((r, i) => {
      if (!r.current) return null
      const rect = r.current.getBoundingClientRect()
      const start = {
        x: rect.right - cRect.left,
        y: rect.top - cRect.top + rect.height / 2
      }
      const dx = agentLeft.x - start.x
      const c1 = start.x + dx * 0.45
      const c2 = agentLeft.x - dx * 0.35
      return {
        id: `in_${i}`,
        d: `M ${start.x} ${start.y} C ${c1} ${start.y}, ${c2} ${agentLeft.y}, ${agentLeft.x} ${agentLeft.y}`,
        color: inColors[i]
      }
    }).filter(Boolean)

    // Outbound lines (Agent -> 3 Tools) - unified vibrant orange theme
    const outConfigs = [
      { color: '#ea580c', label: 'STP Matched' },
      { color: '#f97316', label: 'Auto-Action' },
      { color: '#c2410c', label: 'HITL / Audit' }
    ]

    const outLines = toolRefs.map((r, i) => {
      if (!r.current) return null
      const rect = r.current.getBoundingClientRect()
      const end = {
        x: rect.left - cRect.left,
        y: rect.top - cRect.top + rect.height / 2
      }
      const dx = end.x - agentRight.x
      const c1 = agentRight.x + dx * 0.35
      const c2 = end.x - dx * 0.45
      return {
        id: `out_${i}`,
        d: `M ${agentRight.x} ${agentRight.y} C ${c1} ${agentRight.y}, ${c2} ${end.y}, ${end.x} ${end.y}`,
        ...outConfigs[i]
      }
    }).filter(Boolean)

    setLines({ in: inLines, out: outLines })
  }, [])

  // Auto-track during sidebar expand/collapse animation (smooth 450ms frame loop)
  useEffect(() => {
    let start = performance.now()
    let frameId
    const step = (now) => {
      updatePaths()
      if (now - start < 450) {
        frameId = requestAnimationFrame(step)
      }
    }
    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [sidebarCollapsed, updatePaths, activeRail])

  // ResizeObserver on the container to auto-fit any screen size without glitches
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      updatePaths()
    })
    ro.observe(containerRef.current)
    window.addEventListener('resize', updatePaths)
    const t = setTimeout(updatePaths, 120)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updatePaths)
      clearTimeout(t)
    }
  }, [updatePaths])

  // Optional simulation sequence demo for client presentations
  const runLiveSimulationDemo = () => {
    setSimStage('INGESTING')
    setActiveHighlight('feed_0')
    setTimeout(() => {
      setActiveHighlight('feed_1')
    }, 600)
    setTimeout(() => {
      setActiveHighlight('feed_2')
    }, 1200)
    setTimeout(() => {
      setActiveHighlight('feed_3')
    }, 1800)
    setTimeout(() => {
      setSimStage('MATCHING')
      setActiveHighlight('agent')
    }, 2400)
    setTimeout(() => {
      setSimStage('DISPATCHING')
      setActiveHighlight('tool_0')
    }, 3600)
    setTimeout(() => {
      setActiveHighlight('tool_1')
    }, 4400)
    setTimeout(() => {
      setActiveHighlight('tool_2')
    }, 5200)
    setTimeout(() => {
      setSimStage('COMPLETE')
      setActiveHighlight(null)
      setTimeout(() => setSimStage('IDLE'), 2000)
    }, 6000)
  }

  const stpRate = reconSummary?.stp_rate ? `${reconSummary.stp_rate}%` : '99.95%'

  return (
    <div
      ref={containerRef}
      style={{
        background: '#ffffff',
        color: '#0f172a',
        width: '100%',
        maxWidth: '100%',
        minHeight: 'calc(100vh - 84px)',
        boxSizing: 'border-box',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 8px -1px rgba(15, 23, 42, 0.04)',
        padding: '16px 20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}
    >
      {/* ── 1. TOP HEADER BAR WITH DYNAMIC RAIL TITLE ───────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 12,
        marginBottom: 14
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>{railData.icon}</span>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {railData.name}
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 99,
              background: '#fff7ed',
              color: '#ea580c',
              border: '1px solid #fdba74',
              letterSpacing: '0.4px',
              textTransform: 'uppercase'
            }}>
              {railData.category}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
            {railData.subtitle}
          </div>
        </div>

        {/* Action Controls: Live Interactive Presentation Run */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={runLiveSimulationDemo}
            disabled={simStage !== 'IDLE'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              background: simStage !== 'IDLE' ? '#fff7ed' : '#ffffff',
              color: '#ea580c',
              border: '1.5px solid #ea580c',
              cursor: simStage !== 'IDLE' ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(234, 88, 12, 0.12)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{simStage !== 'IDLE' ? '⚡' : '▶'}</span>
            {simStage === 'IDLE' && 'Simulate Flow'}
            {simStage === 'INGESTING' && 'Step 1: Ingesting 4 Feeds...'}
            {simStage === 'MATCHING' && 'Step 2: AI 4-Way Matching Core...'}
            {simStage === 'DISPATCHING' && 'Step 3: Triggering 3 Tools...'}
            {simStage === 'COMPLETE' && '✓ Orchestration Complete!'}
          </button>
        </div>
      </div>

      {/* ── 2. INTERACTIVE 8-RAIL NAVIGATION SELECTOR ───────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 10,
        marginBottom: 14,
        scrollbarWidth: 'thin'
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', marginRight: 4 }}>
          Select Payment Rail:
        </div>
        {ALL_RAIL_KEYS.map((key) => {
          const cfg = RAIL_FLOW_CONFIGS[key]
          const isActive = activeRail === key
          return (
            <button
              key={key}
              onClick={() => handleRailChange(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 13px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: isActive ? 800 : 600,
                background: isActive ? '#ffffff' : '#f8fafc',
                color: isActive ? '#ea580c' : '#475569',
                border: `1.5px solid ${isActive ? '#ea580c' : '#e2e8f0'}`,
                boxShadow: isActive ? '0 3px 10px rgba(234, 88, 12, 0.22)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                transform: isActive ? 'translateY(-1px)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.transform = 'none'
                }
              }}
            >
              <span>{cfg.icon}</span>
              <span>{key}</span>
              {isActive && (
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#ea580c',
                  marginLeft: 2
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── 3. DYNAMIC SVG CONNECTOR OVERLAY ────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        <defs>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#ea580c" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Inbound Curves (4 Inbound Feeds -> Agent) */}
        {lines.in.map((l) => (
          <path
            key={l.id}
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth="2.4"
            strokeDasharray="6 5"
            opacity="0.9"
            filter="url(#lineGlow)"
            style={{
              animation: simulating ? 'flowDashIn 1.3s linear infinite' : 'none'
            }}
          />
        ))}

        {/* Outbound Curves (Agent -> 3 Execution Tools) */}
        {lines.out.map((l) => (
          <path
            key={l.id}
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth="3.0"
            strokeDasharray="7 5"
            opacity="0.95"
            filter="url(#lineGlow)"
            style={{
              animation: simulating ? 'flowDashOut 1.1s linear infinite' : 'none'
            }}
          />
        ))}
      </svg>

      {/* ── 4. RESPONSIVE 3-COLUMN GRID CONTAINER ──────────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1fr) minmax(280px, 1.3fr) minmax(240px, 1.1fr)',
        gap: 'clamp(12px, 1.8vw, 28px)',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>

        {/* ── COLUMN 1: 4 INBOUND SETTLEMENT FEEDS (LEFT) ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginBottom: 2
          }}>
            <span>◇</span> 4 INBOUND SETTLEMENT LEGS ({activeRail})
          </div>

          {railData.feeds.map((feed, idx) => {
            const isHl = activeHighlight === `feed_${idx}`
            return (
              <div
                key={feed.id}
                ref={feedRefs[idx]}
                onMouseEnter={() => setActiveHighlight(`feed_${idx}`)}
                onMouseLeave={() => setActiveHighlight(null)}
                style={{
                  background: isHl ? '#ffffff' : '#f8fafc',
                  border: `1.5px solid ${isHl ? '#ea580c' : '#e2e8f0'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  boxShadow: isHl ? '0 4px 14px rgba(234, 88, 12, 0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease',
                  transform: isHl ? 'scale(1.02)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: '#ea580c' }}>{feed.icon}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{feed.name}</span>
                  </div>
                  <span style={{
                    fontSize: 9.5,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    fontWeight: 700
                  }}>
                    {feed.tag}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 4px' }}>
                  📄 {feed.file}
                </div>
                <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.35 }}>
                  <strong style={{ color: '#334155' }}>Schema:</strong> {feed.schema}
                </div>
                <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.35, marginTop: 2 }}>
                  {feed.desc}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── COLUMN 2: AUTOMATIONEDGE RECONCILER AGENT (CENTER) ───────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div
            ref={agentRef}
            onMouseEnter={() => setActiveHighlight('agent')}
            onMouseLeave={() => setActiveHighlight(null)}
            style={{
              background: '#ffffff',
              border: `2px solid ${activeHighlight === 'agent' ? '#c2410c' : '#ea580c'}`,
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: activeHighlight === 'agent'
                ? '0 12px 35px rgba(234, 88, 12, 0.25), 0 2px 8px rgba(0, 0, 0, 0.04)'
                : '0 8px 30px rgba(234, 88, 12, 0.14), 0 2px 8px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: 380,
              textAlign: 'center',
              position: 'relative',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
              transform: activeHighlight === 'agent' ? 'scale(1.02)' : 'none'
            }}
          >
            {/* Pulsing halo ring */}
            <div style={{
              position: 'absolute',
              top: -6,
              left: -6,
              right: -6,
              bottom: -6,
              borderRadius: 20,
              border: '2px solid rgba(234, 88, 12, 0.25)',
              animation: simulating ? 'aeAgentPulse 3s infinite ease-in-out' : 'none',
              pointerEvents: 'none'
            }} />

            {/* Glowing Logo Icon (Orange Theme) */}
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#fff7ed',
              border: '2px solid #ea580c',
              margin: '0 auto 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(234, 88, 12, 0.2)'
            }}>
              <img
                src="/favicon.svg"
                alt="AE"
                style={{ width: 34, height: 34 }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {railData.agent.name}
            </div>
            <div style={{ fontSize: 11.5, color: '#ea580c', fontWeight: 700, marginTop: 1 }}>
              {railData.agent.workflow}
            </div>
            <div style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#64748b',
              margin: '4px 0 10px',
              textTransform: 'uppercase'
            }}>
              {railData.agent.desc}
            </div>

            {/* Regulatory SLA Badge */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 10,
              color: '#334155',
              lineHeight: 1.35
            }}>
              <strong style={{ color: '#ea580c' }}>SLA Standard:</strong> {railData.agent.sla}
            </div>
          </div>
        </div>

        {/* ── COLUMN 3: 3 AUTOMATED EXECUTION TOOLS (RIGHT) ────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 2
          }}>
            <img src="/favicon.svg" alt="AE" style={{ width: 14, height: 14 }} />
            <span>3 AUTOMATED EXECUTION TOOLS ({activeRail})</span>
          </div>

          {railData.tools.map((tool, idx) => {
            const isHl = activeHighlight === `tool_${idx}`
            return (
              <div
                key={tool.id}
                ref={toolRefs[idx]}
                onMouseEnter={() => setActiveHighlight(`tool_${idx}`)}
                onMouseLeave={() => setActiveHighlight(null)}
                style={{
                  background: isHl ? '#fffbf5' : '#ffffff',
                  border: `1.5px solid ${isHl ? '#ea580c' : '#fed7aa'}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  boxShadow: isHl ? '0 6px 18px rgba(234, 88, 12, 0.2)' : '0 2px 8px rgba(234, 88, 12, 0.08)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  transform: isHl ? 'scale(1.02)' : 'none'
                }}
              >
                {/* Embedded Connector Trigger Pill */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#fff7ed',
                  border: '1px solid #fdba74',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: '#c2410c',
                  marginBottom: 6
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ea580c' }} />
                  {tool.trigger}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: '#fff7ed',
                    border: '1px solid #fdba74',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(234, 88, 12, 0.12)',
                    flexShrink: 0
                  }}>
                    <img src="/favicon.svg" alt="AE" style={{ width: 16, height: 16 }} />
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                    {tool.name}
                  </div>
                </div>

                <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#ea580c', fontWeight: 600, margin: '4px 0 6px' }}>
                  {tool.workflow}
                </div>
                <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35, marginBottom: 6 }}>
                  {tool.desc}
                </div>
                <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.4 }}>
                  <div><strong style={{ color: '#ea580c' }}>✓ Action:</strong> {tool.action}</div>
                  <div><strong style={{ color: '#ea580c' }}>✓ Result:</strong> {tool.result}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes aeAgentPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.02); opacity: 0.7; box-shadow: 0 0 20px rgba(234, 88, 12, 0.25); }
        }
        @keyframes flowDashIn {
          from { stroke-dashoffset: 22; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes flowDashOut {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -24; }
        }
      `}</style>
    </div>
  )
}
