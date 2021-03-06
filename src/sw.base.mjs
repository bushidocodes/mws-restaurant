import {
  deleteItem,
  deleteItems,
  writeItem,
  getItems,
  sanitizeReview
} from "./js/utils";
import { postReviewDirectly } from "./js/dbhelper";

const APP_VERSION = 3;
const SERVER = `http://localhost:1337`;

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */

// Cache Google fonts and map tiles
workbox.routing.registerRoute(
  /.*(?:googleapis|gstatic)\.com.*$/,
  workbox.strategies.staleWhileRevalidate({
    cacheName: "google-maps",
    cacheExpiration: {
      maxEntries: 3,
      maxAgeSeconds: 60 * 60 * 24 * 30
    }
  })
);

self.__precacheManifest = ["/manifest.json"].concat(
  self.__precacheManifest || []
);
workbox.precaching.suppressWarnings();
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

// Redirect proper route IDs to main restaurant.html
workbox.routing.registerRoute(/restaurant.html\?id=[0-9]+/, () =>
  caches.match("/restaurant.html")
);

// Cache images
workbox.routing.registerRoute(
  ({ url }) => url.origin === self.origin && url.pathname.includes(".jpg"),
  workbox.strategies.staleWhileRevalidate({
    cacheName: "restaurant-images",
    cacheExpiration: {
      maxAgeSeconds: 60 * 60 * 24 * 30
    }
  })
);

workbox.routing.registerRoute(
  ({ url }) => url.pathname === "/restaurants",
  ({ url, event, params }) =>
    fetch(event.request)
      .then(res => {
        if (res.ok) {
          const cloneRes = res.clone();
          deleteItems("restaurants").then(() =>
            cloneRes.json().then(resAsJSON => {
              resAsJSON.forEach(item => {
                writeItem("restaurants", item);
              });
            })
          );
        }
        return res;
      })
      .catch(err => {
        console.log(err);
        // We need to return a rejected Promise
        return Promise.reject(err);
      })
);

const restaurantByIDMatcher = new RegExp(
  /http:\/\/localhost:1337\/restaurants\/[0-9]+/
);
const restaurantByIDHandler = ({ url, event, params }) => {
  const matchRestaurantID = /\/restaurants\/([0-9]+)/g;
  const restaurantID = matchRestaurantID.exec(url)[1];
  fetch(event.request)
    .then(res => {
      const cloneRes = res.clone();
      if (cloneRes.ok) {
        cloneRes
          .json()
          .then(restaurant => writeItem("restaurants", restaurant))
          .catch(err => console.log(err));
      }
      return res;
    })
    .catch(err => console.log(err));
};

// Because PUT and POST return the resulting object, we can reuse the logic for GET
workbox.routing.registerRoute(
  restaurantByIDMatcher,
  restaurantByIDHandler,
  "GET"
);
workbox.routing.registerRoute(
  restaurantByIDMatcher,
  restaurantByIDHandler,
  "PUT"
);
workbox.routing.registerRoute(
  restaurantByIDMatcher,
  restaurantByIDHandler,
  "POST"
);

// fetch(`${SERVER}/reviews/?restaurant_id=${restaurantID}`)
const reviewsByRestaurantIDMatcher = new RegExp(
  /http:\/\/localhost:1337\/reviews\/\?restaurant_id=[0-9]+/
);
const reviewsByRestaurantIDHandler = ({ url, event, params }) => {
  fetch(event.request)
    .then(res => {
      const cloneRes = res.clone();
      if (cloneRes.ok) {
        cloneRes
          .json()
          .then(dirtyReviews =>
            dirtyReviews.map(dirtyReview => sanitizeReview(dirtyReview))
          )
          .then(cleanReviews => {
            cleanReviews.forEach(review => {
              writeItem("reviews", review);
            });
          });
      }
      return res;
    })
    .catch(err => console.log(err));
};

workbox.routing.registerRoute(
  reviewsByRestaurantIDMatcher,
  reviewsByRestaurantIDHandler,
  "GET"
);

/**
 * Send a message to a client, returning a promise that resolves to the client's response
 *
 * @param {any} client
 * @param {any} msg
 * @returns
 */
function send_message_to_client(client, msg) {
  return new Promise((resolve, reject) => {
    var msg_chan = new MessageChannel();

    msg_chan.port1.onmessage = function(event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    // Pass a message with a response channel
    client.postMessage(msg, [msg_chan.port2]);
  });
}

/**
 * Send a message to all clients controlled by this service worker
 *
 * @param {any} msg
 */
function send_message_to_all_clients(msg) {
  return clients.matchAll().then(clients => {
    clients.forEach(client => {
      send_message_to_client(client, msg).then(m =>
        console.log(`[SW]: Received message from client ` + m)
      );
    });
  });
}

// If the SW is unable to submit reviews by the timeout, tell the client to render the draft card
const SUBMIT_REVIEWS_TIMEOUT = 1000;
// lock to ensure that if we hit an error condition, only the timeout or the error message fires,
// so the client doesn't render more than once
let notifiedClient = false;

function syncNewReviews() {
  return getItems("sync-reviews").then(reviews => {
    if (reviews && reviews.length > 0) {
      const arrOfPromises = reviews.map(review => {
        return postReviewDirectly(review)
          .then(resBody => {
            // and delete the review from the sync-reviews store if successful
            console.log(`[SW] Synced review with server`, resBody);
            return deleteItem("sync-reviews", [
              resBody.name,
              resBody.restaurant_id
            ]);
          })
          .catch(err => {
            console.log(`[SW] Error syncing review ${review.name}`, err);
            return Promise.reject(err);
          });
      });
      setTimeout(() => {
        if (!notifiedClient) {
          send_message_to_all_clients("refresh");
          notifiedClient = true;
        }
      }, SUBMIT_REVIEWS_TIMEOUT);
      // After all reviews are successfully uploaded
      return Promise.all(arrOfPromises)
        .then(res => {
          console.log(`[SW] Successfully synced all reviews to server`);
          // tell all clients to refresh their reviews
          send_message_to_all_clients("refresh");
          notifiedClient = true;
          return Promise.resolve(res);
        })
        .catch(err => {
          let humanFriendlyErrorMessage =
            err == "TypeError: Failed to fetch"
              ? `[SW] Unable to sync reviews with server. This is probably because you are offline`
              : `[SW] Unable to sync reviews with server due to an unknown error. Please contact the developer with the following error message: ${err}`;
          if (!notifiedClient) {
            send_message_to_all_clients("refresh");
            notifiedClient = true;
          }
          console.log(humanFriendlyErrorMessage);
          return Promise.reject(humanFriendlyErrorMessage);
        });
    } else {
      console.log(`[SW] No reviews to sync`);
    }
  });
}

self.addEventListener("sync", function(event) {
  console.log(`[SW] Receiving sync event ${event.tag}`);
  switch (event.tag) {
    case "sync-new-reviews":
      return event.waitUntil(syncNewReviews().catch(e => console.log(e)));
    default:
      console.log(`[SW] Error: ${event.tag} is an unknown sync tag`);
  }
});
