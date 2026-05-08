# Applied CS Freelancer Portfolio

A static portfolio site for selling small freelance projects: starter websites, CRUD dashboards, IoT sensor dashboards, and technical tutoring.

## Open locally

For endpoint-style demo links, run a static server from this folder:

```bash
node server.js
```

Then open `http://127.0.0.1:4173/`.

The local business demo uses `POST /api/bookings` when served through
`server.js`. The endpoint returns a booking code, customer-email payload, staff
notification payload, and timing details. Real email delivery would require an
SMTP/API provider such as Resend, SendGrid, or Mailgun.

## Demo endpoints

- `http://127.0.0.1:4173/demos/local-business/`
- `http://127.0.0.1:4173/demos/retail-dashboard/`
- `http://127.0.0.1:4173/demos/iot-monitor/`

## Personalize before sharing

- Replace `Applied CS Freelancer` with your name or studio name.
- Update prices and service text as you gain client proof.
- Replace demo business details with a real example once you finish a client project.
