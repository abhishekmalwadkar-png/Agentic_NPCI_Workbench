import zipfile
import xml.etree.ElementTree as ET
import html
import os

def xml_escape(text):
    return html.escape(str(text))

def p_title(text):
    return f'''
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Title"/>
        <w:spacing w:before="240" w:after="120"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="1F497D"/>
          <w:sz w:val="50"/>
        </w:rPr>
        <w:t>{xml_escape(text)}</w:t>
      </w:r>
    </w:p>'''

def p_subtitle(text):
    return f'''
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Subtitle"/>
        <w:spacing w:before="0" w:after="280"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:color w:val="595959"/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>{xml_escape(text)}</w:t>
      </w:r>
    </w:p>'''

def p_h1(text):
    return f'''
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="360" w:after="140"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="1F497D"/>
          <w:sz w:val="32"/>
        </w:rPr>
        <w:t>{xml_escape(text)}</w:t>
      </w:r>
    </w:p>'''

def p_h2(text):
    return f'''
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading2"/>
        <w:spacing w:before="240" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="365F91"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>{xml_escape(text)}</w:t>
      </w:r>
    </w:p>'''

def p_h3(text):
    return f'''
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading3"/>
        <w:spacing w:before="180" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="243F60"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>{xml_escape(text)}</w:t>
      </w:r>
    </w:p>'''

def p_body(text, bold_prefix="", italic=False):
    bp_xml = f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{xml_escape(bold_prefix)} </w:t></w:r>' if bold_prefix else ""
    i_tag = "<w:i/>" if italic else ""
    return f'''
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      {bp_xml}
      <w:r>
        <w:rPr>
          {i_tag}
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>{xml_escape(text)}</w:t>
      </w:r>
    </w:p>'''

def p_bullet(text, bold_prefix=""):
    bp_xml = f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{xml_escape(bold_prefix)} </w:t></w:r>' if bold_prefix else ""
    return f'''
    <w:p>
      <w:pPr>
        <w:pStyle w:val="ListBullet"/>
        <w:spacing w:before="40" w:after="80"/>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/><w:sz w:val="20"/></w:rPr>
        <w:t>• </w:t>
      </w:r>
      {bp_xml}
      <w:r>
        <w:rPr><w:sz w:val="22"/></w:rPr>
        <w:t>{xml_escape(text)}</w:t>
      </w:r>
    </w:p>'''

def p_callout(text, title="OPERATIONAL PRINCIPLE"):
    return f'''
    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:left w:val="single" w:sz="24" w:space="12" w:color="1F497D"/>
        </w:pBdr>
        <w:shd w:val="clear" w:color="auto" w:fill="F2F5F9"/>
        <w:spacing w:before="160" w:after="160"/>
        <w:ind w:left="360" w:right="360"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="1F497D"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">{xml_escape(title)}: </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:sz w:val="22"/>
          <w:color w:val="1F497D"/>
        </w:rPr>
        <w:t>{xml_escape(text)}</w:t>
      </w:r>
    </w:p>'''

