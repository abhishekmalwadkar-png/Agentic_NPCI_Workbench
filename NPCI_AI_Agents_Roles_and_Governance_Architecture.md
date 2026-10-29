# NPCI Operations Unified Workbench
## Specialist AI Agents: Operational Roles, Multi-Agent Collaboration & Regulatory Governance
**AutomationEdge Intelligent Banking Operations Framework**

---

### 1. Executive Overview & Agentic Operating Model
In the **NPCI Operations Unified Workbench**, AI agents are designed as **specialist domain autonomous agents** rather than generic chatbots. They operate across the 8 primary NPCI clearing and settlement rails: **UPI, IMPS, NACH, AePS, RuPay, CTS, BBPS, and NETC / FASTag**.

Each agent has a strictly bounded mandate: they perform multi-system queries, log extraction, cross-rail correlation, probabilistic matching, and evidence assembly. However, to maintain regulatory compliance and prevent operational risk, material financial actions and customer liability decisions require human dual-authorization (**Human-In-The-Loop**).

> **Core Agentic Governance Principle**:  
> $$	ext{Detect} \longrightarrow 	ext{Analyse} \longrightarrow 	ext{Correlate} \longrightarrow 	ext{Recommend (with Evidence)} \longrightarrow \mathbf{HITL\ Approval} \longrightarrow 	ext{Execute \& Audit}$$

---

### 2. Detailed Roles of the 6 Specialist AI Agents

| # | Agent Name | Exact Operational Role & Scope | Autonomy & HITL Gate |
|:---:|:---|:---|:---:|
| **1** | **File Monitoring & Validation Agent** | • Continuously monitors SFTP directories, NPCI portals, and staging repositories.<br>• Verifies scheduled file arrivals across clearing cycles (e.g., UPI cut-offs, NACH sessions).<br>• Validates file naming conventions, cycle IDs, record counts, and schema integrity.<br>• Performs cryptographic hash checking (SHA-256) to detect duplicate or corrupted files.<br>• Triggers downstream ingestion workflows upon successful validation. | **Fully Autonomous**<br>*(No human approval required)* |
| **2** | **Reconciliation Agent** | • Performs 4-way automated transaction matching: NPCI raw clearing files vs Switch logs vs Core Banking System (CBS) vs General Ledger (GL).<br>• Identifies matched, unmatched, timing difference, and partial-leg transactions.<br>• Identifies the exact structural and mathematical cause of reconciliation breaks.<br>• Validates settlement obligations against RBI RTGS clearing account balances.<br>• Generates daily/cycle reconciliation scorecards. | **Autonomous Matching**<br>*(HITL required for financial postings/adjustments)* |
| **3** | **Exception Investigation Agent** | • Ingests unmatched transactions, system timeouts, drop-offs, and reversal failures.<br>• Autonomously queries backend systems: CBS transaction logs, payment switch dumps, NPCI response codes, and beneficiary bank status.<br>• Correlates disparate identifiers: RRN, UTR, STAN, and NPCI Transaction ID.<br>• Pinpoints root cause (e.g., beneficiary CBS timeout, balance mismatch, network latency).<br>• Recommends specific remediation action with confidence score and evidence pack. | **Autonomous Investigation**<br>*(HITL required for material/high-value cases)* |
| **4** | **Dispute & Chargeback Agent** | • Ingests customer complaints, UDIR portal cases, ODR filings, and chargeback notices.<br>• Reconstructs the complete lifecycle of disputed transactions across all systems.<br>• Gathers supporting evidence: digital transaction slips, switch acknowledgements, and CBS account statements.<br>• Evaluates dispute reason codes and checks customer liability per RBI guidelines.<br>• Drafts complete representment dossiers and submits responses post-approval. | **Autonomous Case Prep**<br>*(HITL required to submit dispute / debit customer)* |
| **5** | **Regulatory & Circular Intelligence Agent** | • Monitors and ingests incoming circulars and directives from NPCI and RBI portals.<br>• Classifies impacted payment rail (UPI, NACH, etc.) and specific operational processes.<br>• Compares new circular mandates against current bank Standard Operating Procedures (SOPs).<br>• Identifies required changes to business rules, system parameters, or cut-off timers.<br>• Automatically creates implementation action items and assigns them to control owners. | **Autonomous Analysis**<br>*(HITL required to ratify compliance changes)* |
| **6** | **MIS & Executive Reporting Agent** | • Aggregates operational telemetry across all 8 NPCI payment rails.<br>• Compiles daily End-of-Day (EOD) reports, weekly exception ageing, and monthly compliance packs.<br>• Generates natural-language executive commentary highlighting volume trends, auto-match rates, open suspense balances, and SLA breaches.<br>• Formats regulatory filings required by NPCI and RBI inspection teams. | **Autonomous Generation**<br>*(Human review optional before external release)* |

---

### 3. Multi-Agent Collaboration Workflow (End-to-End Walkthrough)

```mermaid
sequenceDiagram
    autonumber
    participant ExceptionAgent as Exception Agent
    participant ReconAgent as Reconciliation Agent
    participant InvestigationAgent as Investigation Agent
    participant PolicyAgent as Policy / Risk Agent
    participant DisputeAgent as Dispute Agent
    participant Human as Human Approver (HITL)
    participant Bot as Execution Bot / CBS

    ExceptionAgent->>InvestigationAgent: Classify exception (Break: CBS Debit vs NPCI Fail)
    InvestigationAgent->>ReconAgent: Correlate RRN & check ledger matching
    InvestigationAgent->>InvestigationAgent: Query UPI Switch + CBS logs; establish root cause
    InvestigationAgent->>PolicyAgent: Check RBI T+1 reversal rule & bank threshold
    PolicyAgent->>DisputeAgent: Verify customer reversal eligibility
    DisputeAgent->>Human: Present Approval Card (RCA: Switch Timeout, Confidence: 94%, Evidence: 5 logs)
    Human->>Bot: One-Click Approval (Maker-Checker verified)
    Bot->>CBS: Post customer reversal / credit adjustment
    Bot-->>ExceptionAgent: Log tamper-proof audit trail
```

