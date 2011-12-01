/*
 * Copyright (C) 2011  Maxime VALY
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License 
 * version 2 as published by the Free Software Foundation.
 */

// g9n.js is a really simple library to get easily the user's location 
// (latitude & longitude) and fetch information about the place.

//
// Toolbox
var tools = tools || {};
tools.findElem = function(arr, elem) {
  if (arr && elem)
    for (i = 0; i < arr.length; i++)
      if (arr[i] === elem)
        return i;
  return -1;
};
// https://developer.mozilla.org/En/Using_XMLHttpRequest#Example:_Asynchronous_request
tools.xhr = function(url, callback) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.onreadystatechange = function (aEvt) {
    if (request.readyState == 4) {
       if (request.status == 200) {
         // automatically handle XML or JSON
         request.responseXML && callback(request.responseXML) || callback(JSON.parse(request.responseText));
         // TODO test for the JSON parser presence
       } else {
         console && console.log && console.log('Error', request.statusText);
       }
    }
  };
  request.send(null);
};
// Specific AJAX tool for JSONP calls, shortened version of the work of Sky Sanders
// http://stackapps.com/questions/891/how-to-call-the-api-via-jsonp-in-plain-old-javascript
tools.jsonp_callbackId = 0;
tools.jsonp_callbacks = tools.jsonp_callbacks || {};
tools.jsonp = function(url, success, error) {
  var callBackName = "_callback" + this.jsonp_callbackId++;
  // setup the callback
  tools.jsonp_callbacks[callBackName] = function(data) {
      delete tools.jsonp_callbacks[callBackName];
      if (data.error) {
          if (error) {
              data.error.callback = callBackName;
              error(data.error);
          };
      } else {
          success(data);
      };
  };

  // send the request
  var scr = document.createElement("script");
  scr.type = "text/javascript";
  scr.src = url + "?jsoncallback=tools.jsonp_callbacks." + callBackName;
  var head = document.getElementsByTagName("head")[0];
  head.insertBefore(scr, head.firstChild);

  window.setTimeout(function() {
      if (typeof tools.jsonp_callbacks[callBackName] == "function") {
          // replace success with null callback in case the request is just very latent.
          that[callBackName] = function(data) {
              delete tools.jsonp_callbacks[callBackName];
          };
          // call the error callback
          error && error({ code: 408, message: "Request Timeout", callback: callBackName });
          // set a longer timeout to safely clean up the unused callback.
          window.setTimeout(function() {
              if (typeof tools.jsonp_callbacks[callBackName] == "function") {
                  delete tools.jsonp_callbacks[callBackName];
              };
          }, 60000);
      };
  }, 10000); // default to 10 second timeout
};


//
// Geolocation lib
var g9n = g9n || {};

// Fetches the position of the user using the more reliable available method 
// (i.e. HTML5 if you're lucky, IP otherwise). Success callback is called on 
// success and receives a data object containing the latitude and longitude of
// the client. Error callback is called on error and receives a cryptic message
// string.
g9n.fetchPosition = function(success, error) {
  if (navigator.geolocation) {
    this.fetchPositionHTML5(success, error);
  } else {
    this.fetchPositionIP(success, error);
  }
};

// Gets the position of the user using the HTML5 geolocation capabilities of 
// her browser. Success callback is called on success and receives a data object
// containing the latitude and longitude of the client. Error callback is called
// on error and receives a cryptic message string.
g9n.fetchPositionHTML5 = function(success, error) {
  if (!navigator.geolocation) {
    error("HTML5 geolocation non supported.");
    return;
  }
  var _success = function(data) {
    success({
      latitude: data.coords.latitude, 
      longitude: data.coords.longitude
    });
  };
  var _error = function(data) {
    error(data);
  };
  navigator.geolocation.getCurrentPosition(_success, _error);
};

// Guesses the position of the user by some IP related magic. Success callback 
// is called on success and receives a data object containing the latitude and 
// longitude of the client. Error callback is called on error and receives a
// cryptic message string. The URL parameter can be used to call your own PHP
// script on your own server. See http://www.geoplugin.com/webservices/json
// for the expected JSON response format.
g9n.fetchPositionIP = function(success, error, url) {
  var url = url || "http://www.geoplugin.net/json.gp";
  tools.jsonp(url, function(data) {
    // try to get the infos from the geoplugin response
    if (data && data.geoplugin_latitude && data.geoplugin_longitude) {
      success({
        latitude: data['geoplugin_latitude'],
        longitude: data['geoplugin_longitude']
      });
    // did we miss something? custom url/service?
    } else if (data && data.latitude && data.longitude) {
      success({
        latitude: data['latitude'],
        longitude: data['longitude']
      });
    // Yep! That's a failure!
    } else {
      error("Could not locate user.");
    }
  });
};

// Uses the Yahoo Geoplanet API to retrieve the WOIED associated to the given
// latitude and longitude. Success callback is called on success and receives a
// data object containing the latitude and longitude of the client passed as 
// arguments and all the info returned by Yahoo. Error callback is called on 
// error and receives whatever we saved from the call. The API key is needed to
// make calls using the Yahoo Query Language. See documentation and stuff.
// http://developer.yahoo.com/
g9n.findPlace = function(latitude, longitude, success, error, apiKey) {
  // http://stackoverflow.com/questions/1822650/yahoo-weather-api-woeid-retrieval
  // http://thinkvitamin.com/code/getting-started-with-yahoo-geoplanet-explorer/
  // http://www.geomojo.org/cgi-bin/reversegeocoder.cgi?long=-117.699444&lat=35.4775
  var yql = 'select * from geo.places where woeid in ('+
            'select place.woeid from flickr.places where lat='+
            latitude + ' and  lon=' + longitude + ' and api_key=' + apiKey + ')';
  var url = 'http://query.yahooapis.com/v1/public/yql?' + 
            '&q=' + encodeURIComponent(yql) + '&format=json&callback=' +  
            '&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
  var _callback = function(data) {
    data.latitude = data.latitude || latitude;
    data.longitude = data.longitude || longitude;
    if (data.query.results) {
      success(data);
    } else {
      error(data);
    }
  };
  tools.xhr(url, _callback);
};

