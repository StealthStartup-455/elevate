# Elevate

Elevate is a climbing gym management app. Staff can manage check-ins,
customer records, memberships and waivers. Climbers can view their
membership and complete tasks from their own dashboard.

## Access the MVP

1. Open https://elevate-staging-psi.vercel.app in your browser.
2. Choose a demo account from the table below.
3. Enter its username in the **Email** field.
4. Enter its password, then select **Log in**.

No download or installation is required.

| Account | Username | Password |
| --- | --- | --- |
| Front desk staff | desk | desk |
| Climber with an active membership and signed waiver | demo-valid-active | demo-valid-active |
| New climber without a waiver or membership | demo-missing-none | demo-missing-none |

For additional accounts, open the **ⓘ beside “Log in.”**

## Use the staff app

Log in with **desk / desk**.

### Check in a climber

1. Open **Check-in**.
2. Use **Find climber** to search for a customer.
3. Select their name to open their information.
4. Review their membership and waiver status.
5. If they meet the requirements, select **Check in**.

If a waiver or pass is missing, the app shows what needs to be
resolved before check-in.

### Make a demo sale

1. Open **POS**.
2. Select a customer.
3. Add a pass, membership or rental to the sale.
4. Select **Checkout**.
5. Choose a payment method and select **Tender**.
6. Find the completed sale under **Today's sales**.

Payments are simulated. No real money is charged.

### Find customer information

1. Open **Customers**.
2. Search for a customer and select their record.
3. Review their profile, membership and waiver information.

## Use the climber app

Log in with **demo-valid-active** as both the username and password.

1. Open **Home** to explore the dashboard.
2. Open **Membership** to review the account's plan and passes.
3. Return to **Home** to review the waiver status.

### Try the new-climber experience

Log out, then log in with **demo-missing-none** as both the
username and password.

1. From **Home**, open the waiver and follow the form instructions.
2. Open **Membership** to explore the available purchase options.
3. Choose a membership and follow the demo checkout instructions.

Use fictional details when completing forms.

## Try both views together

To explore the staff and climber experiences at the same time:

1. Open a normal browser window and log in as **desk**.
2. Open a private/incognito window and log in as a climber.
3. Keep both windows open while trying the workflows.

Separate browser sessions let each account stay signed in.

## About this MVP

The hosted app is a shared demo with fictional sample data.
Other testers may change the records, and demo data may be reset.
It is intended for evaluation, not live gym operations.

If you encounter a problem, share the page you were using,
the steps you took, and any error message with the project team.

## Project information

Product website: https://elevate-gym-crm.vercel.app/

The instructions below are for developers who want to install
and run Elevate locally.

## Developer workflow

All changes start with a GitHub issue and go through a pull request.
See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution rules.

### Start a change

1. Choose or create a GitHub issue.
2. Check open pull requests for related work.
3. Fetch the latest code and create a branch from `origin/dev`:

   git fetch origin
   git switch -c feature/123-short-description origin/dev

Replace `123` with your issue number. Use the branch type that fits
your change: `feature`, `fix`, `docs`, `refactor`, `chore` or `hotfix`.

### Develop and check your work

1. Run `npm run local` to set up and start the app.
2. Make your changes.
3. Run `npm run lint`, `npm test` and `npm run build`.
4. For UI changes, follow [STYLE_GUIDE.md](STYLE_GUIDE.md)
   and check the screen in light and dark mode.

### Submit your change

1. Commit your changes with a short, descriptive message.
2. Push your branch.
3. Open a pull request targeting `dev`.
4. Complete the PR template and link the issue with `Closes #123`.
5. Wait for passing checks and a human review before merging.

Never commit or push directly to `dev`, `release` or `main`.
AI agents must also follow [AGENTS.md](AGENTS.md), including the
Exchange Floor requirements.