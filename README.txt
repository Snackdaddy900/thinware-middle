quote.html posts:
{
  lead: { name, email },
  product,
  color,
  quantity
}

Function:
netlify/functions/send-quote-lead.js

Required env vars:
- resend_api_key
- resend_admin_email

Current sender:
- onboarding@resend.dev

Known next steps:
- restore Vectary embed version
- improve email format
- verify powercore.nz domain in Resend
- switch from test sender to project sender