* **Step 1: Exception Detection (Exception Agent)**: Detects a transaction break where CBS status = SUCCESS (debited) but NPCI clearing file status = DEEMED FAIL or TIMEOUT.
* **Step 2: Cross-System Correlation (Investigation Agent)**: Takes the transaction RRN and queries UPI Switch logs, CBS journal, and NPCI Raw transaction dumps. Discovers that beneficiary bank timed out at T+15 seconds, but customer's CBS debit was not auto-reversed.
* **Step 3: Financial & Ledger Validation (Reconciliation Agent)**: Verifies that funds are currently parked in the bank's UPI Sundry/Suspense account and confirms net settlement discrepancy.
* **Step 4: Policy & Regulatory Check (Policy / Risk Agent)**: Validates RBI Harmonization of TAT circular. Confirms that auto-reversal must complete within T+1 day, or ₹100/day penalty applies.
* **Step 5: Case Packaging & Recommendation (Dispute Agent)**: Assembles an Approval Dossier containing: Root Cause Analysis, Confidence Score (94%), CBS/Switch/NPCI log links, and recommended ledger entry.
* **Step 6: Human Dual-Authorization (Operations Approver)**: Operations Manager reviews the pre-populated case card in the HITL Approval Workbench and clicks 'Approve & Release'.
* **Step 7: Automated Execution & Audit (Execution Bot & Audit Agent)**: AutomationEdge execution bot posts the reversal entry into CBS, confirms customer credit, and cryptographically signs the audit trail.

---

### 4. Bounded Autonomy: Permitted vs Forbidden Actions

| What AI Agents CAN DO Autonomously | What AI Agents CANNOT DO (Strictly Forbidden / HITL Required) |
|---|---|
| • Automatically download, de-duplicate, validate, and archive NPCI files from SFTP/portals.<br>• Execute scheduled multi-way mathematical reconciliation across files and ledgers.<br>• Query core banking logs, switch journal files, and external APIs for investigation.<br>• Correlate transaction IDs across distributed database systems.<br>• Compute exposure amounts, exception ageing buckets, and SLA breach timers.<br>• Extract and parse regulatory text from NPCI and RBI circular PDFs.<br>• Pre-compile chargeback evidence bundles and dispute defense dossiers.<br>• Draft daily, weekly, and monthly MIS executive summaries. | • **STRICTLY FORBIDDEN** from posting unapproved financial adjustments or debit/credit entries to CBS.<br>• **STRICTLY FORBIDDEN** from clearing or writing off GL suspense balances without maker-checker sign-off.<br>• **STRICTLY FORBIDDEN** from making final customer fraud attribution or legal liability determinations.<br>• **STRICTLY FORBIDDEN** from unilaterally waiving customer dispute liabilities or approving compensation payouts.<br>• **STRICTLY FORBIDDEN** from overriding settlement files or modifying bank clearing parameters.<br>• **STRICTLY FORBIDDEN** from modifying production access-control privileges or system routing rules.<br>• **STRICTLY FORBIDDEN** from altering, overwriting, or deleting immutable system audit records. |

---

### 5. Regulatory Governance Alignment (RBI & NPCI Standards)
1. **RBI IT Governance & Risk Master Direction (2023)**: Enforces segregation of duties (SoD), automated change tracking, and dual-control for all operational postings.
2. **RBI Outsourcing Guidelines**: The bank retains ultimate operational and financial accountability; agents execute only within designated limits with human oversight.
3. **RBI Customer Protection Circular**: Zero-liability and limited-liability customer rules are enforced by the Dispute Agent within statutory timelines.
4. **RBI Harmonization of Turnaround Time (TAT)**: The Workbench tracks auto-reversal timers in real-time, proactively alerting operations before penalty clocks expire.
5. **Explainable AI (No 'Black Box')**: Every AI recommendation displays transparent confidence scores, factual data references, and traceable system log citations.

---

### 6. Human-In-The-Loop (HITL) Decision Threshold Matrix

| Operational Activity | Risk Level | Financial Threshold | Required Approver | Workflow Path |
|---|:---:|:---:|---|---|
| **Routine Reversal (T+1 TAT)** | Low | < ₹5,000 | System / Auto-rule | Straight-Through (STP) |
| **Disputed UPI Adjustment** | Medium | ₹5,000 – ₹25,000 | Operations Supervisor | Single-Approver Queue |
| **High-Value Exception Adjustment** | High | > ₹25,000 | Operations Manager | Maker-Checker Dual Approval |
| **NACH Mandate Override** | High | Any Amount | Payments Lead | Senior Sign-off Queue |
| **Suspense GL Write-off / Clear** | Critical | Any Amount | Head of Finance / Ops | Executive Approval Gate |
| **Dispute Liability Waiver** | High | > ₹10,000 | Grievance / Dispute Head | Compliance Review Queue |
| **Regulatory SOP Change** | Medium | N/A | Compliance Officer | Policy Validation Gate |
