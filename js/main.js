let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []


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
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
  initFocus();
});

/**
 *  Manages focus on the components
 */
initFocus = () => {
  document.getElementById("map-container").tabIndex = "-1";
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });

  /**
   * adds tabindex of -1 to every child
   */
  google.maps.event.addListenerOnce(self.map, 'tilesloaded', async function(){
    // do something only the first time the map is loaded
    let el = $("#map").find("*");
    while(el.length < 180){ // check if google has been loaded fully
      await sleep(500); // set interval to 500ms
      el = $("#map").find("*");
    }

    // set all children tabindex to -1
    el.find("*").attr("tabindex",-1)
  });

  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  //console.log(restaurant);

  const li = document.createElement('li');
  const imageRef = DBHelper.imageUrlForRestaurant(restaurant).split(".");
  const thumbnailID = restaurant.id + "_thumbnail";
  const neighborhoodID = restaurant.id + "_neighborhood";
  const addressID = restaurant.id + "_address";
  const picture = document.createElement('picture');
  const src_small = document.createElement('source');
  const src_medium = document.createElement('source');
  const image = document.createElement('img');

  li.setAttribute("tabindex",0);
  picture.id = thumbnailID;

  src_small.setAttribute("media","(max-width: 343px)");
  src_small.setAttribute("srcset",imageRef[0]+"_small_1x."+imageRef[1]);
  src_medium.setAttribute("media","(max-width: 780px)");
  src_medium.setAttribute("srcset",imageRef[0]+"_large_1x."+imageRef[1]);

  image.className = 'restaurant-img';
  image.src = imageRef[0]+"_medium_1x."+imageRef[1];
  image.alt = `A thumbnail picture of the restaurant 
  ${restaurant.name} which specializes in ${restaurant.cuisine_type} food.`;

  picture.append(src_small);
  picture.append(src_medium);
  picture.append(image);
  li.append(picture);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.id = neighborhoodID;
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.id = addressID;
  address.innerHTML = restaurant.address;
  address.setAttribute("aria-label",restaurant.address.replace(/,/g, ' ') + ".")

  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);


  // create labelledby attribute for li
  // containing thumbnail and address information
  li.setAttribute("aria-labelledby",thumbnailID + " " + neighborhoodID + " " + addressID);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}