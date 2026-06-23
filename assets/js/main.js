const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const nextUrl = document.getElementById('nextUrl');
const pageUrl = document.getElementById('pageUrl');
if (nextUrl) nextUrl.value = `${window.location.origin}/thank-you.html`;
if (pageUrl) pageUrl.value = window.location.href;

const params = new URLSearchParams(window.location.search);
const setVal = (id, key) => {
  const el = document.getElementById(id);
  if (el) el.value = params.get(key) || '';
};
setVal('utmSource', 'utm_source');
setVal('utmMedium', 'utm_medium');
setVal('utmCampaign', 'utm_campaign');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
