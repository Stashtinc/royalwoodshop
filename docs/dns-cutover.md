# DNS cutover: royalwoodshop.com to Railway

Snapshot of the live DNS taken 2026-11-14, read straight from the
authoritative nameservers. Keep it: it is the rollback copy (Final Checklist
step 6).

## Who runs what

- **Registrar:** GoDaddy. Only the nameservers are set there.
- **DNS:** DigiCert DNS (formerly DNS Made Easy), managed by Crestline, the
  shop's IT company. The registry lists ns10–ns15.digicertdns.com/.net; the zone
  itself names ns0–ns2.crestline.net, which sit on the same DigiCert network.
  All record changes happen in that DNS panel, not in GoDaddy.
- **Email:** Microsoft 365 (Exchange Online, Teams, Intune), almost certainly
  administered by Crestline.
- **Old website:** WP Engine, 104.198.198.139.
- **Online store:** shop.royalwoodshop.com is Toolbx.

## Current records

| Name | Type | TTL | Value | At cutover |
|---|---|---|---|---|
| royalwoodshop.com | A | 3600 | 104.198.198.139 (WP Engine) | **Change** to Railway (ANAME/ALIAS or A) |
| www | CNAME | 3600 | royalwoodshop.com | **Change** to the Railway target |
| ftp | CNAME | 3600 | royalwoodshop.com | Leave (or delete: WP Engine FTP is unused) |
| royalwoodshop.com | MX | 3600 | 0 royalwoodshop-com.mail.protection.outlook.com | Leave |
| royalwoodshop.com | TXT | 3600 | v=spf1 a ip4:68.179.121.1 include:spf.protection.outlook.com -all | Leave on the day; see SPF below |
| royalwoodshop.com | TXT | 3600 | MS=ms90784148 | Leave (Microsoft 365 verification) |
| royalwoodshop.com | TXT | 3600 | google-site-verification=oZezhPr5… | Leave (Search Console) |
| _dmarc | TXT | 1800 | v=DMARC1; p=none; | Leave |
| selector1._domainkey | CNAME | 3600 | selector1-royalwoodshop-com._domainkey.royalwoodshop.onmicrosoft.com | Leave (M365 DKIM) |
| selector2._domainkey | CNAME | 3600 | selector2-royalwoodshop-com._domainkey.royalwoodshop.onmicrosoft.com | Leave (M365 DKIM) |
| autodiscover | CNAME | 3600 | autodiscover.outlook.com | Leave |
| sip | CNAME | 3600 | sipdir.online.lync.com | Leave |
| lyncdiscover | CNAME | 3600 | webdir.online.lync.com | Leave |
| _sip._tls | SRV | 3600 | 100 1 443 sipdir.online.lync.com | Leave |
| _sipfederationtls._tcp | SRV | 3600 | 100 1 5061 sipfed.online.lync.com | Leave |
| enterpriseregistration | CNAME | 3600 | enterpriseregistration.windows.net | Leave |
| enterpriseenrollment | CNAME | 3600 | enterpriseenrollment.manage.microsoft.com | Leave |
| remote | A | 3600 | 68.179.121.1 (the shop's TeraGo office line) | Leave |
| mail | CNAME | 3600 | `remote.` (broken, see below) | Leave; flag to Crestline |
| smtp | CNAME | 3600 | `remote.` (broken, see below) | Leave; flag to Crestline |
| shop | CNAME | 3600 | royalwood.toolbxapp.com | **Leave**: the Toolbx store |

Records were found by querying known names; a zone transfer is refused, so
the panel may hold a few more. Compare with the panel before changing anything.

## How email works today

- **Mailboxes** (info@, sales@ …) are Microsoft 365. MX, DKIM, autodiscover and
  the Teams/Intune records all point at Microsoft. The website switch does not
  touch any of them.
- **The old website's forms** are Contact Form 7 on WordPress, checked in the
  WP admin on 2026-11-14. No SMTP plugin is installed, so WordPress sends them
  through WP Engine's own mail server; the `a` in the SPF record is what lets
  that server send as @royalwoodshop.com.

  | Page | CF7 form | To | From |
  |---|---|---|---|
  | /contact | 69 "Contact form 1" | info@royalwoodshop.com | [name] &lt;website@royalwoodshop.com&gt; |
  | /consultation, /material-estimate-and-quotation | 9589 "Contact form - Services" | info@royalwoodshop.com | [name] &lt;website@royalwoodshop.com&gt; |

  Both set Reply-To to the visitor and send no auto-reply. Form 9589's email
  was copied from the unused "Contractor" form (7319): its subject reads
  `Become a Contractor Submission: ""` and its body leaves out the phone
  number. The new site fixes both and sends every form to sales@ (CONTACT_TO).
  Nothing else runs on submit: CF7 Redirection has no actions set. Contact Form
  CFDB7 keeps a copy of every submission; export it before WP Engine is retired.
- **Also on the old site, not yet on the new one:** CallRail call tracking
  (company 269625012, number-swap script) and the Redirection plugin's 301
  list (Tools → Redirection; export and compare with ours).
- **The office** (68.179.121.1, a static TeraGo line in Ontario, named
  `remote`) is allowed to send as @royalwoodshop.com by SPF. That is typically a
  copier's scan-to-email, the ERP, or a local relay that Crestline set up. This
  is probably the "Crestline email service" Chris heard about.
- `mail` and `smtp` are CNAMEs to `remote.` with a trailing dot, so they
  resolve to nothing. Whatever they once served, nothing can be using those
  names now. Crestline should fix them (`remote.royalwoodshop.com.`) or delete them.

## SPF after the switch

The SPF record starts with `a`, which authorizes whatever the bare domain
points at. Today that is WP Engine; after the switch it becomes Railway's
shared edge IP, which the website does not send mail from. Once the old site
is retired, ask Crestline to drop `a`:

    v=spf1 ip4:68.179.121.1 include:spf.protection.outlook.com -all

Website email through Microsoft 365 needs no SPF change (it is already
included). A service such as Resend needs its own records added (it uses a
`send.` subdomain plus a DKIM key) — Crestline adds them.

## Cutover steps

1. **24 hours before:** lower the TTL on `royalwoodshop.com` A and `www` CNAME
   from 3600 to 300.
2. In Railway (production service → Settings → Networking → Custom domain),
   add `www.royalwoodshop.com` and `royalwoodshop.com`. Copy the CNAME target
   and any TXT verification record Railway shows.
3. In the DNS panel:
   - add Railway's TXT verification record, if shown;
   - `www`: CNAME → the Railway target;
   - `royalwoodshop.com`: replace the A record with an ANAME/ALIAS to the
     Railway target (DigiCert DNS supports ANAME). If ANAME isn't available,
     use DigiCert's HTTP redirect to https://www.royalwoodshop.com.
4. Leave every other record alone.
5. Wait for Railway to show the certificate as issued, then check both
   addresses over HTTPS.

**Rollback:** set `royalwoodshop.com` back to A 104.198.198.139 and `www` back
to CNAME royalwoodshop.com. WP Engine still has both domains attached.
royalwoodshop.wpengine.com is not a usable fallback address: WordPress
redirects it to www.

## To check in the WordPress admin before the switch

From WP Engine's SSH (read-only):

    wp plugin list --status=active --fields=name,version
    wp post meta get 69 _mail --format=json      # Contact form: recipient, sender
    wp post meta get 9589 _mail --format=json    # Consultation / Estimate form
    wp option pluck wp_mail_smtp mail mailer     # only if WP Mail SMTP is active
    wp option pluck wp_mail_smtp smtp host

Don't print the whole `wp_mail_smtp` option: it contains the SMTP password.
