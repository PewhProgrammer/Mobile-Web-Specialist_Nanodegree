let restaurant;
var map;


if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      // here you can look for notifying the user about available updates and force the sw
      // to update itself
      // registration.installing and registration.update()
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}


/**
 * sleep function
 * @param ms
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);

      /**
       * adds tabindex of -1 to every child
       */
      /*
      google.maps.event.addListenerOnce(self.map, 'tilesloaded', async function(){
        // do something only the first time the map is loaded
        let el = $("#map").find("*");
        while(el.length < 130){ // check if google has been loaded fully
          await sleep(500); // set interval to 500ms
          el = $("#map").find("*");
        }

        // set all children tabindex to -1
        el.find("*").attr("tabindex",-1)
      });
      */
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      $("#restaurant-container").attr("aria-label","Informations about the" +
        "restaurant " + restaurant.name);
      $("#reviews-container").attr("aria-label","Reviews");
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const thumbnailID = restaurant.id + "_thumbnail";
  const addressID = restaurant.id + "_address";

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  name.setAttribute("tabindex",0);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.id = addressID;
  address.setAttribute("aria-label",restaurant.address + ".");
  address.setAttribute("tabindex",0);

  const picture = document.getElementById('restaurant-img');
  picture.className = 'restaurant-img';

  const imageRef = DBHelper.imageUrlForRestaurant(restaurant).split(".");

  const src_small = document.createElement('source');
  src_small.setAttribute("media","(min-width: 781px) and (max-width: 1050px)");
  src_small.setAttribute("srcset",imageRef[0]+"_medium_1x."+imageRef[1]);
  const src_medium = document.createElement('source');

  src_medium.setAttribute("media","(max-width: 780px)");
  src_medium.setAttribute("srcset",imageRef[0]+"_large_1x."+imageRef[1]);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = imageRef[0]+"_large_1x."+imageRef[1];
  image.alt = `A thumbnail picture of the restaurant 
  ${restaurant.name}.`;

  picture.id = thumbnailID;
  picture.append(src_small);
  picture.append(src_medium);
  picture.append(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  $("#restaurant-container").attr("aria-labelledby",thumbnailID);

  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  hours.setAttribute("tabindex",0);
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    // add more readable date format
    row.setAttribute("aria-label",key + " from " +
      operatingHours[key].replace(/-/g, ' to ').replace(/,/g, ' and') + ".");

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  title.setAttribute("role","heading");
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute("tabindex",0);
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  date.setAttribute("aria-label",review.date.replace(/,/g, '')+ ".");
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.setAttribute("aria-label","Rating: " + review.rating+ ".");
  const stars = Array(review.rating+1).join(' &#9733');

  rating.innerHTML = `Rating: ${stars}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
