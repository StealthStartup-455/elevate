# Fake RGP files for the #40 checker

Fake people only: emails are `example.com`, phones are `555` numbers, the card number is Stripe's public test number. Safe to commit to the repo as test data.

#40 handles Rock Gym Pro exports only. Below each file is what the dry run should report. Every line is meant to become a test.


## rgp/ (Rock Gym Pro)

`customers.csv` uses the column names from RGP's "recommended data fields" article. `visit-counts.csv` is shaped like RGP's "Visit Count By Customer" report, because RGP can't export individual check-ins.

Expected:

- **10001 Thao Nguyen:** ready. Lead cert. Cell and home phone are the same, stored once. `EFT_DUES` not imported. Membership type "Billed" needs a plan name (staff maps it once).
- **10002 Bao Nguyen:** ready. Linked to parent 10001. Top rope cert ("TR").
- **10003 Fiona Campbell:** ready. Prepaid pass 2026-01-01 to 2026-12-31.
- **10004 and 10005 Jan Kowalski:** needs review, possible duplicate (same name, phone and email, email in different case). 10004's birthday `03/04/1996` is ambiguous; 10005 says `1996-04-03`, which suggests April 3, but we still ask. 10004 waiver "Yes" with no date: "waiver on file, date unknown". 10004 has 7 punches left.
- **10006 Sara Ahmed:** needs review, no birthday. Waiver "No".
- **10007 Ella Brown:** needs review twice: parent 19999 is not in the file, and belay level "Auto Belay Only" is an unknown label.
- **10008 Tom Fischer:** ready with a warning: membership frozen, but the file has no freeze start date.
- **10009 Grace Lee:** needs review, prepaid ends (2026-03-01) before it starts (2026-06-01).
- **10010 Alex Martin:** ready as a climber, with a note: customer type "Staff", add their staff login separately.
- **Totals** (people, with the Kowalski pair counted as one): 9 people, 5 ready, 4 needs review, 0 can't import. 3 lead and 3 top rope certs. 1,015 visits.
- Visit counts joined by barcode: 10001 has 212 visits, etc. 10005 has no row (it is the duplicate).
- Columns not imported: `EFT_DUES`, `EMERGENCY_CONTACT`, `EMERGENCY_PHONE` (until we add emergency contact).


## rejected/ (must be refused)

- `card-numbers.csv`: refused. "This file has full card numbers in the `card_number` column. Don't send card numbers in a spreadsheet: delete the column and upload again." Nothing from the file is shown back.
- `not-a-csv.csv`: refused. "This doesn't look like a spreadsheet."
