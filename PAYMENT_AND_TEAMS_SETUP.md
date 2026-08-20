# Stackwise Real Payments + Multi-Team Setup

## Implemented behavior

- Team request approval and payment are separate actions.
- Approving a request immediately moves it to Approved; payment remains optional.
- An approved request can later be paid by a Team Admin using SSLCOMMERZ hosted checkout.
- Payment is marked `paid` only after server-side SSLCOMMERZ Order Validation succeeds.
- The Payments dashboard page shows successful/validated payment history only.
- Failed/cancelled/initiated payment attempts are retained internally for audit but do not appear in Payment History.
- Subscription creation supports two modes: save cost manually, or save and continue to SSLCOMMERZ payment.
- Users can belong to multiple teams and switch the active team from the Team page.

## SSLCOMMERZ configuration

Copy the payment settings from `server/.env.example` into `server/.env` and set:

```env
SSLCOMMERZ_IS_LIVE=false
SSLCOMMERZ_STORE_ID=your_sandbox_store_id
SSLCOMMERZ_STORE_PASSWORD=your_sandbox_store_password
CLIENT_URL=http://localhost:5173
SERVER_PUBLIC_URL=https://your-public-backend-url.example.com
PAYMENT_CUSTOMER_PHONE=01700000000
```

`SERVER_PUBLIC_URL` must be reachable from the internet for SSLCOMMERZ callbacks/IPN. For a local university demo, expose port 5000 through an HTTPS tunnel and put that URL in `SERVER_PUBLIC_URL`.

After sandbox testing, production credentials can be used with:

```env
SSLCOMMERZ_IS_LIVE=true
```

Never put the Store Password in the React/Vite `.env`; it belongs only on the backend.

## Main API endpoints

- `POST /api/payments/team-requests/:id/initiate`
- `POST /api/payments/subscriptions/:id/initiate`
- `GET /api/payments`
- `POST /api/payments/sslcommerz/success`
- `POST /api/payments/sslcommerz/fail`
- `POST /api/payments/sslcommerz/cancel`
- `POST /api/payments/sslcommerz/ipn`
- `GET /api/teams/my-teams`
- `POST /api/teams/:id/activate`

## Security/validation

The backend validates the SSLCOMMERZ `val_id` and checks gateway status, Stackwise transaction ID, amount, currency and risk level before changing a payment to `paid`.