def build_table(headers, rows, col_widths, col_aligns=None):
    if not col_aligns:
        col_aligns = ["left"] * len(headers)
    total_w = sum(col_widths)
    table_xml = [f'''
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="{total_w}" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="D3D3D3"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="12" w:space="0" w:color="1F497D"/>
          <w:right w:val="none"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E6E6E6"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>''']
    for w in col_widths:
        table_xml.append(f'<w:gridCol w:w="{w}"/>')
    table_xml.append('</w:tblGrid>')
    table_xml.append('''
      <w:tr>
        <w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>''')
    for h, w, a in zip(headers, col_widths, col_aligns):
        table_xml.append(f'''
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="{w}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1F497D"/>
            <w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="40" w:after="40"/><w:jc w:val="{a}"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/></w:rPr><w:t>{xml_escape(h)}</w:t></w:r>
          </w:p>
        </w:tc>''')
    table_xml.append('</w:tr>')
    for r_idx, r in enumerate(rows):
        bg_fill = "F9FAFC" if (r_idx % 2 == 1) else "FFFFFF"
        table_xml.append('''
      <w:tr><w:trPr><w:cantSplit/></w:trPr>''')
        for val, w, a in zip(r, col_widths, col_aligns):
            lines = val.split('\n')
            p_xmls = []
            for line in lines:
                is_bullet = line.strip().startswith('•')
                clean_line = line.strip().lstrip('•').strip() if is_bullet else line
                bullet_prefix = '<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="1F497D"/></w:rPr><w:t>• </w:t></w:r>' if is_bullet else ""
                is_bold = "Fully Autonomous" in clean_line or "Autonomous" in clean_line or "Strictly Forbidden" in clean_line
                b_tag = "<w:b/>" if is_bold else ""
                color_tag = '<w:color w:val="0B7A42"/>' if "Fully Autonomous" in clean_line else ('<w:color w:val="C00000"/>' if ("HITL" in clean_line or "Strictly Forbidden" in clean_line or "Forbidden" in clean_line) else "")
                p_xmls.append(f'''
            <w:p>
              <w:pPr><w:spacing w:before="30" w:after="30" w:line="240" w:lineRule="auto"/><w:jc w:val="{a}"/></w:pPr>
              {bullet_prefix}
              <w:r><w:rPr>{b_tag}{color_tag}<w:sz w:val="19"/></w:rPr><w:t>{xml_escape(clean_line)}</w:t></w:r>
            </w:p>''')
            table_xml.append(f'''
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="{w}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="{bg_fill}"/>
            <w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          {''.join(p_xmls)}
        </w:tc>''')
        table_xml.append('</w:tr>')
    table_xml.append('</w:tbl>')
    return '\n'.join(table_xml)

