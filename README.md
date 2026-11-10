# Snack and Pay ☕🤝💶

A tiny snack and coffee tab for your work group to keep track of the shared tea/coffee and snack expenses. People scan a QR code, pick their name, log the snacks or coffees they had, and see what they owe this month. Unpaid amounts carry over to the next month until the admin records a payment.

- `index.html` is the website (hosted on GitHub Pages)
- `Code.gs` is the backend (a Google Apps Script attached to a Google Sheet, which stores all the data)

## Features

- **Snacks tab**: pick snacks and quantities from a list you manage in the Sheet.
- **Coffee tab**: log coffees at one fixed price, with its own coffee-themed design.
- **Monthly receipt**: shows this month's snacks and coffees, anything unpaid from earlier months, payments, and the total to pay.
- **Fix a mistake**: people can remove their own entries from the current month.
- **Admin view**: see everyone's balance and record full or part payments, protected by a PIN.
- Works on phones, supports light and dark mode.

## 1. Set up the Google Sheet (about 10 minutes)

1. Create a new Google Sheet with a personal Google account and name it "Snack and Pay".
2. Open **Extensions > Apps Script**. Delete the sample code and paste in everything from `Code.gs`.
3. At the top of the script, change `ADMIN_PIN` to your own PIN and set `CURRENCY` if needed (default is `EUR`). Save.
4. In the function dropdown, select `setup` and click **Run**. Google asks for permission the first time; allow it (you may need to click "Advanced" and "Go to project").
5. Back in the Sheet you now have five tabs (you can delete the empty "Sheet1"):
   - **Snacks**: snack name, price, Active (set to FALSE to hide a snack). Edit freely.
   - **People**: the names that appear in the dropdown. Add your group here; set Active to FALSE for people who left (this keeps their history and any unpaid balance).
   - **Settings**: the **Coffee price** (default 0.50). Change it anytime.
   - **Entries**: every snack and coffee someone logs. Filled automatically.
   - **Payments**: every payment you record in the admin view. Filled automatically.

Changes to Snacks, People and Settings take effect immediately: just reload the website. No redeploying needed.

## 2. Publish the backend

1. In Apps Script, click **Deploy > New deployment**, choose type **Web app**.
2. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
3. Copy the **Web app URL** (ends in `/exec`).

To check it works, open the URL with `?action=config` added to the end. You should see your snacks, names and coffee price. Opening the plain URL shows `{"ok":false,"error":"Unknown action."}`, which is normal.

If you later change `Code.gs`, use **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy**. Don't use "New deployment", because that creates a new URL.

## 3. Test locally (optional)

1. Open `index.html`, find `const API_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';` and paste your web app URL between the quotes.
2. Open a terminal in the project folder and run `python -m http.server 8000` (or `npx serve -l 8000`).
3. Open `http://localhost:8000` in your browser. To try it on your phone, use your PC's local IP address instead of `localhost` (same Wi-Fi needed).

Test entries go into your real Sheet, so delete them from the Entries and Payments tabs afterwards.

## 4. Put the website on GitHub Pages

1. Make sure `API_URL` in `index.html` contains your web app URL.
2. **Before pushing, replace your real PIN in `Code.gs` with a placeholder** such as `'CHANGE-ME'`. Your real PIN only belongs in the copy inside Google Apps Script.
3. Create a public repository (for example `snack-and-pay`) and push `index.html`, `Code.gs` and `README.md`. In VS Code: Source Control panel > **Publish to GitHub** > public repository.
4. In the repository go to **Settings > Pages**, set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
5. After a minute or two your site is live at `https://YOUR-USERNAME.github.io/snack-and-pay/`.

For later updates, commit your changes and push (in VS Code: **Commit**, then **Sync Changes**). The address stays the same.

## 5. Make the QR codes

Use any QR code generator with your GitHub Pages URL, print it and stick it on the snack box. Or with Python:

```
pip install qrcode[pil]
python -c "import qrcode; qrcode.make('https://YOUR-USERNAME.github.io/snack-and-pay/').save('qr.png')"
```

For the coffee machine, make a second QR code that opens the coffee tab directly by adding `#coffee` to the address: `https://YOUR-USERNAME.github.io/snack-and-pay/#coffee`.

## Correcting mistakes

Below their receipt, people find **Fix a mistake** with a list of everything they logged this month. **Remove** takes an entry off their tab. The row stays in the Entries sheet with the time of removal in the **Removed at** column, so you keep a history, but it no longer counts.

Only entries from the current month can be removed on the website. For older ones, delete the row in the Entries sheet. A payment recorded by mistake can be undone by deleting its row in the Payments sheet.

## Monthly routine

Open `https://YOUR-USERNAME.github.io/snack-and-pay/#admin` (or tap "Admin" at the bottom of the page) and enter your PIN. You see everyone's balance. When someone pays, tap **Mark as paid** (sets their tab to zero) or **Part payment** (enter the amount). Anyone who doesn't pay simply carries their balance into the next month, shown as "Unpaid from earlier months".

Balances are always calculated as everything logged in Entries minus everything recorded in Payments, so nothing is ever lost or double counted.

## Privacy

- Member names and all data are stored only in your Google Sheet, never in the repository files.
- The live website is public: anyone with the link can see the names in the dropdown and each person's monthly tab. Use first names or nicknames if that's a concern.
- The web app URL in `index.html` is visible to anyone who opens the site. It allows the same things the website does, but not access to the Sheet itself. Payments always need the PIN.

## Good to know

- This works on trust: there are no personal logins, so anyone with the link could log or remove entries under any name. The PIN only protects payments.
- Snack and coffee prices are saved with each entry, so changing a price later does not change old entries.
- Coffee and snacks add up to one balance per person; coffee appears as "Coffee" on the receipt and in the Entries sheet.
- Months follow the time zone of the Apps Script project (Project Settings in Apps Script).

## Using this for your own group

Copy the repository, then follow steps 1 to 5 with your own Google Sheet, PIN and web app URL. You start with sample data (Anna, Ben and a few snacks) and none of the original group's data.
