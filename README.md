# Snack and Pay

A tiny snack tab for your group. People scan a QR code, pick their name and snacks, and see what they owe this month. Unpaid amounts carry over to the next month until the admin records a payment.

- `index.html` is the website (hosted on GitHub Pages)
- `Code.gs` is the backend (a Google Apps Script attached to a Google Sheet, which stores all the data)

## 1. Set up the Google Sheet (about 10 minutes)

1. Create a new Google Sheet with a personal Google account and name it "Snack and Pay".
2. Open **Extensions > Apps Script**. Delete the sample code and paste in everything from `Code.gs`.
3. At the top of the script, change `ADMIN_PIN` to your own PIN and set `CURRENCY` if needed (default is `EUR`). Save.
4. In the function dropdown, select `setup` and click **Run**. Google asks for permission the first time; allow it (you may need to click "Advanced" and "Go to project").
5. Back in the Sheet you now have four tabs:
   - **Snacks**: snack name, price, Active (set to FALSE to hide a snack). Edit freely.
   - **People**: the names that appear in the dropdown. Add your group here; set Active to FALSE for people who left.
   - **Entries**: every snack someone logs. Delete a row to correct a mistake.
   - **Payments**: every payment you record.

## 2. Publish the backend

1. In Apps Script, click **Deploy > New deployment**, choose type **Web app**.
2. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
3. Copy the **Web app URL** (ends in `/exec`).

If you later change `Code.gs`, use **Deploy > Manage deployments > Edit (pencil) > Version: New version**. The URL stays the same.

## 3. Put the website on GitHub Pages

1. Open `index.html`, find `const API_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';` and paste your web app URL between the quotes.
2. On GitHub, create a new public repository, for example `snack-and-pay`, and upload `index.html`.
3. In the repository go to **Settings > Pages**, set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/snack-and-pay/`.

## 4. Make the QR code

Use any QR code generator with your GitHub Pages URL, print it and stick it on the snack box. Or with Python:

```
pip install qrcode[pil]
python -c "import qrcode; qrcode.make('https://YOUR-USERNAME.github.io/snack-and-pay/').save('qr.png')"
```

## Monthly routine

Open `https://YOUR-USERNAME.github.io/snack-and-pay/#admin` (or tap "Admin" at the bottom of the page) and enter your PIN. You see everyone's balance. When someone pays, tap **Mark as paid** (sets their tab to zero) or **Part payment** (enter the amount). Anyone who doesn't pay simply carries their balance into the next month, shown as "Unpaid from earlier months".

Balances are always calculated as everything eaten minus everything paid, so nothing is ever lost or double counted.

## Good to know

- This works on trust: there are no personal logins, so anyone with the link could log snacks under any name. The PIN only protects payments.
- Prices are taken from the Snacks tab at the moment of logging, so changing a price later does not change old entries.
- Months follow the time zone of the Apps Script project (Project Settings in Apps Script).