def generate_full_document():
    body_elements = []
    
    # Document Header / Titles
    body_elements.append(p_title("NPCI Operations Unified Workbench"))
    body_elements.append(p_subtitle("Specialist AI Agents: Operational Roles, Multi-Agent Collaboration & Regulatory Governance\nAutomationEdge Intelligent Banking Operations Framework"))
    
    # Section 1: Executive Overview & Operating Model
    body_elements.append(p_h1("1. Executive Overview & Agentic Operating Model"))
    body_elements.append(p_body("In the NPCI Operations Unified Workbench, AI agents are designed as specialist domain autonomous agents rather than generic chatbots. They operate across the 8 primary NPCI clearing and settlement rails: UPI, IMPS, NACH, AePS, RuPay, CTS, BBPS, and NETC / FASTag."))
    body_elements.append(p_body("Each agent has a strictly bounded mandate: they perform multi-system queries, log extraction, cross-rail correlation, probabilistic matching, and evidence assembly. However, to maintain regulatory compliance and prevent operational risk, material financial actions and customer liability decisions require human dual-authorization (Human-In-The-Loop)."))
    
    body_elements.append(p_callout(
        "Detect  -->  Analyse  -->  Correlate  -->  Recommend (with Evidence)  -->  HITL Approval  -->  Execute & Audit",
        "CORE AGENTIC GOVERNANCE PRINCIPLE"
    ))
    
    # Section 2: Detailed Breakdown of the 6 Specialist Agents
    body_elements.append(p_h1("2. Detailed Roles of the 6 Specialist AI Agents"))
    body_elements.append(p_body("The architecture partitions operational responsibilities into 6 discrete specialist agents collaborating under an Orchestrator:"))
    
    headers_t1 = ["#", "Agent Name", "Exact Operational Role & Scope", "Autonomy & HITL Gate"]
    widths_t1 = [450, 2350, 4700, 1900]
    aligns_t1 = ["center", "left", "left", "center"]
    
    rows_t1 = [
        [
            "1",
            "File Monitoring & Validation Agent",
            "• Continuously monitors SFTP directories, NPCI portals, and staging repositories.\n• Verifies scheduled file arrivals across clearing cycles (e.g., UPI cut-offs, NACH sessions).\n• Validates file naming conventions, cycle IDs, record counts, and schema integrity.\n• Performs cryptographic hash checking (SHA-256) to detect duplicate or corrupted files.\n• Triggers downstream ingestion workflows upon successful validation.",
            "Fully Autonomous\n(No human approval required)"
        ],
        [
            "2",
            "Reconciliation Agent",
            "• Performs 4-way automated transaction matching: NPCI raw clearing files vs Switch logs vs Core Banking System (CBS) vs General Ledger (GL).\n• Identifies matched, unmatched, timing difference, and partial-leg transactions.\n• Identifies the exact structural and mathematical cause of reconciliation breaks.\n• Validates settlement obligations against RBI RTGS clearing account balances.\n• Generates daily/cycle reconciliation scorecards.",
            "Autonomous Matching\n(HITL required for financial postings/adjustments)"
        ],
        [
            "3",
            "Exception Investigation Agent",
            "• Ingests unmatched transactions, system timeouts, drop-offs, and reversal failures.\n• Autonomously queries backend systems: CBS transaction logs, payment switch dumps, NPCI response codes, and beneficiary bank status.\n• Correlates disparate identifiers: RRN, UTR, STAN, and NPCI Transaction ID.\n• Pinpoints root cause (e.g., beneficiary CBS timeout, balance mismatch, network latency).\n• Recommends specific remediation action with confidence score and evidence pack.",
            "Autonomous Investigation\n(HITL required for material/high-value cases)"
        ],
        [
            "4",
            "Dispute & Chargeback Agent",
            "• Ingests customer complaints, UDIR portal cases, ODR filings, and chargeback notices.\n• Reconstructs the complete lifecycle of disputed transactions across all systems.\n• Gathers supporting evidence: digital transaction slips, switch acknowledgements, and CBS account statements.\n• Evaluates dispute reason codes and checks customer liability per RBI guidelines.\n• Drafts complete representment dossiers and submits responses post-approval.",
            "Autonomous Case Prep\n(HITL required to submit dispute / debit customer)"
        ],
        [
            "5",
            "Regulatory & Circular Intelligence Agent",
            "• Monitors and ingests incoming circulars and directives from NPCI and RBI portals.\n• Classifies impacted payment rail (UPI, NACH, etc.) and specific operational processes.\n• Compares new circular mandates against current bank Standard Operating Procedures (SOPs).\n• Identifies required changes to business rules, system parameters, or cut-off timers.\n• Automatically creates implementation action items and assigns them to control owners.",
            "Autonomous Analysis\n(HITL required to ratify compliance changes)"
        ],
        [
            "6",
            "MIS & Executive Reporting Agent",
            "• Aggregates operational telemetry across all 8 NPCI payment rails.\n• Compiles daily End-of-Day (EOD) reports, weekly exception ageing, and monthly compliance packs.\n• Generates natural-language executive commentary highlighting volume trends, auto-match rates, open suspense balances, and SLA breaches.\n• Formats regulatory filings required by NPCI and RBI inspection teams.",
            "Autonomous Generation\n(Human review optional before external release)"
        ]
    ]
    body_elements.append(build_table(headers_t1, rows_t1, widths_t1, aligns_t1))
    
    # Section 3: Multi-Agent Collaboration Workflow
    body_elements.append(p_h1("3. Multi-Agent Collaboration Workflow (End-to-End Walkthrough)"))
    body_elements.append(p_body("Specialist agents do not work in isolation. They form a coordinated pipeline under the Orchestrator. The following lifecycle illustrates how agents resolve a critical high-value UPI exception (e.g., customer account debited in CBS, but marked failed at NPCI switch):"))
    
    body_elements.append(p_bullet("Step 1: Exception Detection", "Exception Agent: "))
    body_elements.append(p_body("Detects a transaction break where CBS status = SUCCESS (debited) but NPCI clearing file status = DEEMED FAIL or TIMEOUT. Classifies case as Priority 1 (P1)."))
    
    body_elements.append(p_bullet("Step 2: Cross-System Correlation", "Investigation Agent: "))
    body_elements.append(p_body("Takes the transaction RRN and queries UPI Switch logs, CBS journal, and NPCI Raw transaction dumps. Discovers that beneficiary bank timed out at T+15 seconds, but customer's CBS debit was not auto-reversed."))
    
    body_elements.append(p_bullet("Step 3: Financial & Ledger Validation", "Reconciliation Agent: "))
    body_elements.append(p_body("Verifies that the funds are currently parked in the bank's UPI Sundry/Suspense account and confirms net settlement discrepancy."))
    
    body_elements.append(p_bullet("Step 4: Policy & Regulatory Check", "Policy / Risk Agent: "))
    body_elements.append(p_body("Validates RBI Harmonization of Turnaround Time (TAT) circular. Confirms that auto-reversal must complete within T+1 day, or ₹100/day penalty applies. Confirms transaction exceeds ₹10,000 auto-execution threshold."))
    
    body_elements.append(p_bullet("Step 5: Case Packaging & Recommendation", "Dispute Agent: "))
    body_elements.append(p_body("Assembles an Approval Dossier containing: Root Cause Analysis (Beneficiary Timeout), Confidence Score (94%), CBS/Switch/NPCI log links, and recommended ledger entry (Credit Customer / Debit UPI Suspense)."))
    
    body_elements.append(p_bullet("Step 6: Human Dual-Authorization (HITL)", "Operations Approver: "))
    body_elements.append(p_body("Operations Manager reviews the pre-populated case card in the HITL Approval Workbench and clicks 'Approve & Release'."))
    
    body_elements.append(p_bullet("Step 7: Automated Execution & Audit", "Execution Bot & Audit Agent: "))
    body_elements.append(p_body("AutomationEdge execution bot posts the reversal entry into CBS, confirms customer account credit, marks the case resolved, and cryptographically signs the audit trail."))
    
    # Section 4: What Agents CAN DO vs What Agents CANNOT DO
    body_elements.append(p_h1("4. Bounded Autonomy: Permitted vs Forbidden Actions"))
    body_elements.append(p_body("To comply with RBI Master Direction on IT Governance, Risk, Controls and Outsourcing, AutomationEdge operates under an explicit 'Bounded Autonomy' model. Autonomous actions are strictly separated from actions requiring human authorization:"))
    
    headers_t2 = ["What AI Agents CAN DO Autonomously", "What AI Agents CANNOT DO (Strictly Forbidden / HITL Required)"]
    widths_t2 = [4700, 4700]
    aligns_t2 = ["left", "left"]
    
    rows_t2 = [
        [
            "• Automatically download, de-duplicate, validate, and archive NPCI files from SFTP/portals.\n• Execute scheduled multi-way mathematical reconciliation across files and ledgers.\n• Query core banking logs, switch journal files, and external APIs for investigation.\n• Correlate transaction IDs across distributed database systems.\n• Compute exposure amounts, exception ageing buckets, and SLA breach timers.\n• Extract and parse regulatory text from NPCI and RBI circular PDFs.\n• Pre-compile chargeback evidence bundles and dispute defense dossiers.\n• Draft daily, weekly, and monthly MIS executive summaries.",
            "• STRICTLY FORBIDDEN from posting unapproved financial adjustments or debit/credit entries to CBS.\n• STRICTLY FORBIDDEN from clearing or writing off GL suspense balances without maker-checker sign-off.\n• STRICTLY FORBIDDEN from making final customer fraud attribution or legal liability determinations.\n• STRICTLY FORBIDDEN from unilaterally waiving customer dispute liabilities or approving compensation payouts.\n• STRICTLY FORBIDDEN from overriding settlement files or modifying bank clearing parameters.\n• STRICTLY FORBIDDEN from modifying production access-control privileges or system routing rules.\n• STRICTLY FORBIDDEN from altering, overwriting, or deleting immutable system audit records."
        ]
    ]
    body_elements.append(build_table(headers_t2, rows_t2, widths_t2, aligns_t2))
    
    # Section 5: Regulatory Compliance & Governance Alignment
    body_elements.append(p_h1("5. Regulatory Governance Alignment (RBI & NPCI Standards)"))
    body_elements.append(p_body("The Agentic Workbench embeds regulatory compliance into every workflow:"))
    body_elements.append(p_bullet("RBI IT Governance & Risk Master Direction (2023): Enforces segregation of duties (SoD), automated change tracking, and dual-control for all operational postings.", "IT Governance: "))
    body_elements.append(p_bullet("RBI Outsourcing Guidelines: The bank retains full ultimate operational and financial accountability; agents execute only within designated limits with human oversight.", "Outsourcing Controls: "))
    body_elements.append(p_bullet("RBI Customer Protection Circular: Zero-liability and limited-liability customer rules are enforced by the Dispute Agent within statutory timelines.", "Customer Protection: "))
    body_elements.append(p_bullet("RBI Harmonization of Turnaround Time (TAT): The Workbench tracks auto-reversal timers in real-time, proactively alerting operations before penalty clocks expire.", "Turnaround Time (TAT): "))
    body_elements.append(p_bullet("Explainable AI (No 'Black Box'): Every AI recommendation displays transparent confidence scores, factual data references, and traceable system log citations.", "Explainability: "))
    
    # Section 6: HITL Decision Matrix & Thresholds
    body_elements.append(p_h1("6. Human-In-The-Loop (HITL) Decision Threshold Matrix"))
    body_elements.append(p_body("Representative operational thresholds governing when the platform pauses for human authorization:"))
    
    headers_t3 = ["Operational Activity", "Risk Level", "Financial Threshold", "Required Approver", "Workflow Path"]
    widths_t3 = [2400, 1200, 1800, 2000, 2000]
    aligns_t3 = ["left", "center", "center", "left", "left"]
    
    rows_t3 = [
        ["Routine Reversal (T+1 TAT)", "Low", "< ₹5,000", "System / Auto-rule", "Straight-Through (STP)"],
        ["Disputed UPI Adjustment", "Medium", "₹5,000 – ₹25,000", "Operations Supervisor", "Single-Approver Queue"],
        ["High-Value Exception Adjustment", "High", "> ₹25,000", "Operations Manager", "Maker-Checker Dual Approval"],
        ["NACH Mandate Override", "High", "Any Amount", "Payments Lead", "Senior Sign-off Queue"],
        ["Suspense GL Write-off / Clear", "Critical", "Any Amount", "Head of Finance / Ops", "Executive Approval Gate"],
        ["Dispute Liability Waiver", "High", "> ₹10,000", "Grievance / Dispute Head", "Compliance Review Queue"],
        ["Regulatory SOP Change", "Medium", "N/A", "Compliance Officer", "Policy Validation Gate"]
    ]
    body_elements.append(build_table(headers_t3, rows_t3, widths_t3, aligns_t3))
    
    return ''.join(body_elements)

