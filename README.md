# Kalpvastra Boutique Landing Page

This is a static landing page built for GitHub + Vercel hosting.

## Files

- `index.html` - main landing page
- `thank-you.html` - conversion/thank-you page
- `privacy.html` - basic privacy policy page
- `assets/css/styles.css` - responsive design
- `assets/js/main.js` - WhatsApp links, UTM capture, form submit logic and dataLayer events
- `vercel.json` - Vercel routing/security configuration
- `robots.txt` and `sitemap.xml` - basic SEO files

## Before going live

1. Open `assets/js/main.js`.
2. Replace `whatsappNumber: "919000000000"` with the actual WhatsApp number.
3. Open `index.html` and replace visible placeholder contact number `+91 90000 00000`.
4. Replace testimonial placeholders with real bride/customer reviews.
5. Replace proof placeholders with real customer photos/videos when available.
6. After GTM setup, paste GTM scripts in `index.html` and `thank-you.html` where marked.
7. After Google Sheet lead setup, paste Google Apps Script Web App URL into `googleSheetEndpoint` in `assets/js/main.js`.

## Deploy on Vercel through GitHub

1. Commit all files to your GitHub repository.
2. In Vercel, import the GitHub repository.
3. Framework preset: Other / Static.
4. Build command: leave empty.
5. Output directory: leave empty/root.
6. Deploy.
7. Add or verify the domain: `https://narendar.sdmlabs.in/`.

## Conversion setup notes

The form redirects to `thank-you.html` after submission. Use this thank-you page for Google Ads, Meta Ads and LinkedIn Ads lead conversion tracking.

The JavaScript already pushes these events into `dataLayer`:

- `whatsapp_click`
- `lead_form_submit`
- `generate_lead`

These can be converted into GTM triggers in the next module.
