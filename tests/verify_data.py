import csv, os

fpath = 'd:/NPCI-Workbench/NPCI_UPI_Settlement_TestData_50K.csv'
size_mb = os.path.getsize(fpath) / (1024*1024)

with open(fpath, encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    cols = reader.fieldnames

print(f'File size : {size_mb:.1f} MB')
print(f'Total rows: {len(rows):,}')
print(f'Columns   : {len(cols)}')
print(f'Col names : {", ".join(cols)}')

print('\n=== SAMPLE RECORDS BY SCENARIO TYPE ===')
shown = {}
for r in rows:
    sc = r['SCENARIO_TYPE']
    if sc not in shown:
        shown[sc] = r
    if len(shown) == 8:
        break

for sc, r in shown.items():
    print(f'\n[{sc}]')
    for k in ['TXN_ID','RRN','RAIL','NPCI_AMOUNT','CBS_AMOUNT','NPCI_STATUS','CBS_STATUS','RECON_STATUS','INVESTIGATION_REQUIRED','EXCEPTION_PRIORITY','NOTES']:
        print(f'  {k:<26}: {r[k]}')