# Main execution
template_docx = 'd:/NPCI-Workbench/NPCI_Operations_Automation_Opportunity_Assessment.docx'
output_docx = 'd:/NPCI-Workbench/NPCI_AI_Agents_Roles_and_Governance_Architecture.docx'
output_md = 'd:/NPCI-Workbench/NPCI_AI_Agents_Roles_and_Governance_Architecture.md'

body_xml = generate_full_document()

# Write docx
with zipfile.ZipFile(template_docx, 'r') as zin:
    with zipfile.ZipFile(output_docx, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        full_doc_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" 
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" 
            xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" 
            xmlns:v="urn:schemas-microsoft-com:vml" 
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" 
            xmlns:w10="urn:schemas-microsoft-com:office:word" 
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" 
            xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" 
            xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" 
            xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" 
            xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">
  <w:body>
{body_xml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>'''
        for item in zin.infolist():
            if item.filename == 'word/document.xml':
                zout.writestr('word/document.xml', full_doc_xml.encode('utf-8'))
            else:
                zout.writestr(item, zin.read(item.filename))

print(f"Successfully created: {output_docx}")

# Also create the companion Markdown file
md_content = """# NPCI Operations Unified Workbench
## Specialist AI Agents: Operational Roles, Multi-Agent Collaboration & Regulatory Governance
**AutomationEdge Intelligent Banking Operations Framework**

---

### 1. Executive Overview & Agentic Operating Model
In the **NPCI Operations Unified Workbench**, AI agents are designed as **specialist domain autonomous agents** rather than generic chatbots. They operate across the 8 primary NPCI clearing and settlement rails: **UPI, IMPS, NACH, AePS, RuPay, CTS, BBPS, and NETC / FASTag**.

Each agent has a strictly bounded mandate: they perform multi-system queries, log extraction, cross-rail correlation, probabilistic matching, and evidence assembly. However, to maintain regulatory compliance and prevent operational risk, material financial actions and customer liability decisions require human dual-authorization (**Human-In-The-Loop**).

> **Core Agentic Governance Principle**:  
> $$\text{Detect} \longrightarrow \text{Analyse} \longrightarrow \text{Correlate} \longrightarrow \text{Recommend (with Evidence)} \longrightarrow \mathbf{HITL\ Approval} \longrightarrow \text{Execute \& Audit}$$

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
"""

with open(output_md, 'w', encoding='utf-8') as f:
    f.write(md_content)

print(f"Successfully created: {output_md}")
