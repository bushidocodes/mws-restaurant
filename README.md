# Mobile Web Specialist Certification Course

---

#### _Three Stage Course Material Project - Restaurant Reviews_

### How to run

I've included the Node backend in this repo to better guarantee consistent behavior

```
npm install
cd restaurant-server
npm install
cd ..
npm start
```

The app will open in Chrome automatically, but the browser loads before the backend has started up entirely. Hit refresh to load cleanly.

This will install and start the production build of the app.

Please note that I'm using Webpack twice, first to bundle my service worker and then to bundle and build my entire app. I do two separate passes because the service worker needs to be built and bundled before being used by Workbox's `InjectManifest` plugin. I did considerable research to see if there was a cleaner solution to using ESM modules in my service worker in conjuction with Workbox and Webpack, and I didn't really find anything.

I've included my Lighthouse Report in case we have differing results.
On my last run, I got
96 Performance
91 PWA
100 Accessibility
94 Best Practices
78 SEO
