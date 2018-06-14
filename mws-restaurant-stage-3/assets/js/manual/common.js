/**
 * Created by Thinh-Laptop on 13.06.2018.
 */



document.addEventListener("DOMContentLoaded", function(event) {

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js').then(function(registration) {
        // Registration was successful
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }


  createDB({}, 'updatingReview');

  // Update the online status icon based on connectivity
  window.addEventListener('online',  updateIndicator);
  window.addEventListener('offline', updateIndicator);
  updateIndicator();


  function updateIndicator() {
    // Show a different icon based on offline/online

    const alertOff =  $('#offline');
    const alertOn = $('#online');

    if(navigator.onLine){
      console.log("Application has online connection!");

      // check for anything to be updated

      readDB('updatingReview').then(function(val){
            //console.log("val: " + JSON.stringify(val) + " " + Object.keys(val).length);

            if(Object.keys(val).length === 0){

            }else{
              alertOn.html('You are <strong>online again</strong>! ' +
                'Your Submission has been updated!<button class="close">&times;</button>');

              console.log("jokel: " + JSON.stringify(val[0]));

              $.post( "http://localhost:1337/reviews/", {
                "restaurant_id": val[0].review.restaurant_id,
                "name": val[0].review.name,
                "rating": val[0].review.rating,
                "comments": val[0].review.comments
              }).done(function( data ) {
                  console.log("review submited: " + JSON.stringify(data));
                  deleteObjectStore('updatingReview', 1);
                  //location.reload(true);
              });

            }


      });

      alertOff.hide();
      alertOn.show();
    }else{
      console.log("Application has no online connection!");

      alertOn.hide();
      alertOff.show();
    }
  }


  $('.close').on('click', function() {
    //console.log("clicked on close");
    $(this).parent('.alert').hide();
  });

});

function checkReviewSubmissionAvailability(){
  if(!navigator.onLine){
    console.log("Application has no online connection!");

    const alert =  $('#offline');
    alert.html('You are <strong>offline</strong>! Your Submission will be updated once you are online again!<button class="close">&times;</button>');

    $('#online').hide();
    alert.show();

    return false;
  }

  return true;
}

