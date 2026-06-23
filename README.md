# KalpVastra Landing Website

This folder contains a ready-to-upload static website for GitHub + Vercel hosting.

## Business details configured

- Brand: KalpVastra
- Phone / WhatsApp: 9441165019
- Lead email: kalpvastra6001@gmail.com
- Form redirect page: thank-you.html

## Files

- `index.html` - main landing page
- `thank-you.html` - success page after form submission
- `privacy.html` - basic privacy page
- `assets/css/styles.css` - website styling
- `assets/js/main.js` - menu, thank-you redirect setup, UTM capture
- `assets/images/` - logo and website images
- `vercel.json` - Vercel static configuration
- `robots.txt`, `sitemap.xml` - SEO files

## Important: email lead form setup

The form uses FormSubmit to send enquiries to `kalpvastra6001@gmail.com`.

For the first test form submission, FormSubmit may send an activation email to `kalpvastra6001@gmail.com`. Open that email and click the activation link. After activation, future leads will come directly to the email inbox.

## Deploy on Vercel through GitHub

1. Upload all files in this folder to your GitHub repository root.
2. Open Vercel and import the GitHub repository.
3. Framework preset: Other / Static.
4. Build command: leave empty.
5. Output directory: leave empty.
6. Deploy.
7. Open your live URL and test the form once.

## Domain note

The form thank-you redirect is dynamically set to:

`https://your-current-domain/thank-you.html`

So it will work when deployed on `https://narendar.sdmlabs.in/` or any other Vercel domain.
