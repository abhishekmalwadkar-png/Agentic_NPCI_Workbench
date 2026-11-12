import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Top subtle bar
        # Bottom footer line
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 30, A4[0] - 36, 30)
        
        # Left text
        self.drawString(36, 18, "AutomationEdge Unified Operations Workbench — Banker's Master Guide")
        # Right text
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 36, 18, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_orange = colors.HexColor("#ea580c")
    dark_slate = colors.HexColor("#0f172a")
    muted_slate = colors.HexColor("#64748b")
    light_bg = colors.HexColor("#fff7ed")
    border_orange = colors.HexColor("#fed7aa")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=dark_slate,
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=primary_orange,
    )
    desc_style = ParagraphStyle(
        'DocDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=muted_slate,
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=dark_slate,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=primary_orange,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
        spaceAfter=5
    )
    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold',
    )
    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#431407"),
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#334155"),
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0f172a"),
    )
    code_cell = ParagraphStyle(
        'CodeCell',
        parent=table_cell,
        fontName='Courier',
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#0284c7"),
    )

    story = []

    # ── HEADER BLOCK ──────────────────────────────────────────────────────────
    header_data = [
        [
            Paragraph("<b>Automation<font color='#ea580c'>Edge</font></b>", title_style),
            Paragraph("<b>50,000 RECORDS / BATCH</b><br/><font color='#047857'><b>✓ RBI T+1 REGULATORY READY</b></font>", ParagraphStyle('HRight', parent=desc_style, alignment=2))
        ],
        [
            Paragraph("NPCI UPI Reconciliation – Banker's Master Guide & Demo Cheat Sheet", subtitle_style),
            Paragraph("Unified Operations Workbench • Multi-Leg In-Memory Engine", ParagraphStyle('HRight2', parent=desc_style, alignment=2))
        ]
    ]
    t_header = Table(header_data, colWidths=[340, 180])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=primary_orange, spaceBefore=4, spaceAfter=10))

    # ── SECTION 1: EXECUTIVE SUMMARY & PROBLEM STATEMENT ─────────────────────
    story.append(Paragraph("1. Executive Overview & The Banking Challenge", h1_style))
    story.append(Paragraph(
        "In Indian retail digital payments, <b>UPI (Unified Payments Interface)</b> processes over 400 million transactions daily. "
        "A single transaction travels through 4 distinct software systems: the national clearing rail (NPCI), the bank's transaction gateway switch (Base24), "
        "the Core Banking System customer ledger (Finacle), and internal inter-bank accounting suspense accounts (GL-14020). "
        "Because of unpredictable network latencies, timeouts, and system drifts, data breaks routinely happen.",
        body_style
    ))

    # Callout Box: The Business Problem
    callout_data = [[
        Paragraph(
            "<b>The Operational Challenge for Banks:</b><br/>"
            "Manual or batch-based recon cycles take between <b>6 to 18 hours</b>. When customer debits fail without auto-reversal, "
            "banks violate the <b>RBI T+1 Harmonization Mandate</b>, incurring a non-negotiable statutory penalty of <b>₹100 per day</b> "
            "payable directly into the affected customer's account.<br/><br/>"
            "<b>The AutomationEdge Solution:</b><br/>"
            "Autonomous 4-way in-memory matching of <b>50,000 transactions in under 2 seconds</b>, achieving <b>99.95% Straight-Through Processing (STP)</b>, "
            "triggering instantaneous customer account refunds for deemed failures, and compiling cryptographic audit dossiers for high-risk exceptions.",
            callout_style
        )
    ]]
    t_callout = Table(callout_data, colWidths=[520])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('BOX', (0,0), (-1,-1), 1, border_orange),
        ('LINELEFT', (0,0), (0,0), 3.5, primary_orange),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_callout)
    story.append(Spacer(1, 8))

    # ── SECTION 2: GLOSSARY & ACRONYMS ───────────────────────────────────────
    story.append(Paragraph("2. Banking Terms & Acronyms Glossary", h1_style))
    story.append(Paragraph("Standard terms used in retail payments, core banking, settlement, and reconciliation:", body_style))

    glossary_data = [
        [Paragraph("Term", table_header), Paragraph("Full Form", table_header), Paragraph("Definition & Role in Reconciliation", table_header)],
        [Paragraph("NPCI", table_cell_bold), Paragraph("National Payments Corporation of India", table_cell), Paragraph("Central umbrella entity governed by RBI operating UPI, IMPS, NACH, and RuPay rails.", table_cell)],
        [Paragraph("STP", table_cell_bold), Paragraph("Straight-Through Processing", table_cell), Paragraph("Transactions that reconcile and clear 100% automatically without human touch. Target: >99.9%.", table_cell)],
        [Paragraph("HITL", table_cell_bold), Paragraph("Human-in-the-Loop", table_cell), Paragraph("Maker-checker supervisory interface where high-value breaks (> ₹10k) require operations approval.", table_cell)],
        [Paragraph("CBS", table_cell_bold), Paragraph("Core Banking System", table_cell), Paragraph("Central software maintaining customer deposit/loan ledgers (e.g., Infosys Finacle, TCS BaNCS).", table_cell)],
        [Paragraph("Base24", table_cell_bold), Paragraph("ACI Base24 Payment Switch", table_cell), Paragraph("Bank gateway switch routing live transaction traffic (00=Auth, 91=Timeout, 96=Error).", table_cell)],
        [Paragraph("GL Suspense", table_cell_bold), Paragraph("General Ledger (GL-14020)", table_cell), Paragraph("Inter-bank parking pool holding funds during the clearing cycle. Must liquidate to ₹0.00 variance.", table_cell)],
        [Paragraph("RRN", table_cell_bold), Paragraph("Retrieval Reference Number", table_cell), Paragraph("Unique 12-digit numeric identifier generated by the switch. Primary correlation key across all 4 files.", table_cell)],
        [Paragraph("UTR", table_cell_bold), Paragraph("Unique Transaction Reference", table_cell), Paragraph("Alphanumeric transaction identifier generated for inter-bank clearing. Secondary matching key.", table_cell)],
        [Paragraph("P2P", table_cell_bold), Paragraph("Peer-to-Peer (Person-to-Person)", table_cell), Paragraph("Direct account transfer between two individuals (e.g., Google Pay / PhonePe friend transfer).", table_cell)],
        [Paragraph("P2M", table_cell_bold), Paragraph("Peer-to-Merchant", table_cell), Paragraph("Payment from an individual to a registered shop or business (QR code scanning at retail outlets).", table_cell)],
        [Paragraph("Deemed Fail", table_cell_bold), Paragraph("Deemed Failed Transaction", table_cell), Paragraph("Customer account debited, but switch timed out or beneficiary failed. Mandated T+1 auto-refund.", table_cell)],
        [Paragraph("Zero-Delta", table_cell_bold), Paragraph("Zero Variance Balance", table_cell), Paragraph("State where Total Debits equal Total Credits in suspense, leaving exactly ₹0.00 difference.", table_cell)],
        [Paragraph("Knock-Off", table_cell_bold), Paragraph("Ledger Liquidation", table_cell), Paragraph("Posting balancing entries to clear matched items out of suspense into settlement accounts.", table_cell)],
    ]
    t_glossary = Table(glossary_data, colWidths=[65, 140, 315])
    t_glossary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#fafafa")]),
    ]))
    story.append(t_glossary)
    story.append(PageBreak())

    # ── SECTION 3: THE 4 INBOUND SETTLEMENT FEEDS ────────────────────────────
    story.append(Paragraph("3. The 4 Inbound Settlement Feeds: Source & Direction", h1_style))
    story.append(Paragraph(
        "Reconciliation happens <b>inside the Bank</b>. To ensure end-to-end auditability, the bank correlates "
        "<b>1 external file received from NPCI</b> against <b>3 internal bank systems</b>:",
        body_style
    ))

    feeds_data = [
        [Paragraph("File Name", table_header), Paragraph("Source & Direction", table_header), Paragraph("Schema Fields", table_header), Paragraph("Operational Role in Bank", table_header)],
        [
            Paragraph("<b>NPCI_UPI_Settlement_Master.csv</b>", table_cell),
            Paragraph("<b>NPCI ➔ Bank</b><br/>(External via SFTP)", table_cell),
            Paragraph("RRN, TXN_ID, UTR, RAIL, CYCLE_ID, AMOUNT, STATUS", code_cell),
            Paragraph("Official clearing file pushed by NPCI at the end of each cycle. Central source of network settlement truth.", table_cell)
        ],
        [
            Paragraph("<b>Switch_Base24_Logs.csv</b>", table_cell),
            Paragraph("<b>Bank Payment Switch</b><br/>(Internal Gateway)", table_cell),
            Paragraph("RRN, SWITCH_STATUS, SWITCH_RESP_CODE", code_cell),
            Paragraph("Real-time authorization states captured at the bank's gateway (00=Auth, 91=Timeout, 96=Error).", table_cell)
        ],
        [
            Paragraph("<b>Finacle_CBS_Dump.csv</b>", table_cell),
            Paragraph("<b>Core Banking System</b><br/>(Internal Finacle)", table_cell),
            Paragraph("RRN, CBS_AMOUNT, CBS_STATUS, ACCOUNT_NO", code_cell),
            Paragraph("Bank customer deposit ledger showing if the customer account was actually debited or credited.", table_cell)
        ],
        [
            Paragraph("<b>GL_Suspense_Pool.csv</b>", table_cell),
            Paragraph("<b>General Ledger</b><br/>(Internal Accounting)", table_cell),
            Paragraph("RRN, GL_AMOUNT, GL_STATUS", code_cell),
            Paragraph("Inter-bank settlement suspense balance (GL-14020). Must be knocked off to zero delta.", table_cell)
        ],
    ]
    t_feeds = Table(feeds_data, colWidths=[130, 95, 145, 150])
    t_feeds.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#fafafa")]),
    ]))
    story.append(t_feeds)
    story.append(Spacer(1, 8))

    # ── SECTION 4: RECONCILIATION MATCHING LOGIC & DECISION MATRIX ───────────
    story.append(Paragraph("4. 4-Way Matching Logic & Decision Matrix", h1_style))
    story.append(Paragraph("Every transaction record is joined on RRN and UTR across all 4 legs, and classified into 4 precise action paths:", body_style))

    rules_data = [
        [Paragraph("Category", table_header), Paragraph("Condition Across 4 Legs", table_header), Paragraph("Automated Action", table_header), Paragraph("Business Result", table_header)],
        [
            Paragraph("<b>1. 4-Way STP Match</b><br/>(99.95% volume)", table_cell_bold),
            Paragraph("• NPCI = SUCCESS<br/>• Switch = 00 (Approved)<br/>• CBS = DEBITED<br/>• GL = PARKED<br/>• All Amounts Equal", table_cell),
            Paragraph("Dispatched to <b>Zero-Delta GL Knock-Off</b> workflow (<font color='#ea580c'>UPI_ZeroDelta_GL_KnockOff.psw</font>)", table_cell),
            Paragraph("Balances GL-14020 & GL-11010. <b>₹0.00 ledger variance</b>. Instant cycle close.", table_cell)
        ],
        [
            Paragraph("<b>2. Deemed Failure Auto-Refund</b><br/>(Break &lt; ₹5,000)", table_cell_bold),
            Paragraph("• Switch = 91 (Timeout) / 96<br/>• CBS = DEBITED (Customer charged)<br/>• NPCI = Failed / Absent<br/>• Amount &lt; ₹5,000", table_cell),
            Paragraph("Dispatched to <b>CBS Auto-Refund Execution</b> workflow (<font color='#ea580c'>UPI_CBS_Execution_Bot.psw</font>)", table_cell),
            Paragraph("Calls Finacle API to credit customer account. <b>100% compliance with RBI T+1 TAT</b> (stops penalty).", table_cell)
        ],
        [
            Paragraph("<b>3. High Value / Mismatch Break</b><br/>(&gt; ₹10k or Variance)", table_cell_bold),
            Paragraph("• Amount mismatch across legs, OR<br/>• High-value exception &gt; ₹10,000", table_cell),
            Paragraph("Dispatched to <b>AI Exception & HITL Dispatcher</b> (<font color='#ea580c'>UPI_AI_DualTrack_Dispatcher.psw</font>)", table_cell),
            Paragraph("Compiles multi-system dossier with 94% AI confidence score for 1-click maker-checker signoff.", table_cell)
        ],
        [
            Paragraph("<b>4. Orphan GL Balance</b>", table_cell_bold),
            Paragraph("• Balance parked in GL-14020<br/>• No matching CBS debit or NPCI clearance", table_cell),
            Paragraph("Flagged for Treasury Clearance", table_cell),
            Paragraph("Prevents unbacked balances from rolling over into next day's settlement.", table_cell)
        ],
    ]
    t_rules = Table(rules_data, colWidths=[105, 140, 145, 130])
    t_rules.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#f0fdf4")),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#fffbeb")),
        ('BACKGROUND', (0,3), (-1,3), colors.HexColor("#fef2f2")),
        ('BACKGROUND', (0,4), (-1,4), colors.white),
    ]))
    story.append(t_rules)
    story.append(Spacer(1, 8))

    # ── SECTION 5: RBI T+1 MANDATE ───────────────────────────────────────────
    story.append(Paragraph("5. Regulatory Compliance: The RBI T+1 Mandate", h1_style))
    rbi_callout = [[
        Paragraph(
            "<b>RBI Circular Reference: DPSS.CO.PD No.629/02.01.014/2019-20</b><br/>"
            "<i>'Harmonization of Turn Around Time (TAT) and customer compensation for failed transactions'</i><br/><br/>"
            "• <b>Mandated Turnaround:</b> For failed UPI transactions where the customer account was debited, the customer must receive credit reversal within <b>T + 1 calendar day</b>.<br/>"
            "• <b>Statutory Penalty:</b> If credit is delayed beyond T+1, the bank is legally mandated to compensate the customer at <b>₹100 per day of delay</b> automatically without waiting for a customer dispute.<br/>"
            "• <b>AutomationEdge Protection:</b> By identifying deemed failures at file ingest time and executing CBS reversal workflows in under 2 seconds, the bank completes the reversal well within T+1, resulting in <b>₹0.00 penalty exposure</b>.",
            callout_style
        )
    ]]
    t_rbi = Table(rbi_callout, colWidths=[520])
    t_rbi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
        ('LINELEFT', (0,0), (0,0), 3.5, colors.HexColor("#059669")),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_rbi)
    story.append(PageBreak())

    # ── SECTION 6: PROCESS STUDIO WORKFLOWS ──────────────────────────────────
    story.append(Paragraph("6. AutomationEdge Execution Tools (Process Studio Workflows)", h1_style))
    story.append(Paragraph("The Reconciler Agent dispatches batches directly into 3 specialized Process Studio execution tools via REST API:", body_style))

    tools_data = [
        [Paragraph("Tool Name", table_header), Paragraph("Workflow File", table_header), Paragraph("Trigger Condition", table_header), Paragraph("Action & Operational Outcome", table_header)],
        [
            Paragraph("<b>Zero-Delta GL Knock-Off</b>", table_cell_bold),
            Paragraph("UPI_ZeroDelta_GL_KnockOff.psw", code_cell),
            Paragraph("Trigger: STP Matched (99.95%)", table_cell),
            Paragraph("Auto-posts balancing journal entry between GL-14020 & GL-11010. <b>₹0.00 ledger variance</b> and instant cycle closure.", table_cell)
        ],
        [
            Paragraph("<b>CBS Auto-Refund Execution</b>", table_cell_bold),
            Paragraph("UPI_CBS_Execution_Bot.psw", code_cell),
            Paragraph("Trigger: Auto-Refund &lt; ₹5,000", table_cell),
            Paragraph("Calls Finacle CBS reversal API and credits affected customer account. <b>100% compliance with RBI T+1 TAT</b> (stops penalty clock).", table_cell)
        ],
        [
            Paragraph("<b>AI Exception & HITL Dispatcher</b>", table_cell_bold),
            Paragraph("UPI_AI_DualTrack_Dispatcher.psw", code_cell),
            Paragraph("Trigger: High Value (&gt;₹10k) / Mismatches", table_cell),
            Paragraph("Compiles multi-system evidence dossiers with 94% AI confidence score for 1-click maker-checker signoff.", table_cell)
        ],
    ]
    t_tools = Table(tools_data, colWidths=[110, 140, 110, 160])
    t_tools.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#fafafa")]),
    ]))
    story.append(t_tools)
    story.append(Spacer(1, 10))

    # ── SECTION 7: DEMO TALKING POINTS & BANKER Q&A ──────────────────────────
    story.append(Paragraph("7. Demo Script & Anticipated Banker Q&A", h1_style))

    # Pitch Box
    pitch_data = [[
        Paragraph(
            "<b>🎙️ 30-Second Elevator Pitch for Tomorrow's Presentation:</b><br/>"
            "<i>'In day-to-day operations, bank reconciliation teams spend 6 to 18 hours manually matching raw NPCI settlement files "
            "against Base24 switch logs, Finacle customer accounts, and GL suspense pools to detect breaks.<br/><br/>"
            "AutomationEdge ingests all 4 settlement feeds, correlates 50,000 records in less than 2 seconds, automatically closes out the 99.95% "
            "straight-through matches to zero-delta balance, and triggers instant CBS auto-refunds for deemed failures—ensuring 100% compliance "
            "with the RBI T+1 circular with zero human intervention.'</i>",
            callout_style
        )
    ]]
    t_pitch = Table(pitch_data, colWidths=[520])
    t_pitch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fdba74")),
        ('LINELEFT', (0,0), (0,0), 3.5, primary_orange),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_pitch)
    story.append(Spacer(1, 8))

    # Banker FAQs
    story.append(Paragraph("<b>Top Anticipated Questions from Bank Employees:</b>", body_bold))
    story.append(Spacer(1, 3))

    faqs = [
        ("Q: Why does our dataset have exactly 25 breaks in 50,000 records?",
         "A: In real-world Indian banking production, UPI STP rates average between 99.9% and 99.95%. Having 25 breaks out of 50,000 accurately mirrors authentic bank volumes—proving both high-speed automated throughput and intelligent edge-case routing."),
        ("Q: How does AutomationEdge connect to Finacle CBS and Base24?",
         "A: Through secure REST APIs, direct database connectors, or scheduled batch SFTP drops. Process Studio workflows can call Finacle reversal APIs directly or generate pre-formatted journal upload files."),
        ("Q: What happens if an amount mismatch is found? Does it auto-refund?",
         "A: No. Any transaction with differing amounts across legs is halted immediately from automated posting. It is routed to the Human-in-the-Loop Cockpit with an AI evidence dossier showing the exact rupee divergence for maker-checker signoff."),
        ("Q: Can statutory and RBI auditors verify the automated decisions?",
         "A: Yes. Every single transaction matching step, decision rule, and reversal execution generates an immutable JSON audit trail stamped with SHA-256 cryptographic verification for statutory audit compliance.")
    ]

    for q, a in faqs:
        story.append(Paragraph(f"<b>{q}</b>", body_style))
        story.append(Paragraph(a, ParagraphStyle('Ans', parent=body_style, leftIndent=12, textColor=colors.HexColor("#475569"))))
        story.append(Spacer(1, 3))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built: {filename}")

if __name__ == '__main__':
    out_pdf = r"D:\NPCI-Workbench\NPCI_UPI_Reconciliation_Banker_Guide.pdf"
    build_pdf(out_pdf)

